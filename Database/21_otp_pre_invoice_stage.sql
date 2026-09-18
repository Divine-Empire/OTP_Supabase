-- =====================================================================
-- 21_otp_pre_invoice_stage.sql
--
-- MUST BE RUN AGAINST THE SAME PRODUCTION DATABASE as 17_/18_.
--
-- Adds the two columns the Pre-Invoice stage page needs on top of
-- otp_pre_invoice_queue (created in 17_check_inventory_scan_flow.sql):
-- who processed it, and a copy/upload of the invoice raised. Also
-- renames the "disp-form" step key to "pre-invoice" in otp_users seed
-- data — the /disp-form route + page are being replaced by /pre-invoice,
-- wired to this table instead of the old (never-applied) otp_dispatches
-- schema.
-- =====================================================================

ALTER TABLE public.otp_pre_invoice_queue
  ADD COLUMN IF NOT EXISTS invoice_copy_url text,
  ADD COLUMN IF NOT EXISTS created_by text;

UPDATE public.otp_users
   SET assigned_steps = array_replace(assigned_steps, 'disp-form', 'pre-invoice')
 WHERE 'disp-form' = ANY (assigned_steps);
