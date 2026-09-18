-- =====================================================================
-- 23_pre_invoice_srn_attachment.sql
--
-- MUST BE RUN AGAINST THE SAME PRODUCTION DATABASE as 21_/22_.
--
-- Pre-Invoice's own dialog no longer captures Invoice Number/Invoice Copy
-- (that will be entered at a later stage, once built) — this stage now
-- moves pending -> history purely via otp_pre_invoice_queue.status, set
-- to 'invoiced' on Submit regardless of whether an invoice number exists
-- yet. invoice_number/invoice_copy_url stay on the table (nullable,
-- unused for now) for that future stage to fill in on the same row.
--
-- Adds srn_attachment_url for the new SRN-Attachment field.
-- =====================================================================

ALTER TABLE public.otp_pre_invoice_queue
  ADD COLUMN IF NOT EXISTS srn_attachment_url text;
