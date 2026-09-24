-- =====================================================================
-- 39_packaging_transport_draft_save.sql
--
-- MUST BE RUN AGAINST THE SAME PRODUCTION DATABASE as 35_/36_.
--
-- Packaging and Transport's Process dialog gets a two-step save:
--   1. "Save Photos" — only Before Photo (and optionally After Photo)
--      required. Creates/updates the otp_packaging_transport row with
--      status = 'draft'. The order STAYS in Pending (a draft row is
--      merged back into Pending's listing, not treated as done), and
--      bilty_upload_planned is NOT set yet.
--   2. "Submit" (final) — the rest of the form (transporter, charges,
--      dispatch confirmation) is required. Flips the SAME row's status
--      to 'submitted', which is what actually moves it to History and
--      sets bilty_upload_planned, unlocking Bilty Upload's Pending queue.
--
-- transporter_name must become nullable — a draft row only has photos,
-- not the transporter yet. Existing rows (all real ones were created via
-- the old one-shot submit, i.e. already fully complete) automatically
-- backfill to status = 'submitted' via the column DEFAULT below.
-- =====================================================================

ALTER TABLE public.otp_packaging_transport
  ALTER COLUMN transporter_name DROP NOT NULL;

ALTER TABLE public.otp_packaging_transport
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'submitted'
    CHECK (status IN ('draft', 'submitted'));

CREATE INDEX IF NOT EXISTS idx_otp_packaging_transport_status ON public.otp_packaging_transport (status);
