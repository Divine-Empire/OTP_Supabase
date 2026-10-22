-- 75: server-paged History views for the remaining stages (Batch 2; pattern and
-- rationale in 74_history_views_calibration.sql). Each view returns the stage
-- row's columns, the same joined JSON objects the old PostgREST embed returned
-- (mappers in lib/otp-utils.ts unchanged), and the flat filter columns
-- search_text / crm_name / order_location (NULLIF '' -> NULL: "no CRM" / "no
-- location" is visible to everyone, lib/access.ts). LEFT JOINs keep every row.
-- Safe to re-run.

-- Client Confirmation ---------------------------------------------------------
CREATE OR REPLACE VIEW public.otp_v_client_confirmation_history AS
SELECT
  cc.*,
  to_jsonb(o.*) AS "order",
  jsonb_build_object(
    'transport_mode', pt.transport_mode,
    'receiving_copy_url', pt.receiving_copy_url,
    'client_confirmation_planned', pt.client_confirmation_planned,
    'transporter_name', pt.transporter_name,
    'reference_no', pt.reference_no,
    'freight_charge', pt.freight_charge,
    'hamali_charge', pt.hamali_charge,
    'parking_charge', pt.parking_charge,
    'bilty_upload_urls', pt.bilty_upload_urls,
    'makeInvoice', jsonb_build_object('invoice_number', mi.invoice_number, 'items', mi.items)
  ) AS "packagingTransport",
  NULLIF(o.crm_name, '')       AS crm_name,
  NULLIF(o.order_location, '') AS order_location,
  lower(concat_ws(' ',
    cc.material_received, cc.site_person_name, cc.contact_number, cc.created_by,
    o.order_no, o.company_name, o.quotation_number, o.crm_name, o.contact_person, o.phone_number, o.po_number,
    mi.invoice_number, pt.transporter_name, pt.reference_no
  )) AS search_text
FROM public.otp_client_confirmation cc
LEFT JOIN public.otp_orders o ON o.id = cc.order_id
LEFT JOIN public.otp_packaging_transport pt ON pt.id = cc.packaging_transport_id
LEFT JOIN public.otp_make_invoice mi ON mi.id = pt.make_invoice_id;

-- Delivery Note (terminal debit note) -----------------------------------------
CREATE OR REPLACE VIEW public.otp_v_delivery_note_history AS
SELECT
  dn.*,
  to_jsonb(o.*) || jsonb_build_object(
    'acceptable', (
      SELECT jsonb_build_object('debit_note_planned', oa.debit_note_planned)
      FROM public.otp_orders_acceptable oa WHERE oa.order_id = o.id
    )
  ) AS "order",
  NULLIF(o.crm_name, '')       AS crm_name,
  NULLIF(o.order_location, '') AS order_location,
  lower(concat_ws(' ',
    dn.dn_number, dn.created_by,
    o.order_no, o.company_name, o.quotation_number, o.crm_name, o.contact_person, o.phone_number, o.po_number
  )) AS search_text
FROM public.otp_debit_note dn
LEFT JOIN public.otp_orders o ON o.id = dn.order_id;

-- Delivery Note (Inv.) ---------------------------------------------------------
CREATE OR REPLACE VIEW public.otp_v_delivery_note_for_invoice_history AS
SELECT
  d.*,
  to_jsonb(o.*) AS "order",
  jsonb_build_object(
    'quotation_number', q.quotation_number,
    'source_stage', q.source_stage,
    'items', q.items,
    'debit_note_planned', q.debit_note_planned
  ) AS "queue",
  NULLIF(o.crm_name, '')       AS crm_name,
  NULLIF(o.order_location, '') AS order_location,
  lower(concat_ws(' ',
    d.dn_number, d.created_by, d.amount::text,
    o.order_no, o.company_name, o.quotation_number, o.crm_name, o.contact_person, o.phone_number, o.po_number,
    q.quotation_number
  )) AS search_text
FROM public.otp_debit_note_for_invoice d
LEFT JOIN public.otp_orders o ON o.id = d.order_id
LEFT JOIN public.otp_pre_invoice_queue q ON q.id = d.pre_invoice_queue_id;

-- Pre-Invoice (History = status 'invoiced') -----------------------------------
CREATE OR REPLACE VIEW public.otp_v_pre_invoice_history AS
SELECT
  q.*,
  to_jsonb(o.*) || jsonb_build_object(
    'shortages', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('shortage_qty', s.shortage_qty, 'status', s.status))
      FROM public.otp_check_inventory_shortage s WHERE s.order_id = o.id
    ), '[]'::jsonb),
    'indents', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('items', ic.items, 'material_received', ic.material_received))
      FROM public.otp_indent_creation ic WHERE ic.order_id = o.id
    ), '[]'::jsonb)
  ) AS "order",
  COALESCE((
    SELECT jsonb_agg(jsonb_build_object(
      'item_name', r.item_name, 'qty_released', r.qty_released, 'reason', r.reason,
      'released_by', r.released_by, 'created_at', r.created_at))
    FROM public.otp_released_stock r WHERE r.source_queue_id = q.id
  ), '[]'::jsonb) AS released,
  NULLIF(o.crm_name, '')       AS crm_name,
  NULLIF(o.order_location, '') AS order_location,
  lower(concat_ws(' ',
    q.quotation_number, q.source_stage, q.created_by, q.transport_id, q.gst_number, q.vehicle_number,
    q.dispatch_location, q.remarks, q.payment_mode,
    o.order_no, o.company_name, o.crm_name, o.contact_person, o.phone_number, o.po_number
  )) AS search_text
