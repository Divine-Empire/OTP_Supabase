-- =====================================================================
-- 89_edit_make_invoice.sql
--
-- Make Invoice History: an admin can correct a processed invoice's Invoice Number, Invoice Date,
-- Eway Bill Number, Total Bill Amount and re-upload the Invoice / Eway Bill files.
--
--   * otp_make_invoice.updated_by  - full name of whoever last edited the row (NULL = never edited).
--     updated_at already exists and is stamped by the otp_trg_make_invoice_updated_at trigger.
--   * otp_v_make_invoice_history   - recreated so mi.* carries updated_by.
--   * otp_edit_make_invoice(...)   - the edit as ONE transaction: the row is locked, and the Invoice
--     Number is refused if a Credit Note already exists for the old number (otp_credit_note keeps
--     the invoice number as plain text, so changing it would orphan those credit notes).
--
-- Fields that other code copies are handled by existing triggers: the Service Installation copy of
-- invoice no / date / file (Database/81) re-runs on UPDATE OF these columns. Calibration, Packaging,
-- Client Confirmation, Certi. Hardcopy and Global Search all read the invoice live.
-- Run in the Supabase SQL editor. Safe to re-run.
-- =====================================================================

ALTER TABLE public.otp_make_invoice
  ADD COLUMN IF NOT EXISTS updated_by text;

DROP VIEW IF EXISTS public.otp_v_make_invoice_history;
CREATE VIEW public.otp_v_make_invoice_history AS
SELECT
  mi.*,
  to_jsonb(o.*) AS "order",
  jsonb_build_object(
    'quotation_number', q.quotation_number,
    'calibration_required', q.calibration_required,
    'calibration_type', q.calibration_type,
    'dispatch_location', q.dispatch_location,
    'direct_dispatch_details', q.direct_dispatch_details,
    'invoiced_at', q.invoiced_at,
    'make_invoice_planned', q.make_invoice_planned
  ) AS "queue",
  NULLIF(o.crm_name, '')       AS crm_name,
  NULLIF(o.order_location, '') AS order_location,
  lower(concat_ws(' ',
    mi.invoice_number, mi.eway_bill_number, mi.created_by, mi.updated_by, mi.remarks, mi.transport_id, mi.gst_number, mi.vehicle_number,
    o.order_no, o.company_name, o.quotation_number, o.crm_name, o.contact_person, o.phone_number, o.po_number,
    q.quotation_number
  )) AS search_text
FROM public.otp_make_invoice mi
LEFT JOIN public.otp_orders o ON o.id = mi.order_id
LEFT JOIN public.otp_pre_invoice_queue q ON q.id = mi.pre_invoice_queue_id;

CREATE OR REPLACE FUNCTION public.otp_edit_make_invoice(
  p_id             uuid,
  p_invoice_number text,
  p_invoice_date   date,
  p_eway_number    text,
  p_total          numeric,
  p_invoice_url    text,   -- NULL = keep the current file
  p_eway_url       text,   -- NULL = keep the current file
  p_actor          text
) RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  v_old  public.otp_make_invoice%ROWTYPE;
  v_new  public.otp_make_invoice%ROWTYPE;
BEGIN
  SELECT * INTO v_old FROM public.otp_make_invoice WHERE id = p_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invoice record not found';
  END IF;

  IF NULLIF(btrim(p_invoice_number), '') IS NULL OR p_invoice_date IS NULL OR p_total IS NULL THEN
    RAISE EXCEPTION 'Invoice Number, Invoice Date and Total Bill Amount are required';
  END IF;

  IF btrim(p_invoice_number) IS DISTINCT FROM v_old.invoice_number
     AND EXISTS (SELECT 1 FROM public.otp_credit_note cn WHERE cn.invoice_number = v_old.invoice_number) THEN
    RAISE EXCEPTION 'A credit note already exists for invoice % - the Invoice Number cannot be changed', v_old.invoice_number;
  END IF;

  UPDATE public.otp_make_invoice
  SET invoice_number       = btrim(p_invoice_number),
      invoice_date         = p_invoice_date,
      eway_bill_number     = NULLIF(btrim(COALESCE(p_eway_number, '')), ''),
      total_bill_amount    = p_total,
      invoice_upload_url   = COALESCE(NULLIF(p_invoice_url, ''), invoice_upload_url),
      eway_bill_upload_url = COALESCE(NULLIF(p_eway_url, ''), eway_bill_upload_url),
      updated_by           = p_actor
  WHERE id = p_id
  RETURNING * INTO v_new;

  RETURN to_jsonb(v_new);
END;
$$;

REVOKE ALL ON FUNCTION public.otp_edit_make_invoice(uuid, text, date, text, numeric, text, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.otp_edit_make_invoice(uuid, text, date, text, numeric, text, text, text) TO service_role;
