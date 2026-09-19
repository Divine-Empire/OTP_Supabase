-- =====================================================================
-- 28_otp_proforma_invoice.sql
--
-- MUST BE RUN AGAINST THE SAME PRODUCTION DATABASE as 14_/17_.
--
-- Stage — Pro-Forma Invoice, inserted between Order Acceptable and Check
-- Inventory, gated on otp_orders.payment_mode = 'pi against advance':
--
--   Pending: otp_orders_acceptable.proforma_invoice_planned IS NOT NULL
--            AND no matching otp_proforma_invoice row yet.
--   History: a matching otp_proforma_invoice row exists.
--
-- otp_orders_acceptable.check_inventory_planned is no longer always set
-- at Order Acceptable time — see app/api/otp-supabase/order-acceptable/route.ts:
--   - payment_mode = 'pi against advance': proforma_invoice_planned is set
--     instead, and check_inventory_planned stays NULL until this stage's
--     own POST (app/api/otp-supabase/proforma-invoice/route.ts) sets it.
--   - any other payment_mode: check_inventory_planned is set immediately,
--     same as before — Pro-Forma Invoice is skipped entirely.
-- otp_proforma_invoice is 1:1 per order, same as otp_orders_acceptable
-- itself (order_id UNIQUE) — not a multi-wave queue like otp_pre_invoice_queue.
-- =====================================================================

ALTER TABLE public.otp_orders_acceptable
  ADD COLUMN IF NOT EXISTS proforma_invoice_planned timestamptz;

CREATE TABLE IF NOT EXISTS public.otp_proforma_invoice (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id        uuid NOT NULL REFERENCES public.otp_orders(id) ON DELETE CASCADE,

  pi_number       text,
  pi_amount       numeric,
  pi_upload_url   text,
  remark          text,
  created_by      text,

  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),

  UNIQUE (order_id)
);

CREATE INDEX IF NOT EXISTS idx_otp_proforma_invoice_order_id ON public.otp_proforma_invoice (order_id);

ALTER TABLE public.otp_proforma_invoice DISABLE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS otp_trg_proforma_invoice_updated_at ON public.otp_proforma_invoice;
CREATE TRIGGER otp_trg_proforma_invoice_updated_at
  BEFORE UPDATE ON public.otp_proforma_invoice
  FOR EACH ROW
  EXECUTE FUNCTION public.otp_trg_set_updated_at();