FROM public.otp_pre_invoice_queue q
LEFT JOIN public.otp_orders o ON o.id = q.order_id
WHERE q.status = 'invoiced';

-- Packaging and Dispatch (History = status 'submitted') -----------------------
CREATE OR REPLACE VIEW public.otp_v_packaging_transport_history AS
SELECT
  pt.*,
  to_jsonb(o.*) AS "order",
  jsonb_build_object(
    'invoice_number', mi.invoice_number,
    'invoice_date', mi.invoice_date,
    'invoice_upload_url', mi.invoice_upload_url,
    'items', mi.items,
    'packaging_transport_planned', mi.packaging_transport_planned,
    'created_at', mi.created_at
  ) AS "makeInvoice",
  NULLIF(o.crm_name, '')       AS crm_name,
  NULLIF(o.order_location, '') AS order_location,
  lower(concat_ws(' ',
    pt.transporter_name, pt.transporter_contact, pt.reference_no, pt.carrier_name, pt.vehicle_no,
    pt.dispatch_status, pt.transport_mode, pt.created_by,
    o.order_no, o.company_name, o.quotation_number, o.crm_name, o.contact_person, o.phone_number, o.po_number,
    mi.invoice_number
  )) AS search_text
FROM public.otp_packaging_transport pt
LEFT JOIN public.otp_orders o ON o.id = pt.order_id
LEFT JOIN public.otp_make_invoice mi ON mi.id = pt.make_invoice_id
WHERE pt.status = 'submitted';

-- Make Invoice -----------------------------------------------------------------
CREATE OR REPLACE VIEW public.otp_v_make_invoice_history AS
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
    mi.invoice_number, mi.eway_bill_number, mi.created_by, mi.remarks, mi.transport_id, mi.gst_number, mi.vehicle_number,
    o.order_no, o.company_name, o.quotation_number, o.crm_name, o.contact_person, o.phone_number, o.po_number,
    q.quotation_number
  )) AS search_text
FROM public.otp_make_invoice mi
LEFT JOIN public.otp_orders o ON o.id = mi.order_id
LEFT JOIN public.otp_pre_invoice_queue q ON q.id = mi.pre_invoice_queue_id;
