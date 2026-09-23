-- =====================================================================
-- 35_otp_packaging_transport.sql
--
-- MUST BE RUN AGAINST THE SAME PRODUCTION DATABASE as 27_/33_/34_.
--
-- Stage — Packaging and Transport. Merges the two legacy `warehouse` app
-- pages (app/packaging + app/transporting) into one OTP_Supabase stage,
-- placed right after Calibration Certificate in the sidebar.
--
--   Pending: otp_calibration_certificate.packaging_transport_planned IS NOT
--            NULL AND no matching otp_packaging_transport row yet — same
--            planned-date pattern as every other stage.
--   History: a matching otp_packaging_transport row exists.
--
-- packaging_transport_planned is set once, at Calibration Certificate
-- submit time (see app/api/otp-supabase/calibration/route.ts), 3 days
-- (4320 minutes) after that submission — TAT comes from otp_stage_tat's
-- new 'packaging_transport' entry, same lookup pattern used elsewhere.
--
-- A further stage ("Bilty Upload") is planned after this one, so this
-- table already carries a `bilty_upload_planned` column for it — but that
-- column is left NULL for now (no otp_stage_tat row/TAT wiring for it
-- yet); building that stage itself is a later phase, same incremental
-- approach used for material_received/pre_invoice.
-- =====================================================================

ALTER TABLE public.otp_calibration_certificate
  ADD COLUMN IF NOT EXISTS packaging_transport_planned timestamptz;

CREATE TABLE IF NOT EXISTS public.otp_packaging_transport (
  id                        uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  calibration_certificate_id uuid NOT NULL REFERENCES public.otp_calibration_certificate(id) ON DELETE CASCADE,
  order_id                  uuid NOT NULL REFERENCES public.otp_orders(id) ON DELETE CASCADE,

  -- Section 3: Documentation (packaging.jsx)
  before_photo_urls         jsonb NOT NULL DEFAULT '[]'::jsonb,
  after_photo_urls          jsonb NOT NULL DEFAULT '[]'::jsonb,

  -- Section 2 + Bilty details (transporting.jsx)
  transporter_name          text NOT NULL,
  transporter_contact       text,
  bilty_number              text,
  bilty_upload_urls         jsonb NOT NULL DEFAULT '[]'::jsonb,
  freight_charge            numeric,
  hamali_charge             numeric,
  parking_charge            numeric,
  transporter_remarks       text,
  expense_amount            numeric,

  -- Section 4: Dispatch Confirmation
  dispatch_status           text NOT NULL DEFAULT 'okay' CHECK (dispatch_status IN ('okay', 'notokay')),
  not_ok_reason             text,

  -- Next stage ("Bilty Upload") planned date — not computed yet, see note above.
  bilty_upload_planned      timestamptz,

  created_by                text,

  created_at                timestamptz NOT NULL DEFAULT now(),
  updated_at                timestamptz NOT NULL DEFAULT now(),

  UNIQUE (calibration_certificate_id)
);

CREATE INDEX IF NOT EXISTS idx_otp_packaging_transport_order_id ON public.otp_packaging_transport (order_id);

ALTER TABLE public.otp_packaging_transport DISABLE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS otp_trg_packaging_transport_updated_at ON public.otp_packaging_transport;
CREATE TRIGGER otp_trg_packaging_transport_updated_at
  BEFORE UPDATE ON public.otp_packaging_transport
  FOR EACH ROW
  EXECUTE FUNCTION public.otp_trg_set_updated_at();

INSERT INTO public.otp_stage_tat (stage_key, stage_label, tat_minutes, description) VALUES
  ('packaging_transport', 'Packaging and Transport', 4320, 'otp_calibration_certificate.packaging_transport_planned — 3 days from Calibration Certificate')
ON CONFLICT (stage_key) DO NOTHING;
