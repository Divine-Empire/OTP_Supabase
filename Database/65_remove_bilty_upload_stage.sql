-- =====================================================================
-- 65_remove_bilty_upload_stage.sql
--
-- The Bilty Upload stage is gone: Packaging and Dispatch now captures
-- Freight/Hamali/Parking Charge + Bilty/Docket files itself (4 new columns
-- on otp_packaging_transport) and EVERY submission goes straight to Client
-- Confirmation (client_confirmation_planned is always set). Bilty/Docket +
-- Freight Charge are mandatory for every mode that used to go through Bilty
-- Upload, optional for the receiving modes that used to skip it (Customer
-- Pickup / Self Pickup and the 2 legacy "By Hand" modes) — enforced in
-- app/api/otp-supabase/packaging-transport/route.ts, not here.
--
-- Run as ONE transaction (psql -1). Existing data:
--   * Every otp_bilty_upload row is folded into its packaging row first
--     (charges + files into the 4 new columns; the bilty form's transporter
--     name / bilty no. / contact / remarks into the existing carrier_name /
--     reference_no / transporter_remarks columns, so nothing is lost when the
--     table is dropped). Its client_confirmation_planned carries over.
--   * Packaging rows already submitted but still waiting for a bilty (no
--     otp_bilty_upload row) go BACK to status='draft' — they reappear in
--     Packaging and Dispatch's Pending with their dispatch data intact, and
--     must fill the new Bilty section like any other order. Nothing reaches
--     Client Confirmation without its bilty.
--   * otp_client_confirmation loses its bilty_upload_id parent; its
--     packaging_transport_id becomes the only (NOT NULL) parent.
-- =====================================================================

ALTER TABLE public.otp_packaging_transport
  ADD COLUMN IF NOT EXISTS freight_charge numeric,
  ADD COLUMN IF NOT EXISTS hamali_charge numeric,
  ADD COLUMN IF NOT EXISTS parking_charge numeric,
  ADD COLUMN IF NOT EXISTS bilty_upload_urls jsonb NOT NULL DEFAULT '[]'::jsonb;

UPDATE public.otp_packaging_transport p
   SET freight_charge = b.freight_charge,
       hamali_charge = b.hamali_charge,
       parking_charge = b.parking_charge,
       bilty_upload_urls = b.bilty_upload_urls,
       client_confirmation_planned = COALESCE(p.client_confirmation_planned, b.client_confirmation_planned),
       carrier_name = COALESCE(p.carrier_name, NULLIF(trim(b.transporter_name), '')),
       reference_no = COALESCE(p.reference_no, NULLIF(NULLIF(trim(b.bilty_number), ''), '0')),
       transporter_remarks = NULLIF(concat_ws(' | ',
         NULLIF(p.transporter_remarks, ''),
         CASE WHEN NULLIF(trim(b.transporter_contact), '') IS NOT NULL THEN 'Bilty contact: ' || b.transporter_contact END,
         CASE WHEN NULLIF(trim(b.transporter_remarks), '') IS NOT NULL THEN 'Bilty remarks: ' || b.transporter_remarks END
       ), '')
  FROM public.otp_bilty_upload b
 WHERE b.packaging_transport_id = p.id;

UPDATE public.otp_client_confirmation c
   SET packaging_transport_id = b.packaging_transport_id,
       bilty_upload_id = NULL
  FROM public.otp_bilty_upload b
 WHERE c.bilty_upload_id = b.id;

UPDATE public.otp_packaging_transport p
   SET status = 'draft'
 WHERE p.status = 'submitted'
   AND p.bilty_upload_planned IS NOT NULL
   AND NOT EXISTS (SELECT 1 FROM public.otp_bilty_upload b WHERE b.packaging_transport_id = p.id);

ALTER TABLE public.otp_client_confirmation DROP CONSTRAINT IF EXISTS otp_client_confirmation_one_parent_check;
ALTER TABLE public.otp_client_confirmation DROP COLUMN bilty_upload_id;
ALTER TABLE public.otp_client_confirmation ALTER COLUMN packaging_transport_id SET NOT NULL;

DROP TABLE public.otp_bilty_upload;
ALTER TABLE public.otp_packaging_transport DROP COLUMN bilty_upload_planned;

DELETE FROM public.otp_stage_tat WHERE stage_key = 'bilty_upload';
UPDATE public.otp_stage_tat
   SET description = 'otp_packaging_transport.client_confirmation_planned — 1 day from Packaging and Dispatch'
 WHERE stage_key = 'client_confirmation';

UPDATE public.otp_users
   SET assigned_steps = array_remove(assigned_steps, 'bilty-upload')
 WHERE 'bilty-upload' = ANY (assigned_steps);
