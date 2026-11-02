-- =====================================================================
-- 84_certificate_hardcopy.sql
--
-- Cert. Hardcopy: Pre-Invoice captures whether a hardcopy of the calibration
-- certificate is needed (and where to deliver it); when Calibration
-- Certificate is processed for such a wave, the new "Certi. Hardcopy" stage
-- (/certificate-hardcopy) gets a Pending row. No new table:
--
--   otp_pre_invoice_queue        <- cert_hardcopy_required, hardcopy_delivery_type,
--                                   hardcopy_delivery_address (set at Pre-Invoice submit)
--   otp_calibration_certificate  <- hardcopy_planned / hardcopy_created_at /
--                                   hardcopy_pdf_url, certificate_snapshot
--
--   Pending: hardcopy_planned IS NOT NULL AND hardcopy_created_at IS NULL
--   History: hardcopy_planned IS NOT NULL AND hardcopy_created_at IS NOT NULL
--
-- certificate_snapshot (jsonb) holds the per-certificate values + numbers the
-- user generated in Calibration Certificate so the hardcopy dialog can prefill
-- exactly the same content. Only written for hardcopy = Yes waves, and never
-- selected by list views (fetched on demand for one row).
--
-- Waves processed before this migration have NULL hardcopy_* columns and never
-- reach the Certi. Hardcopy stage. Safe to re-run.
-- =====================================================================

BEGIN;

ALTER TABLE public.otp_pre_invoice_queue
  ADD COLUMN IF NOT EXISTS cert_hardcopy_required   boolean,
  ADD COLUMN IF NOT EXISTS hardcopy_delivery_type    text,
  ADD COLUMN IF NOT EXISTS hardcopy_delivery_address text;

ALTER TABLE public.otp_calibration_certificate
  ADD COLUMN IF NOT EXISTS hardcopy_planned     timestamptz,
  ADD COLUMN IF NOT EXISTS hardcopy_created_at  timestamptz,
  ADD COLUMN IF NOT EXISTS hardcopy_pdf_url     text,
  ADD COLUMN IF NOT EXISTS certificate_snapshot jsonb;

CREATE INDEX IF NOT EXISTS idx_otp_calibration_certificate_hardcopy_pending
  ON public.otp_calibration_certificate (created_at DESC)
  WHERE hardcopy_planned IS NOT NULL AND hardcopy_created_at IS NULL;

INSERT INTO public.otp_stage_tat (stage_key, stage_label, tat_minutes, description) VALUES
  ('certi_hardcopy', 'Certi. Hardcopy', 60, 'otp_calibration_certificate.hardcopy_planned — 1 hour from Calibration Certificate (Cert. Hardcopy Req. = Yes only)')
ON CONFLICT (stage_key) DO NOTHING;

-- ---------------------------------------------------------------------
-- Calibration Certificate Pending: the queue object now also carries the
-- hardcopy request (same column, appended keys only).
-- ---------------------------------------------------------------------
CREATE OR REPLACE VIEW public.otp_v_calibration_pending AS
SELECT
  mi.id,
  mi.order_id,
  mi.pre_invoice_queue_id,
  mi.invoice_number,
  mi.invoice_date,
  mi.invoice_upload_url,
  mi.eway_bill_number,
  mi.eway_bill_upload_url,
  mi.total_bill_amount,
  mi.items,
  mi.remarks,
  mi.created_by,
  mi.created_at,
  mi.updated_at,
  mi.calibration_planned,
  mi.packaging_transport_planned,
  mi.transport_id,
  mi.gst_number,
  mi.vehicle_number,
  mi.payment_attachment_url,
  mi.srn_attachment_url,
  mi.delay_minutes,
  to_jsonb(o.*) AS "order",
  jsonb_build_object(
    'calibration_type', q.calibration_type,
    'cert_hardcopy_required', q.cert_hardcopy_required,
    'hardcopy_delivery_type', q.hardcopy_delivery_type,
    'hardcopy_delivery_address', q.hardcopy_delivery_address
  ) AS queue
FROM public.otp_make_invoice mi
JOIN public.otp_orders o ON o.id = mi.order_id
LEFT JOIN public.otp_pre_invoice_queue q ON q.id = mi.pre_invoice_queue_id
WHERE mi.calibration_planned IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.otp_calibration_certificate cc
    WHERE cc.make_invoice_id = mi.id
  )
ORDER BY mi.created_at DESC;

