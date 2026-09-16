-- =====================================================================
-- 17_check_inventory_scan_flow.sql
--
-- MUST BE RUN AGAINST THE SAME PRODUCTION DATABASE as 13_/14_/15_/16_
-- (nfwtbrmqvsejwwvraanf.supabase.co).
--
-- Purpose: redesign Check Inventory around the QR-scan flow (scan each
-- item's serial QR -> item_code/item_name resolved instantly from the QR
-- string itself, no DB lookup needed -> Compare against the order's item
-- list -> per-item available/shortage breakdown), and introduce the two
-- tables that let one order fan out into multiple downstream tracking
-- threads:
--
--   otp_material_shortage  — one row per short item; tracks its own
--                             (possibly partial, possibly multi-event)
--                             receipt independently of any PFMS indent
--                             number (which is stored only as an audit
--                             reference, never as a tracking/join key —
--                             the same item_code can legitimately have
--                             other, unrelated indents already in flight
--                             in PFMS, so indentNo is not a safe key here).
--
--   otp_pre_invoice_queue  — a QUEUE, not a live-computed view, because
--                             a single order can feed it more than once
--                             over time (once for whatever was available
--                             at Check Inventory time, again each time a
--                             Material Received event clears more of the
--                             shortage). Each queue row becomes exactly
--                             one Invoice Number when processed, and that
--                             Invoice Number is the tracking key for every
--                             stage after Pre-Invoice.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. otp_check_inventory — redesigned around the scan/compare flow
-- ---------------------------------------------------------------------
ALTER TABLE public.otp_check_inventory
  DROP COLUMN IF EXISTS line_item_number,
  DROP COLUMN IF EXISTS total_qty,
  DROP COLUMN IF EXISTS material_received_lead_time,
  DROP COLUMN IF EXISTS unavailable_items;

ALTER TABLE public.otp_check_inventory
  -- Full per-item breakdown from the scan/compare step, every item on the
  -- order (not just the short ones): [{item_code, item_name, ordered_qty,
  -- scanned_qty, shortage_qty, status: 'available'|'short'}]
  ADD COLUMN IF NOT EXISTS items jsonb NOT NULL DEFAULT '[]'::jsonb,
  -- One shared lead time applied to whatever gets indented in PFMS from
  -- this submission (per-item lead time would be overkill for now).
  ADD COLUMN IF NOT EXISTS material_received_lead_time integer;

-- availability_status is now computed by the compare step (Available /
-- Partial / Not Available), not hand-picked — drop the old manual CHECK
-- and replace it with one that also accepts the computed values (same
-- three values as before, so this is a no-op unless the constraint name
-- differs — included for safety across environments).
DO $$
BEGIN
  ALTER TABLE public.otp_check_inventory DROP CONSTRAINT IF EXISTS otp_check_inventory_availability_status_check;
  ALTER TABLE public.otp_check_inventory
    ADD CONSTRAINT otp_check_inventory_availability_status_check
    CHECK (availability_status IN ('Available', 'Not Available', 'Partial'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ---------------------------------------------------------------------
-- 2. otp_material_shortage
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.otp_material_shortage (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  order_id            uuid NOT NULL REFERENCES public.otp_orders(id) ON DELETE CASCADE,
  check_inventory_id  uuid NOT NULL REFERENCES public.otp_check_inventory(id) ON DELETE CASCADE,

  item_code           text NOT NULL,
  item_name           text NOT NULL,
  indented_qty        numeric NOT NULL,          -- the shortage qty at the time this row was created
  received_qty        numeric NOT NULL DEFAULT 0, -- cumulative, can be updated across multiple partial receipts
  remaining_qty        numeric GENERATED ALWAYS AS (GREATEST(indented_qty - received_qty, 0)) STORED,

  -- Audit-only reference to whatever PFMS indent(s) this shortage produced
  -- (best-effort; the cross-system call can fail/be skipped without
  -- blocking this row — see otp_material_shortage.status below, which
  -- never depends on pfms_indent_no).
  pfms_indent_no       text,

  status               text NOT NULL DEFAULT 'pending'
                        CHECK (status IN ('pending', 'partially_received', 'received')),

  warehouse_location   text,
  remark               text,

  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_otp_material_shortage_order_id ON public.otp_material_shortage (order_id);
CREATE INDEX IF NOT EXISTS idx_otp_material_shortage_status ON public.otp_material_shortage (status);

ALTER TABLE public.otp_material_shortage DISABLE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS otp_trg_material_shortage_updated_at ON public.otp_material_shortage;
CREATE TRIGGER otp_trg_material_shortage_updated_at
  BEFORE UPDATE ON public.otp_material_shortage
  FOR EACH ROW
  EXECUTE FUNCTION public.otp_trg_set_updated_at();

-- ---------------------------------------------------------------------
-- 3. otp_pre_invoice_queue
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.otp_pre_invoice_queue (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  order_id          uuid NOT NULL REFERENCES public.otp_orders(id) ON DELETE CASCADE,
  quotation_number  text,

  -- Which submission produced this wave, and a loose (non-FK — can point
  -- at either otp_check_inventory or otp_material_shortage) reference id
  -- for audit/traceability.
  source_stage      text NOT NULL CHECK (source_stage IN ('check_inventory', 'material_received')),
  source_id         uuid,

  items             jsonb NOT NULL DEFAULT '[]'::jsonb, -- [{item_code, item_name, qty}] ready to invoice in this wave

  status            text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'invoiced')),
  invoice_number    text,
  invoiced_at       timestamptz,

  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_otp_pre_invoice_queue_order_id ON public.otp_pre_invoice_queue (order_id);
CREATE INDEX IF NOT EXISTS idx_otp_pre_invoice_queue_status ON public.otp_pre_invoice_queue (status);

ALTER TABLE public.otp_pre_invoice_queue DISABLE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS otp_trg_pre_invoice_queue_updated_at ON public.otp_pre_invoice_queue;
CREATE TRIGGER otp_trg_pre_invoice_queue_updated_at
  BEFORE UPDATE ON public.otp_pre_invoice_queue
  FOR EACH ROW
  EXECUTE FUNCTION public.otp_trg_set_updated_at();
