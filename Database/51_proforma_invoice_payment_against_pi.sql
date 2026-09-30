-- =====================================================================
-- 51_proforma_invoice_payment_against_pi.sql
--
-- New "Payment Against PI" step between Pro-Forma Invoice's Pending and
-- History: once PI Number/Amount/Upload is submitted, the row now waits
-- here until someone confirms whether payment against that PI was
-- received. Only once payment_against_pi is set does the row count as
-- History AND does Packing List (Check Inventory) planned date get set —
-- see app/api/otp-supabase/proforma-invoice/payment-against-pi/route.ts.
--
--   Payment Against PI (pending): otp_proforma_invoice row exists AND
--                                  payment_against_pi IS NULL.
--   History: payment_against_pi IS NOT NULL ('Yes' or 'No').
-- =====================================================================

ALTER TABLE public.otp_proforma_invoice
  ADD COLUMN IF NOT EXISTS payment_against_pi text CHECK (payment_against_pi IN ('Yes', 'No')),
  ADD COLUMN IF NOT EXISTS payment_against_pi_remark text;
