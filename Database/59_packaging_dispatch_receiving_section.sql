-- =====================================================================
-- 59_packaging_dispatch_receiving_section.sql
--
-- Packaging and Transport (renamed in the UI to "Packaging and Dispatch")
-- gains a per-wave editable Transport Mode (pre-filled from
-- otp_orders.transport_mode, overridable here only — never written back)
-- that branches the process form:
--   Receiving's Section — By Hand Maniquip Store / By Hand-Head Office /
--     By Hand-Warehouse / Door delivery. No transporter — just a
--     Receiving's Copy upload. Sets client_confirmation_planned directly,
--     skipping Bilty Upload entirely (bilty_upload_planned stays null).
--   Transportation Details — everything else (By Transport, Direct
--     Dispatch, By Bus, By Auto, By Air, By Courier). Unchanged existing
--     flow: sets bilty_upload_planned.
--
-- otp_client_confirmation previously could only ever be reached via
-- otp_bilty_upload (bilty_upload_id NOT NULL). It now branches in parallel
-- off EITHER otp_bilty_upload OR otp_packaging_transport directly — same
-- parallel-branch shape as Calibration Certificate + Packaging and
-- Transport both branching off otp_make_invoice (see
-- Database/36_packaging_transport_off_make_invoice.sql). Exactly one
-- parent is ever set, enforced by the CHECK below.
-- =====================================================================

ALTER TABLE public.otp_packaging_transport
  ADD COLUMN IF NOT EXISTS transport_mode text,
  ADD COLUMN IF NOT EXISTS receiving_copy_url text,
  ADD COLUMN IF NOT EXISTS client_confirmation_planned timestamptz;

ALTER TABLE public.otp_client_confirmation
  ALTER COLUMN bilty_upload_id DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS packaging_transport_id uuid
    REFERENCES public.otp_packaging_transport(id) ON DELETE CASCADE;

ALTER TABLE public.otp_client_confirmation
  DROP CONSTRAINT IF EXISTS otp_client_confirmation_one_parent_check;
ALTER TABLE public.otp_client_confirmation
  ADD CONSTRAINT otp_client_confirmation_one_parent_check
  CHECK (num_nonnulls(bilty_upload_id, packaging_transport_id) = 1);

CREATE UNIQUE INDEX IF NOT EXISTS otp_client_confirmation_packaging_transport_id_key
  ON public.otp_client_confirmation (packaging_transport_id);

-- Seed the transport_mode dropdown (category used by the new "Transport
-- Mode" select on the process form) — fixed ids/timestamps as given.
INSERT INTO public.otp_dropdown (id, category, value, created_at) VALUES
  ('029c882c-5e71-4f1a-a6c5-602157866665', 'transport_mode', 'By Transport', '2026-07-25 12:30:24.38994+00'),
  ('1156d97a-2a0b-4624-8225-d43a31955a29', 'transport_mode', 'Direct Dispatch', '2026-07-25 12:30:24.38994+00'),
  ('18724f13-23bc-4ca0-a58d-8f6829c44435', 'transport_mode', 'By Bus', '2026-08-24 05:52:49.392975+00'),
  ('3326e880-6bd4-4121-9e88-b4aca6abf48a', 'transport_mode', 'By Auto', '2026-07-25 12:30:24.38994+00'),
  ('3446d78e-b238-4ee9-b117-642788cd64f5', 'transport_mode', 'By Hand Maniquip Store', '2026-07-25 12:30:24.38994+00'),
  ('358e3fb3-c635-4437-8500-1fb8405297c9', 'transport_mode', 'By Hand-Warehouse', '2026-07-25 12:30:24.38994+00'),
  ('5ced4b76-8845-40c7-ab8d-e67b2b92e678', 'transport_mode', 'By Air', '2026-07-25 12:30:24.38994+00'),
  ('79059ba3-1ae4-4d00-bb5c-e0a3636d0635', 'transport_mode', 'By Courier', '2026-07-25 12:30:24.38994+00'),
  ('8a885b9d-896b-4f97-873b-e15c8fb98c8c', 'transport_mode', 'By Hand-Head Office', '2026-07-25 12:30:24.38994+00'),
  ('906dbc5c-dc96-494a-a3d4-e81500ce8414', 'transport_mode', 'Door delivery', '2026-07-25 12:30:24.38994+00')
ON CONFLICT (id) DO NOTHING;
