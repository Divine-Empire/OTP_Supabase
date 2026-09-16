-- ==============================================================================
-- 05_views.sql
-- Views for Unified Frontend Querying, Dashboard Metrics & MIS Performance
-- ==============================================================================

-- 1. VIEW: Order Full View (Replaces ORDER-DISPATCH sheet row queries)
CREATE OR REPLACE VIEW otp_v_order_full AS
SELECT
  o.id,
  o.order_no,
  o.quotation_no,
  o.timestamp,
  o.company_name,
  o.contact_person_name,
  o.contact_number,
  o.billing_address,
  o.shipping_address,
  o.payment_mode,
  o.payment_terms_days,
  o.reference_name,
  o.email,
  o.transport_mode,
  o.destination,
  o.item_qty_summary,
  o.po_number,
  o.quotation_copy_url,
  o.acceptance_copy_url,
  o.offer_show,
  o.conveyed_for_registration,
  o.total_order_qty,
  o.amount,
  o.gst_no,
  o.cre_name,
  o.payment_balance,
  o.total_dispatched_qty,
  o.total_delivered_qty,
  o.total_cancelled_qty,
  o.pending_delivery_qty,
  o.pending_dispatch_qty,
  o.delivery_status,
  o.dispatch_status,
  o.dispatch_complete_date,
  o.delivery_complete_date,
  o.revised_order_date,
  o.revised_order_status,
  o.revised_order_remark,
  o.sc_name,
  o.is_order_accept_cancel,
  o.source_lto_order_id,
  o.created_at,
  o.updated_at,

  -- Stage 1: Order Acceptable
  oa.id AS oa_id,
  oa.planned_date AS oa_planned,
  oa.actual_date AS oa_actual,
  oa.delay_minutes AS oa_delay,
  oa.is_order_acceptable,
  oa.acceptance_checklist,
  oa.remark AS oa_remark,
  oa.created_by AS oa_created_by,

  -- Stage 2: Check Inventory
  ci.id AS ci_id,
  ci.planned_date AS ci_planned,
  ci.actual_date AS ci_actual,
  ci.delay_minutes AS ci_delay,
  ci.availability_status,
  ci.remarks AS ci_remarks,
  ci.customer_wants_material_as,
  ci.warehouse_location AS ci_warehouse_location,
  ci.create_indent_if_not_avail,
  ci.line_item_number AS ci_line_item_number,
  ci.total_qty AS ci_total_qty,
  ci.material_received_lead_time,
  ci.created_by AS ci_created_by,

  -- Stage 3: Material Received
  mr.id AS mr_id,
  mr.planned_date AS mr_planned,
  mr.actual_date AS mr_actual,
  mr.delay_minutes AS mr_delay,
  mr.received_date AS mr_received_date,
  mr.created_by AS mr_created_by,

  -- Stage 4: Senior Approval
  sa.id AS sa_id,
  sa.planned_date AS sa_planned,
  sa.actual_date AS sa_actual,
  sa.delay_minutes AS sa_delay,
  sa.approval_name,
  sa.revenue,
  sa.created_by AS sa_created_by,

  -- Normalized line items as JSON array
  COALESCE(
    (
      SELECT jsonb_agg(
        jsonb_build_object(
          'item_no', oi.item_no,
          'item_name', oi.item_name,
          'quantity', oi.quantity
        ) ORDER BY oi.item_no
      )
      FROM otp_order_items oi
      WHERE oi.order_id = o.id
    ),
    '[]'::jsonb
  ) AS items

FROM otp_orders o
LEFT JOIN otp_order_acceptable oa ON oa.order_id = o.id
LEFT JOIN otp_check_inventory ci   ON ci.order_id = o.id
LEFT JOIN otp_material_received mr ON mr.order_id = o.id
LEFT JOIN otp_senior_approval sa   ON sa.order_id = o.id;


