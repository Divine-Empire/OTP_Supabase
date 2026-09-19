-- =====================================================================
-- 25_otp_make_invoice.sql
--
-- MUST BE RUN AGAINST THE SAME PRODUCTION DATABASE as 17_/21_/22_/23_/24_.
--
-- Stage — Make Invoice. Wires up what was previously a dead legacy page
-- (app/make-invoice/page.tsx, pointed at /api/otp-supabase/dispatches ->
-- otp_dispatches/otp_v_dispatch_full, neither of which exist in this DB).
--
-- Same 1:1 child-table pattern as Order Acceptable/Check Inventory:
--   Pending: otp_pre_invoice_queue.status = 'invoiced' AND no matching
--            otp_make_invoice row yet (one row per queue wave — a queue
--            row's own invoice_number/invoice_copy_url columns are left
--            unused going forward; this table is the actual home for
--            Make Invoice's own Invoice Number capture).
--   History: a matching otp_make_invoice row exists.
-- pre_invoice_queue_id is UNIQUE — exactly one invoice per wave.
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.otp_make_invoice (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  order_id               uuid NOT NULL REFERENCES public.otp_orders(id) ON DELETE CASCADE,
  pre_invoice_queue_id   uuid NOT NULL REFERENCES public.otp_pre_invoice_queue(id) ON DELETE CASCADE,

  invoice_number         text NOT NULL,
  invoice_date           date,
  invoice_upload_url     text,
  eway_bill_number       text,
  eway_bill_upload_url   text,
  total_bill_amount      numeric,

  items                  jsonb NOT NULL DEFAULT '[]'::jsonb, -- copied from the queue wave at submit time
  remarks                text,
  created_by             text,

  created_at             timestamptz NOT NULL DEFAULT now(),
  updated_at             timestamptz NOT NULL DEFAULT now(),

  UNIQUE (pre_invoice_queue_id)
);

CREATE INDEX IF NOT EXISTS idx_otp_make_invoice_order_id ON public.otp_make_invoice (order_id);

ALTER TABLE public.otp_make_invoice DISABLE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS otp_trg_make_invoice_updated_at ON public.otp_make_invoice;
CREATE TRIGGER otp_trg_make_invoice_updated_at
  BEFORE UPDATE ON public.otp_make_invoice
  FOR EACH ROW
  EXECUTE FUNCTION public.otp_trg_set_updated_at();
