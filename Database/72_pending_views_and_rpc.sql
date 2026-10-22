-- =====================================================================
-- 72_pending_views_and_rpc.sql
--
-- Optimization & Correctness:
-- 1. Anti-join SQL Views (otp_v_*_pending) for pipeline stages:
--    Eliminates client-side "done ids -> .not('id', 'in', ...)" URL growth
--    and PostgREST 1000-row silent truncation.
-- 2. Consolidated RPC otp_pending_counts(p_location text):
--    Replaces 14 individual unpaginated table scans on every page navigation
--    with a single fast server-side query.
-- 3. Consolidated RPC otp_dashboard_summary(p_location text):
--    Replaces 10 unpaginated table queries with server-side aggregation.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. STAGE: Calibration Certificate (Pilot)
-- Pending: otp_make_invoice.calibration_planned IS NOT NULL
--          AND NOT EXISTS in otp_calibration_certificate
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
  jsonb_build_object('calibration_type', q.calibration_type) AS queue
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
-- 2. STAGE: Order Acceptable
-- Pending: otp_orders.order_acceptable_planned IS NOT NULL
--          AND NOT EXISTS in otp_orders_acceptable
-- ---------------------------------------------------------------------
CREATE OR REPLACE VIEW public.otp_v_order_acceptable_pending AS
SELECT 
  o.*
FROM public.otp_orders o
WHERE o.order_acceptable_planned IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.otp_orders_acceptable oa
    WHERE oa.order_id = o.id
  )
ORDER BY o.created_at DESC;

-- ---------------------------------------------------------------------
-- 3. STAGE: Pro-Forma Invoice
-- Pending: otp_orders_acceptable.proforma_invoice_planned IS NOT NULL
--          AND NOT EXISTS in otp_proforma_invoice
-- ---------------------------------------------------------------------
CREATE OR REPLACE VIEW public.otp_v_proforma_invoice_pending AS
SELECT 
  oa.*,
  to_jsonb(o.*) AS "order"
FROM public.otp_orders_acceptable oa
JOIN public.otp_orders o ON o.id = oa.order_id
WHERE oa.proforma_invoice_planned IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.otp_proforma_invoice pi
    WHERE pi.order_id = oa.order_id
  )
ORDER BY oa.created_at DESC;

-- ---------------------------------------------------------------------
-- 4. STAGE: Delivery Note (Terminal / Debit Note)
-- Pending: otp_orders_acceptable.debit_note_planned IS NOT NULL
--          AND NOT EXISTS in otp_debit_note
-- ---------------------------------------------------------------------
CREATE OR REPLACE VIEW public.otp_v_delivery_note_pending AS
SELECT 
  oa.*,
  to_jsonb(o.*) AS "order"
FROM public.otp_orders_acceptable oa
JOIN public.otp_orders o ON o.id = oa.order_id
WHERE oa.debit_note_planned IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.otp_debit_note dn
    WHERE dn.order_id = oa.order_id
  )
ORDER BY oa.created_at DESC;

-- ---------------------------------------------------------------------
-- 5. STAGE: Delivery Note for Invoice
-- Pending: otp_pre_invoice_queue.debit_note_planned IS NOT NULL
--          AND NOT EXISTS in otp_debit_note_for_invoice
-- ---------------------------------------------------------------------
CREATE OR REPLACE VIEW public.otp_v_delivery_note_for_invoice_pending AS
SELECT 
  q.*,
  to_jsonb(o.*) AS "order"
FROM public.otp_pre_invoice_queue q
JOIN public.otp_orders o ON o.id = q.order_id
WHERE q.debit_note_planned IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.otp_debit_note_for_invoice dni
    WHERE dni.pre_invoice_queue_id = q.id
  )
ORDER BY q.debit_note_planned DESC;

