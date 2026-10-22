-- 77: server-paged History views (Batch 2) for Order Acceptable, Pro-Forma Invoice,
-- Indent Creation and the Order Cancel log (pattern: 74_history_views_calibration.sql).
-- Same JSON objects the old embeds returned, plus flat search_text / crm_name /
-- order_location (NULLIF '' -> NULL). LEFT JOINs keep every row. Safe to re-run.

CREATE OR REPLACE VIEW public.otp_v_order_acceptable_history AS
SELECT
  oa.*,
  to_jsonb(o.*) AS "order",
  NULLIF(o.crm_name, '')       AS crm_name,
  NULLIF(o.order_location, '') AS order_location,
  lower(concat_ws(' ',
    oa.is_order_acceptable, oa.acceptance_checklist, oa.remark, oa.processed_by,
    o.order_no, o.company_name, o.quotation_number, o.crm_name, o.contact_person, o.phone_number, o.po_number
  )) AS search_text
FROM public.otp_orders_acceptable oa
LEFT JOIN public.otp_orders o ON o.id = oa.order_id;

-- History = payment against PI recorded.
CREATE OR REPLACE VIEW public.otp_v_proforma_invoice_history AS
SELECT
  pi.*,
  to_jsonb(o.*) || jsonb_build_object(
    'acceptable', (
      SELECT jsonb_build_object('proforma_invoice_planned', oa.proforma_invoice_planned)
      FROM public.otp_orders_acceptable oa WHERE oa.order_id = o.id
    )
  ) AS "order",
  NULLIF(o.crm_name, '')       AS crm_name,
  NULLIF(o.order_location, '') AS order_location,
  lower(concat_ws(' ',
    pi.pi_number, pi.pi_amount::text, pi.remark, pi.created_by, pi.payment_against_pi, pi.payment_against_pi_remark,
    o.order_no, o.company_name, o.quotation_number, o.crm_name, o.contact_person, o.phone_number, o.po_number
  )) AS search_text
FROM public.otp_proforma_invoice pi
LEFT JOIN public.otp_orders o ON o.id = pi.order_id
WHERE pi.payment_against_pi IS NOT NULL;

-- History = material_received set ('Yes' / 'No' / 'Rejected').
CREATE OR REPLACE VIEW public.otp_v_indent_creation_history AS
SELECT
  ic.*,
  to_jsonb(o.*) AS "order",
  NULLIF(o.crm_name, '')       AS crm_name,
  NULLIF(o.order_location, '') AS order_location,
  lower(concat_ws(' ',
    ic.created_by, ic.pfms_indent_no, ic.material_received, ic.material_received_by, ic.remarks,
    ic.warehouse_location, ic.customer_wants_material_as,
    o.order_no, o.company_name, o.quotation_number, o.crm_name, o.contact_person, o.phone_number, o.po_number
  )) AS search_text
FROM public.otp_indent_creation ic
LEFT JOIN public.otp_orders o ON o.id = ic.order_id
WHERE ic.material_received IS NOT NULL;

-- Order Cancel log. Access here is by location only (no CRM rule), so crm_name is not exposed.
CREATE OR REPLACE VIEW public.otp_v_order_cancel_history AS
SELECT
  c.*,
  jsonb_build_object('order_location', o.order_location) AS "order",
  NULLIF(o.order_location, '') AS order_location,
  lower(concat_ws(' ', c.order_no, c.stage_label, c.cancel_reason, c.cancelled_by, o.company_name)) AS search_text
FROM public.otp_order_cancel c
LEFT JOIN public.otp_orders o ON o.id = c.order_id;
