-- 74: server-paged History views (Batch 2), pilot: Calibration Certificate.
--
-- One flat view per stage History so the route can page/search/filter in SQL
-- (PostgREST cannot put an embedded column inside a top-level or=(...)).
-- Each view keeps the exact JSON objects the old embed returned ("order",
-- "makeInvoice", ...) so the mappers in lib/otp-utils.ts are unchanged, and adds
-- the flat columns lib/history-filters.ts filters on:
--   search_text    lower-cased concat of the key searchable columns
--   crm_name       from the order (CRM filter + access rule)
--   order_location from the order (location access rule)
--   <stage extras> e.g. calibration_type
-- LEFT JOINs keep every History row, as the old non-inner embed did.
-- Safe to re-run.

CREATE OR REPLACE VIEW public.otp_v_calibration_history AS
SELECT
  cc.*,
  to_jsonb(o.*) AS "order",
  jsonb_build_object(
    'invoice_number', mi.invoice_number,
    'invoice_date', mi.invoice_date,
    'invoice_upload_url', mi.invoice_upload_url,
    'items', mi.items,
    'calibration_planned', mi.calibration_planned,
    'queue', jsonb_build_object('calibration_type', q.calibration_type)
  ) AS "makeInvoice",
  NULLIF(o.crm_name, '')       AS crm_name,       -- '' counts as "no CRM" (lib/access.ts)
  NULLIF(o.order_location, '') AS order_location, -- same for location
  q.calibration_type AS calibration_type,
  lower(concat_ws(' ',
    cc.certificate_number, cc.certificate_type, cc.remarks, cc.created_by,
    o.order_no, o.company_name, o.quotation_number, o.crm_name,
    o.contact_person, o.phone_number, o.po_number, mi.invoice_number
  )) AS search_text
FROM public.otp_calibration_certificate cc
LEFT JOIN public.otp_orders o ON o.id = cc.order_id
LEFT JOIN public.otp_make_invoice mi ON mi.id = cc.make_invoice_id
LEFT JOIN public.otp_pre_invoice_queue q ON q.id = mi.pre_invoice_queue_id;