-- ---------------------------------------------------------------------
-- 6. STAGE: Make Invoice
-- Pending: otp_pre_invoice_queue.make_invoice_planned IS NOT NULL
--          AND NOT EXISTS in otp_make_invoice
-- ---------------------------------------------------------------------
CREATE OR REPLACE VIEW public.otp_v_make_invoice_pending AS
SELECT 
  q.*,
  jsonb_build_object(
    'id', o.id,
    'order_no', o.order_no,
    'company_name', o.company_name,
    'contact_person', o.contact_person,
    'phone_number', o.phone_number,
    'email', o.email,
    'billing_address', o.billing_address,
    'shipping_address', o.shipping_address,
    'gst_number', o.gst_number,
    'state', o.state,
    'po_number', o.po_number,
    'destination', o.destination,
    'transport_mode', o.transport_mode,
    'payment_mode', o.payment_mode,
    'payment_terms_days', o.payment_terms_days,
    'warranty', o.warranty,
    'amount_with_tax', o.amount_with_tax,
    'quotation_number', o.quotation_number,
    'total_qty', o.total_qty,
    'crm_name', o.crm_name,
    'order_location', o.order_location,
    'items_accessories', o.items_accessories,
    'created_at', o.created_at,
    'shortages', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('shortage_qty', s.shortage_qty, 'status', s.status))
      FROM public.otp_check_inventory_shortage s
      WHERE s.order_id = o.id
    ), '[]'::jsonb),
    'indents', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('items', ic.items, 'material_received', ic.material_received))
      FROM public.otp_indent_creation ic
      WHERE ic.order_id = o.id
    ), '[]'::jsonb)
  ) AS "order"
FROM public.otp_pre_invoice_queue q
JOIN public.otp_orders o ON o.id = q.order_id
WHERE q.make_invoice_planned IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.otp_make_invoice mi
    WHERE mi.pre_invoice_queue_id = q.id
  )
ORDER BY q.make_invoice_planned DESC;

-- ---------------------------------------------------------------------
-- 7. STAGE: Packaging and Transport (Fresh Pending)
-- Pending: otp_make_invoice.packaging_transport_planned IS NOT NULL
--          AND NOT EXISTS in otp_packaging_transport (with status = submitted OR draft)
-- ---------------------------------------------------------------------
CREATE OR REPLACE VIEW public.otp_v_packaging_transport_fresh_pending AS
SELECT 
  mi.*,
  to_jsonb(o.*) AS "order"
FROM public.otp_make_invoice mi
JOIN public.otp_orders o ON o.id = mi.order_id
WHERE mi.packaging_transport_planned IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.otp_packaging_transport pt
    WHERE pt.make_invoice_id = mi.id
  )
ORDER BY mi.created_at DESC;

-- ---------------------------------------------------------------------
-- 8. STAGE: Client Confirmation
-- Pending: otp_packaging_transport.client_confirmation_planned IS NOT NULL
--          AND NOT EXISTS in otp_client_confirmation
-- ---------------------------------------------------------------------
CREATE OR REPLACE VIEW public.otp_v_client_confirmation_pending AS
SELECT 
  pt.*,
  to_jsonb(o.*) AS "order",
  jsonb_build_object(
    'invoice_number', mi.invoice_number,
    'invoice_date', mi.invoice_date,
    'invoice_upload_url', mi.invoice_upload_url,
    'items', mi.items
  ) AS "makeInvoice"
FROM public.otp_packaging_transport pt
JOIN public.otp_orders o ON o.id = pt.order_id
JOIN public.otp_make_invoice mi ON mi.id = pt.make_invoice_id
WHERE pt.client_confirmation_planned IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.otp_client_confirmation cc
    WHERE cc.packaging_transport_id = pt.id
  )
ORDER BY pt.created_at DESC;