-- ---------------------------------------------------------------------
-- Calibration Certificate History: explicit columns (not cc.*) so the
-- certificate_snapshot jsonb is never shipped with the list. Dropped, not
-- replaced, because the column list changes (no dependents; fails loudly if any).
-- ---------------------------------------------------------------------
DROP VIEW IF EXISTS public.otp_v_calibration_history;
CREATE VIEW public.otp_v_calibration_history AS
SELECT
  cc.id,
  cc.make_invoice_id,
  cc.order_id,
  cc.certificate_number,
  cc.certificate_type,
  cc.certificate_upload_url,
  cc.remarks,
  cc.created_by,
  cc.created_at,
  cc.updated_at,
  cc.delay_minutes,
  cc.hardcopy_planned,
  cc.hardcopy_created_at,
  cc.hardcopy_pdf_url,
  to_jsonb(o.*) AS "order",
  jsonb_build_object(
    'invoice_number', mi.invoice_number,
    'invoice_date', mi.invoice_date,
    'invoice_upload_url', mi.invoice_upload_url,
    'items', mi.items,
    'calibration_planned', mi.calibration_planned,
    'queue', jsonb_build_object(
      'calibration_type', q.calibration_type,
      'cert_hardcopy_required', q.cert_hardcopy_required,
      'hardcopy_delivery_type', q.hardcopy_delivery_type,
      'hardcopy_delivery_address', q.hardcopy_delivery_address
    )
  ) AS "makeInvoice",
  NULLIF(o.crm_name, '')       AS crm_name,
  NULLIF(o.order_location, '') AS order_location,
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

-- ---------------------------------------------------------------------
-- Pre-Invoice History: q.* is expanded at creation time, so the three new
-- queue columns only appear after the view is rebuilt (body otherwise
-- identical to 75_history_views_stages.sql).
-- ---------------------------------------------------------------------
DROP VIEW IF EXISTS public.otp_v_pre_invoice_history;
CREATE VIEW public.otp_v_pre_invoice_history AS
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

-- ---------------------------------------------------------------------
-- Certi. Hardcopy stage views (no certificate_snapshot — fetched per row).
-- ---------------------------------------------------------------------
CREATE OR REPLACE VIEW public.otp_v_certi_hardcopy_pending AS
SELECT
  cc.id,
  cc.make_invoice_id,
  cc.order_id,
  cc.certificate_number,
  cc.certificate_type,
  cc.certificate_upload_url,
  cc.remarks,
  cc.created_by,
  cc.created_at,
  cc.hardcopy_planned,
  cc.hardcopy_created_at,
  cc.hardcopy_pdf_url,
  to_jsonb(o.*) AS "order",
  jsonb_build_object(
    'invoice_number', mi.invoice_number,
    'invoice_date', mi.invoice_date,
    'invoice_upload_url', mi.invoice_upload_url,
    'items', mi.items,
    'queue', jsonb_build_object(
      'calibration_type', q.calibration_type,
      'cert_hardcopy_required', q.cert_hardcopy_required,
      'hardcopy_delivery_type', q.hardcopy_delivery_type,
      'hardcopy_delivery_address', q.hardcopy_delivery_address
    )
  ) AS "makeInvoice",
  NULLIF(o.crm_name, '')       AS crm_name,
  NULLIF(o.order_location, '') AS order_location
FROM public.otp_calibration_certificate cc
JOIN public.otp_orders o ON o.id = cc.order_id
LEFT JOIN public.otp_make_invoice mi ON mi.id = cc.make_invoice_id
LEFT JOIN public.otp_pre_invoice_queue q ON q.id = mi.pre_invoice_queue_id
WHERE cc.hardcopy_planned IS NOT NULL
  AND cc.hardcopy_created_at IS NULL;

CREATE OR REPLACE VIEW public.otp_v_certi_hardcopy_history AS
SELECT
  cc.id,
  cc.make_invoice_id,
  cc.order_id,
  cc.certificate_number,
  cc.certificate_type,
  cc.certificate_upload_url,
  cc.remarks,
  cc.created_by,
  cc.created_at,
  cc.hardcopy_planned,
  cc.hardcopy_created_at,
  cc.hardcopy_pdf_url,
  to_jsonb(o.*) AS "order",
  jsonb_build_object(
    'invoice_number', mi.invoice_number,
    'invoice_date', mi.invoice_date,
    'invoice_upload_url', mi.invoice_upload_url,
    'items', mi.items,
    'queue', jsonb_build_object(
      'calibration_type', q.calibration_type,
      'cert_hardcopy_required', q.cert_hardcopy_required,
      'hardcopy_delivery_type', q.hardcopy_delivery_type,
      'hardcopy_delivery_address', q.hardcopy_delivery_address
    )
  ) AS "makeInvoice",
  NULLIF(o.crm_name, '')       AS crm_name,
  NULLIF(o.order_location, '') AS order_location,
  lower(concat_ws(' ',
    cc.certificate_number, cc.remarks,
    o.order_no, o.company_name, o.quotation_number, o.crm_name,
    o.contact_person, o.phone_number, o.po_number, mi.invoice_number,
    q.hardcopy_delivery_type, q.hardcopy_delivery_address
  )) AS search_text
FROM public.otp_calibration_certificate cc
LEFT JOIN public.otp_orders o ON o.id = cc.order_id
LEFT JOIN public.otp_make_invoice mi ON mi.id = cc.make_invoice_id
LEFT JOIN public.otp_pre_invoice_queue q ON q.id = mi.pre_invoice_queue_id
WHERE cc.hardcopy_planned IS NOT NULL
  AND cc.hardcopy_created_at IS NOT NULL;

COMMIT;
