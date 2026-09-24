-- =====================================================================
-- 42_otp_client_confirmation.sql
--
-- MUST BE RUN AGAINST THE SAME PRODUCTION DATABASE as 38_/41_.
--
-- Stage — Client Confirmation, right after Bilty Upload.
--
--   Pending: otp_bilty_upload.client_confirmation_planned IS NOT NULL AND
--            no matching otp_client_confirmation row yet — same
--            planned-date pattern as every other stage.
--   History: a matching otp_client_confirmation row exists.
--
-- client_confirmation_planned is set once, at Bilty Upload submit time
-- (see app/api/otp-supabase/bilty-upload/route.ts), 1 day (1440 minutes)
-- after that submission — TAT comes from otp_stage_tat's new
-- 'client_confirmation' entry, same lookup pattern used elsewhere.
-- =====================================================================

ALTER TABLE public.otp_bilty_upload
  ADD COLUMN IF NOT EXISTS client_confirmation_planned timestamptz;

CREATE TABLE IF NOT EXISTS public.otp_client_confirmation (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  bilty_upload_id     uuid NOT NULL REFERENCES public.otp_bilty_upload(id) ON DELETE CASCADE,
  order_id            uuid NOT NULL REFERENCES public.otp_orders(id) ON DELETE CASCADE,

  material_received   text NOT NULL CHECK (material_received IN ('Yes', 'No')),
  site_person_name    text NOT NULL,
  contact_number      text NOT NULL,

  created_by          text,

  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),

  UNIQUE (bilty_upload_id)
);

CREATE INDEX IF NOT EXISTS idx_otp_client_confirmation_order_id ON public.otp_client_confirmation (order_id);

ALTER TABLE public.otp_client_confirmation DISABLE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS otp_trg_client_confirmation_updated_at ON public.otp_client_confirmation;
CREATE TRIGGER otp_trg_client_confirmation_updated_at
  BEFORE UPDATE ON public.otp_client_confirmation
  FOR EACH ROW
  EXECUTE FUNCTION public.otp_trg_set_updated_at();

INSERT INTO public.otp_stage_tat (stage_key, stage_label, tat_minutes, description) VALUES
  ('client_confirmation', 'Client Confirmation', 1440, 'otp_bilty_upload.client_confirmation_planned — 1 day from Bilty Upload')
ON CONFLICT (stage_key) DO NOTHING;
