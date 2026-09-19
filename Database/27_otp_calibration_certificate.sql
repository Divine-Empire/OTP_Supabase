-- =====================================================================
-- 27_otp_calibration_certificate.sql
--
-- MUST BE RUN AGAINST THE SAME PRODUCTION DATABASE as 25_/26_.
--
-- Stage — Calibration Certificate, gated on the calibration flag captured
-- back at Pre-Invoice (otp_pre_invoice_queue.calibration_required):
--
--   Pending: otp_make_invoice.calibration_planned IS NOT NULL AND no
--            matching otp_calibration_certificate row yet — same
--            planned-date pattern as Order Acceptable/Check Inventory.
--   History: a matching otp_calibration_certificate row exists.
--
-- calibration_planned is set once, at Make Invoice submit time (see
-- app/api/otp-supabase/make-invoice/route.ts), only when the queue wave
-- being invoiced had calibration_required = true — a wave with
-- calibration_required = false leaves calibration_planned NULL, so it
-- never appears here; Make Invoice's own History is as far as it goes,
-- exactly as asked. TAT for the planned date comes from otp_stage_tat's
-- existing 'calibration' entry (5 working days), same lookup pattern
-- used elsewhere.
-- =====================================================================

ALTER TABLE public.otp_make_invoice
  ADD COLUMN IF NOT EXISTS calibration_planned timestamptz;

CREATE TABLE IF NOT EXISTS public.otp_calibration_certificate (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  make_invoice_id     uuid NOT NULL REFERENCES public.otp_make_invoice(id) ON DELETE CASCADE,
  order_id            uuid NOT NULL REFERENCES public.otp_orders(id) ON DELETE CASCADE,

  certificate_number  text,
  certificate_type     text,
  certificate_upload_url text,
  remarks             text,
  created_by          text,

  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),

  UNIQUE (make_invoice_id)
);

CREATE INDEX IF NOT EXISTS idx_otp_calibration_certificate_order_id ON public.otp_calibration_certificate (order_id);

ALTER TABLE public.otp_calibration_certificate DISABLE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS otp_trg_calibration_certificate_updated_at ON public.otp_calibration_certificate;
CREATE TRIGGER otp_trg_calibration_certificate_updated_at
  BEFORE UPDATE ON public.otp_calibration_certificate
  FOR EACH ROW
  EXECUTE FUNCTION public.otp_trg_set_updated_at();