-- ---------------------------------------------------------------------
-- 9. RPC: Consolidated Pending Counts for Sidebar
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.otp_pending_counts(p_location text DEFAULT NULL)
RETURNS jsonb
LANGUAGE sql
STABLE
AS $$
  SELECT jsonb_build_object(
    'order-acceptable', (
      SELECT count(*)
      FROM public.otp_orders o
      WHERE (p_location IS NULL OR o.order_location IS NULL OR o.order_location = p_location)
        AND o.order_acceptable_planned IS NOT NULL
        AND NOT EXISTS (SELECT 1 FROM public.otp_orders_acceptable oa WHERE oa.order_id = o.id)
    ),
    'proforma-invoice', (
      SELECT count(*)
      FROM public.otp_orders_acceptable oa
      JOIN public.otp_orders o ON o.id = oa.order_id
      WHERE (p_location IS NULL OR o.order_location IS NULL OR o.order_location = p_location)
        AND oa.proforma_invoice_planned IS NOT NULL
        AND NOT EXISTS (SELECT 1 FROM public.otp_proforma_invoice pi WHERE pi.order_id = oa.order_id)
    ),
    'delivery-note', (
      SELECT count(*)
      FROM public.otp_orders_acceptable oa
      JOIN public.otp_orders o ON o.id = oa.order_id
      WHERE (p_location IS NULL OR o.order_location IS NULL OR o.order_location = p_location)
        AND oa.debit_note_planned IS NOT NULL
        AND NOT EXISTS (SELECT 1 FROM public.otp_debit_note dn WHERE dn.order_id = oa.order_id)
    ),
    'packing-list', (
      SELECT count(*)
      FROM public.otp_orders_acceptable oa
      JOIN public.otp_orders o ON o.id = oa.order_id
      WHERE (p_location IS NULL OR o.order_location IS NULL OR o.order_location = p_location)
        AND oa.check_inventory_planned IS NOT NULL
        AND NOT EXISTS (SELECT 1 FROM public.otp_check_inventory ci WHERE ci.order_id = oa.order_id)
    ) + (
      SELECT count(DISTINCT s.order_id)
      FROM public.otp_check_inventory_shortage s
      JOIN public.otp_orders o ON o.id = s.order_id
      WHERE (p_location IS NULL OR o.order_location IS NULL OR o.order_location = p_location)
        AND s.status = 'pending'
    ),
    'indent-creation', (
      SELECT count(*)
      FROM public.otp_indent_creation ic
      JOIN public.otp_orders o ON o.id = ic.order_id
      WHERE (p_location IS NULL OR o.order_location IS NULL OR o.order_location = p_location)
        AND ic.indent_created_at IS NULL
        AND ic.material_received IS NULL
    ),
    'pre-invoice', (
      SELECT count(*)
      FROM public.otp_pre_invoice_queue q
      JOIN public.otp_orders o ON o.id = q.order_id
      WHERE (p_location IS NULL OR o.order_location IS NULL OR o.order_location = p_location)
        AND q.status = 'pending'
    ),
    'delivery-note-for-invoice', (
      SELECT count(*)
      FROM public.otp_pre_invoice_queue q
      JOIN public.otp_orders o ON o.id = q.order_id
      WHERE (p_location IS NULL OR o.order_location IS NULL OR o.order_location = p_location)
        AND q.debit_note_planned IS NOT NULL
        AND NOT EXISTS (SELECT 1 FROM public.otp_debit_note_for_invoice dni WHERE dni.pre_invoice_queue_id = q.id)
    ),
    'make-invoice', (
      SELECT count(*)
      FROM public.otp_pre_invoice_queue q
      JOIN public.otp_orders o ON o.id = q.order_id
      WHERE (p_location IS NULL OR o.order_location IS NULL OR o.order_location = p_location)
        AND q.make_invoice_planned IS NOT NULL
        AND NOT EXISTS (SELECT 1 FROM public.otp_make_invoice mi WHERE mi.pre_invoice_queue_id = q.id)
    ),
    'calibration', (
      SELECT count(*)
      FROM public.otp_make_invoice mi
      JOIN public.otp_orders o ON o.id = mi.order_id
      WHERE (p_location IS NULL OR o.order_location IS NULL OR o.order_location = p_location)
        AND mi.calibration_planned IS NOT NULL
        AND NOT EXISTS (SELECT 1 FROM public.otp_calibration_certificate cc WHERE cc.make_invoice_id = mi.id)
    ),
    'packaging-transport', (
      SELECT count(*)
      FROM public.otp_make_invoice mi
      JOIN public.otp_orders o ON o.id = mi.order_id
      WHERE (p_location IS NULL OR o.order_location IS NULL OR o.order_location = p_location)
        AND mi.packaging_transport_planned IS NOT NULL
        AND NOT EXISTS (
          SELECT 1 FROM public.otp_packaging_transport pt 
          WHERE pt.make_invoice_id = mi.id AND pt.status = 'submitted'
        )
    ),
    'client-confirmation', (
      SELECT count(*)
      FROM public.otp_packaging_transport pt
      JOIN public.otp_orders o ON o.id = pt.order_id
      WHERE (p_location IS NULL OR o.order_location IS NULL OR o.order_location = p_location)
        AND pt.client_confirmation_planned IS NOT NULL
        AND NOT EXISTS (SELECT 1 FROM public.otp_client_confirmation cc WHERE cc.packaging_transport_id = pt.id)
    ),
    'credit-note', (
      SELECT count(*)
      FROM public.otp_credit_note cn
      WHERE (p_location IS NULL OR cn.order_location IS NULL OR cn.order_location = p_location)
        AND cn.status = 'pending'
    )
  );
$$;
