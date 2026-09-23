-- =====================================================================
-- 38_otp_bilty_upload.sql
--
-- MUST BE RUN AGAINST THE SAME PRODUCTION DATABASE as 35_/36_.
--
-- Stage — Bilty Upload, the final stage right after Packaging and
-- Transport. otp_packaging_transport already carries a
-- bilty_upload_planned column (added in 35_otp_packaging_transport.sql)
-- that was left unwired — this migration wires it and adds the table it
-- points to.
--
--   Pending: otp_packaging_transport.bilty_upload_planned IS NOT NULL AND
--            no matching otp_bilty_upload row yet — same planned-date
--            pattern as every other stage.
--   History: a matching otp_bilty_upload row exists.
--
-- bilty_upload_planned is set once, at Packaging and Transport submit
-- time (see app/api/otp-supabase/packaging-transport/route.ts), 1 day
-- (1440 minutes) after that submission — TAT comes from otp_stage_tat's
-- new 'bilty_upload' entry, same lookup pattern used elsewhere.
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.otp_bilty_upload (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  packaging_transport_id  uuid NOT NULL REFERENCES public.otp_packaging_transport(id) ON DELETE CASCADE,
  order_id                uuid NOT NULL REFERENCES public.otp_orders(id) ON DELETE CASCADE,

  transporter_contact     text,
  bilty_number            text,
  bilty_upload_urls       jsonb NOT NULL DEFAULT '[]'::jsonb,
  freight_charge          numeric,
  hamali_charge           numeric,
  parking_charge          numeric,
  transporter_remarks     text,

  created_by              text,

  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now(),

  UNIQUE (packaging_transport_id)
);

CREATE INDEX IF NOT EXISTS idx_otp_bilty_upload_order_id ON public.otp_bilty_upload (order_id);

ALTER TABLE public.otp_bilty_upload DISABLE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS otp_trg_bilty_upload_updated_at ON public.otp_bilty_upload;
CREATE TRIGGER otp_trg_bilty_upload_updated_at
  BEFORE UPDATE ON public.otp_bilty_upload
  FOR EACH ROW
  EXECUTE FUNCTION public.otp_trg_set_updated_at();

INSERT INTO public.otp_stage_tat (stage_key, stage_label, tat_minutes, description) VALUES
  ('bilty_upload', 'Bilty Upload', 1440, 'otp_packaging_transport.bilty_upload_planned — 1 day from Packaging and Transport')
ON CONFLICT (stage_key) DO NOTHING;
