-- =====================================================================
-- 49_bilty_upload_transporter_name.sql
--
-- Bilty Upload's Process dialog needs a mandatory Transporter Name field
-- (separate from the existing Transporter Contact No.) — see
-- app/bilty-upload/page.tsx / app/api/otp-supabase/bilty-upload/route.ts.
-- =====================================================================

ALTER TABLE public.otp_bilty_upload
  ADD COLUMN IF NOT EXISTS transporter_name text;
