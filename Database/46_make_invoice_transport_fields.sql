-- =====================================================================
-- 46_make_invoice_transport_fields.sql
--
-- MUST BE RUN AGAINST THE SAME PRODUCTION DATABASE as 13_/25_/44_/45_.
--
-- Adds 5 fields to Make Invoice (otp_make_invoice), mirroring the same
-- fields/columns Pre-Invoice already has (see
-- Database/22_otp_dropdown_and_pre_invoice_fields.sql and
-- Database/23_pre_invoice_srn_attachment.sql): Transport Id/Name, GST
-- Number, Vehicle Number, Payment Details Attachment (advance payments),
-- SRN Attachment. Entered on the Make Invoice submit form, alongside the
-- existing Invoice Number/Date/Upload etc.
-- =====================================================================

ALTER TABLE public.otp_make_invoice
  ADD COLUMN IF NOT EXISTS transport_id text,
  ADD COLUMN IF NOT EXISTS gst_number text,
  ADD COLUMN IF NOT EXISTS vehicle_number text,
  ADD COLUMN IF NOT EXISTS payment_attachment_url text,
  ADD COLUMN IF NOT EXISTS srn_attachment_url text;
