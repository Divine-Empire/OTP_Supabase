-- =====================================================================
-- 26_drop_unused_pre_invoice_columns.sql
--
-- MUST BE RUN AGAINST THE SAME PRODUCTION DATABASE as 17_/25_.
--
-- otp_pre_invoice_queue.invoice_number / invoice_copy_url were reserved
-- for capturing the invoice at Pre-Invoice time, but that responsibility
-- moved to its own table (otp_make_invoice — see
-- 25_otp_make_invoice.sql) once Make Invoice was wired up. Nothing in
-- the app writes to either column anymore, so they're dropped rather
-- than left as unused/confusing leftovers.
-- =====================================================================

ALTER TABLE public.otp_pre_invoice_queue
  DROP COLUMN IF EXISTS invoice_number,
  DROP COLUMN IF EXISTS invoice_copy_url;
