-- =====================================================================
-- 22_otp_dropdown_and_pre_invoice_fields.sql
--
-- MUST BE RUN AGAINST THE SAME PRODUCTION DATABASE as 17_/21_.
--
-- 1. otp_dropdown — a generic (category, value) table so dropdown option
--    lists (starting with Pre-Invoice's "Dispatch Location") can be
--    managed from the DB instead of hardcoded in the frontend. Seeded here
--    with the same options the old dispatch-form dialog hardcoded
--    (OTP-Connection/page.tsx). A "Master" page to manage these from the
--    UI is a separate, later task — for now this is read-only from the
--    frontend's point of view.
--
-- 2. otp_pre_invoice_queue gains the extra fields the Pre-Invoice form is
--    being expanded to capture (calibration, transport/GST/vehicle,
--    dispatch location, payment attachment, remarks) — everything from
--    the old dispatch-form dialog except Installation Required and SRN
--    Number (explicitly excluded).
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.otp_dropdown (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category    text NOT NULL,
  value       text NOT NULL,
  sort_order  integer NOT NULL DEFAULT 0,
  is_active   boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (category, value)
);

CREATE INDEX IF NOT EXISTS idx_otp_dropdown_category ON public.otp_dropdown (category);

ALTER TABLE public.otp_dropdown DISABLE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS otp_trg_dropdown_updated_at ON public.otp_dropdown;
CREATE TRIGGER otp_trg_dropdown_updated_at
  BEFORE UPDATE ON public.otp_dropdown
  FOR EACH ROW
  EXECUTE FUNCTION public.otp_trg_set_updated_at();

INSERT INTO public.otp_dropdown (category, value, sort_order) VALUES
  ('dispatch_location', 'By C.G.Warehouse', 1),
  ('dispatch_location', 'By Head office', 2),
  ('dispatch_location', 'By N.E Warehouse', 3),
  ('dispatch_location', 'Direct Dispatch', 4),
  ('dispatch_location', 'Maniquip store', 5)
ON CONFLICT (category, value) DO NOTHING;

ALTER TABLE public.otp_pre_invoice_queue
  ADD COLUMN IF NOT EXISTS calibration_required boolean,
  ADD COLUMN IF NOT EXISTS calibration_type text,
  ADD COLUMN IF NOT EXISTS transport_id text,
  ADD COLUMN IF NOT EXISTS gst_number text,
  ADD COLUMN IF NOT EXISTS vehicle_number text,
  ADD COLUMN IF NOT EXISTS dispatch_location text,
  ADD COLUMN IF NOT EXISTS direct_dispatch_details text,
  ADD COLUMN IF NOT EXISTS payment_attachment_url text,
  ADD COLUMN IF NOT EXISTS remarks text;