-- 2. VIEW: Dispatch Full View (Replaces DISPATCH-DELIVERY sheet row queries)
CREATE OR REPLACE VIEW otp_v_dispatch_full AS
SELECT
  d.id,
  d.dispatch_no,
  d.order_id,
  d.order_no,
  d.timestamp,
  d.total_dispatch_qty,
  d.total_bill_amount,
  d.calibration_required,
  d.certificate_category,
  d.installation_required,
  d.transporter_id,
  d.vehicle_no,
  d.srn_number,
  d.srn_number_attachment_url,
  d.attachment_url,
  d.gst_no,
  d.dispatch_status,
  d.dispatch_location,
  d.direct_dispatch,
  d.calibration_responsible,
  d.bilty_number,
  d.bilty_date,
  d.serial_no,
  d.location,
  d.expense_amount,
  d.hamali_charge,
  d.parking_charge,
  d.remarks,
  d.created_by,
  d.created_at,
  d.updated_at,

  -- Master order attributes
  o.quotation_no,
  o.company_name,
  o.contact_person_name,
  o.contact_number,
  o.billing_address,
  o.shipping_address,
  o.payment_mode,
  o.payment_terms_days,
  o.cre_name,
  sa.approval_name AS approved_name,

  -- Stage 5: Make Invoice
  mi.id AS mi_id,
  mi.planned_date AS mi_planned,
  mi.actual_date AS mi_actual,
  mi.delay_minutes AS mi_delay,
  mi.invoice_number,
  mi.invoice_upload_url,
  mi.eway_bill_upload_url,
  mi.total_qty AS mi_total_qty,
  mi.total_bill_amount AS mi_total_bill_amount,
  mi.bill_date AS mi_bill_date,
  mi.created_by AS mi_created_by,

  -- Stage 6: Warehouse (Material RCVD)
  wh.id AS wh_id,
  wh.planned_date AS wh_planned,
  wh.actual_date AS wh_actual,
  wh.delay_minutes AS wh_delay,
  wh.before_photo_url,
  wh.after_photo_url,
  wh.bilty_upload_url,
  wh.transporter_name,
  wh.transporter_contact,
  wh.bilty_docket_no,
  wh.freight_charge,
  wh.warehouse_remarks,
  wh.created_by AS wh_created_by,

  -- Stage 7: Driver Follow-up / Material Receiving
  mrcv.id AS mrcv_id,
  mrcv.planned_date AS mrcv_planned,
  mrcv.actual_date AS mrcv_actual,
  mrcv.delay_minutes AS mrcv_delay,
  mrcv.material_receiving_status,
  mrcv.site_person_name,
  mrcv.site_person_contact,
  mrcv.created_by AS mrcv_created_by,

  -- Stage 8: Calibration Certificate
  cal.id AS cal_id,
  cal.planned_date AS cal_planned,
  cal.actual_date AS cal_actual,
  cal.delay_minutes AS cal_delay,
  cal.lab_cert_url,
  cal.st_cert_url,
  cal.lab_cert_date,
  cal.st_cert_date,
  cal.lab_cert_period,
  cal.st_cert_period,
  cal.lab_due_date,
  cal.st_due_date,
  cal.created_by AS cal_created_by,

  -- Stage 9: Update Delivery Note
  ud.id AS ud_id,
  ud.planned_date AS ud_planned,
  ud.actual_date AS ud_actual,
  ud.delay_minutes AS ud_delay,
  ud.upload_dn_url,
  ud.dispatch_status AS ud_dispatch_status,
  ud.dispatch_location AS ud_dispatch_location,
  ud.total_delivered_qty,
  ud.created_by AS ud_created_by,

  -- Dispatch line items as JSON array
  COALESCE(
    (
      SELECT jsonb_agg(
        jsonb_build_object(
          'item_no', di.item_no,
          'item_name', di.item_name,
          'quantity', di.quantity
        ) ORDER BY di.item_no
      )
      FROM otp_dispatch_items di
      WHERE di.dispatch_id = d.id
    ),
    '[]'::jsonb
  ) AS dispatch_items

