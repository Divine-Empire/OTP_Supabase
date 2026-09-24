-- =====================================================================
-- 41_otp_order_cancel.sql
--
-- MUST BE RUN AGAINST THE SAME PRODUCTION DATABASE as every otp_ migration.
--
-- Order Cancel stage — lets an order be pulled out of whichever ONE stage
-- it's currently pending in. This reuses the "planned date IS NOT NULL +
-- no matching child row = Pending" invariant that already exists for
-- every stage (see otp_stage_tat's stage list) instead of inventing a
-- parallel per-table "Cancelled" status:
--
--   order_acceptable        -> null otp_orders.order_acceptable_planned
--   proforma_invoice        -> null otp_orders_acceptable.proforma_invoice_planned
--   debit_note               -> null otp_orders_acceptable.debit_note_planned
--   check_inventory          -> null otp_orders_acceptable.check_inventory_planned
--   debit_note_for_invoice   -> null otp_pre_invoice_queue.debit_note_planned
--   make_invoice              -> null otp_pre_invoice_queue.make_invoice_planned
--   calibration               -> null otp_make_invoice.calibration_planned
--   packaging_transport       -> null otp_make_invoice.packaging_transport_planned
--                                (+ delete any draft otp_packaging_transport row)
--   bilty_upload              -> null otp_packaging_transport.bilty_upload_planned
--
-- Two stages are row-based, not column-based (material_received queues
-- one row per short item; pre_invoice queues one row per wave) — for
-- these, cancelling sets status='cancelled' on the pending row(s), which
-- both stages' own Pending routes already filter out via status='pending'.
-- Their CHECK constraints need 'cancelled' added.
--
-- No cascade logic is needed: this pipeline is strictly sequential — a
-- later stage's planned date only ever gets set once its immediate
-- predecessor has actually been processed, so nothing beyond a currently-
-- pending stage can exist yet. Cancelling the one pending stage a stage
-- is in is enough to stop the order there.
-- =====================================================================

ALTER TABLE public.otp_material_shortage
  DROP CONSTRAINT IF EXISTS otp_material_shortage_status_check;
ALTER TABLE public.otp_material_shortage
  ADD CONSTRAINT otp_material_shortage_status_check
    CHECK (status = ANY (ARRAY['pending'::text, 'processed'::text, 'cancelled'::text]));

ALTER TABLE public.otp_pre_invoice_queue
  DROP CONSTRAINT IF EXISTS otp_pre_invoice_queue_status_check;
ALTER TABLE public.otp_pre_invoice_queue
  ADD CONSTRAINT otp_pre_invoice_queue_status_check
    CHECK (status = ANY (ARRAY['pending'::text, 'invoiced'::text, 'cancelled'::text]));

CREATE TABLE IF NOT EXISTS public.otp_order_cancel (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  order_id       uuid NOT NULL REFERENCES public.otp_orders(id) ON DELETE CASCADE,
  order_no       text NOT NULL,

  stage_key      text NOT NULL,
  stage_label    text NOT NULL,
  cancel_reason  text NOT NULL,
  cancelled_by   text,

  cancelled_at   timestamptz NOT NULL DEFAULT now(),
  created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_otp_order_cancel_order_id ON public.otp_order_cancel (order_id);
CREATE INDEX IF NOT EXISTS idx_otp_order_cancel_order_no ON public.otp_order_cancel (order_no);

ALTER TABLE public.otp_order_cancel DISABLE ROW LEVEL SECURITY;