FROM otp_dispatches d
JOIN otp_orders o                  ON o.id = d.order_id
LEFT JOIN otp_senior_approval sa   ON sa.order_id = o.id
LEFT JOIN otp_make_invoice mi      ON mi.dispatch_id = d.id
LEFT JOIN otp_warehouse wh         ON wh.dispatch_id = d.id
LEFT JOIN otp_material_receiving mrcv ON mrcv.dispatch_id = d.id
LEFT JOIN otp_calibration cal      ON cal.dispatch_id = d.id
LEFT JOIN otp_update_delivery ud   ON ud.dispatch_id = d.id;


-- 3. VIEW: Dashboard KPI Aggregations
CREATE OR REPLACE VIEW otp_v_dashboard_kpis AS
SELECT
  -- Order metrics
  COUNT(DISTINCT o.id) AS total_orders,
  COUNT(DISTINCT o.id) FILTER (WHERE o.pending_delivery_qty > 0) AS pending_orders,
  COUNT(DISTINCT o.id) FILTER (WHERE o.pending_delivery_qty <= 0) AS completed_orders,
  COUNT(DISTINCT o.id) FILTER (WHERE o.is_order_accept_cancel = TRUE OR o.total_cancelled_qty >= o.total_order_qty) AS cancel_orders,
  COUNT(DISTINCT o.id) FILTER (WHERE o.total_delivered_qty > 0 AND o.pending_delivery_qty <= 0) AS delivered_orders,
  COALESCE(SUM(o.amount), 0) AS total_revenue,
  COALESCE(SUM(o.amount) FILTER (WHERE o.pending_delivery_qty <= 0), 0) AS completed_revenue,
  COALESCE(SUM(o.amount) FILTER (WHERE o.pending_delivery_qty > 0), 0) AS pending_revenue,

  -- Stage pending queues
  COUNT(DISTINCT o.id) FILTER (WHERE oa.planned_date IS NOT NULL AND oa.actual_date IS NULL) AS order_acceptable_pending,
  COUNT(DISTINCT o.id) FILTER (WHERE ci.planned_date IS NOT NULL AND ci.actual_date IS NULL) AS inventory_pending,
  COUNT(DISTINCT o.id) FILTER (WHERE mr.planned_date IS NOT NULL AND mr.actual_date IS NULL) AS material_received_pending,
  COUNT(DISTINCT o.id) FILTER (WHERE sa.planned_date IS NOT NULL AND sa.actual_date IS NULL) AS approval_pending,

  -- Dispatch stage pending queues
  (SELECT COUNT(*) FROM otp_dispatches) AS total_dispatches,
  (SELECT COUNT(*) FROM otp_dispatches WHERE dispatch_status = 'Pending') AS pending_dispatches,
  (SELECT COUNT(*) FROM otp_dispatches WHERE dispatch_status = 'Complete') AS completed_dispatches,
  (SELECT COALESCE(SUM(total_bill_amount), 0) FROM otp_dispatches) AS dispatch_revenue,
  (SELECT COUNT(*) FROM otp_make_invoice WHERE planned_date IS NOT NULL AND actual_date IS NOT NULL) AS invoice_generated,
  (SELECT COUNT(*) FROM otp_calibration WHERE planned_date IS NOT NULL AND actual_date IS NULL) AS calibration_required,
  (SELECT COUNT(*) FROM otp_update_delivery WHERE planned_date IS NOT NULL AND actual_date IS NOT NULL) AS dispatch_complete

FROM otp_orders o
LEFT JOIN otp_order_acceptable oa ON oa.order_id = o.id
LEFT JOIN otp_check_inventory ci   ON ci.order_id = o.id
LEFT JOIN otp_material_received mr ON mr.order_id = o.id
LEFT JOIN otp_senior_approval sa   ON sa.order_id = o.id;
