-- 78: server-paged History view for Packing List (Check Inventory) (see 74/77).
-- Rows = every scan attempt (otp_check_inventory), with the order as JSON, flat
-- crm_name / order_location / search_text, and `is_editable`: the SQL twin of
-- isWaveEditable() in packing-list/route.ts (a wave is editable while nothing
-- downstream has been processed for it), so the "only editable" filter can run
-- before paging instead of on one page of rows:
--   * every linked pre-invoice queue row (source_id = this scan, or this scan is in
--     merged_source_ids) is 'pending', or an emptied 'cancelled' placeholder (no items)
--   * no linked indent has indent_created_at / material_received
--   * every linked shortage ledger row is still 'pending'
-- availability_status already comes from otp_check_inventory.* (the Availability filter).
-- Safe to re-run.
CREATE OR REPLACE VIEW public.otp_v_check_inventory_history AS
SELECT
  ci.*,
  to_jsonb(o.*) AS "order",
  NULLIF(o.crm_name, '')       AS crm_name,
  NULLIF(o.order_location, '') AS order_location,
  (
    NOT EXISTS (
      SELECT 1 FROM public.otp_pre_invoice_queue q
      WHERE (q.source_id = ci.id OR ci.id = ANY (q.merged_source_ids))
        AND NOT (q.status = 'pending' OR (q.status = 'cancelled' AND jsonb_array_length(COALESCE(q.items, '[]'::jsonb)) = 0))
    )
    AND NOT EXISTS (
      SELECT 1 FROM public.otp_indent_creation ic
      WHERE ic.check_inventory_id = ci.id AND (ic.indent_created_at IS NOT NULL OR ic.material_received IS NOT NULL)
    )
    AND NOT EXISTS (
      SELECT 1 FROM public.otp_check_inventory_shortage s
      WHERE s.check_inventory_id = ci.id AND s.status <> 'pending'
    )
  ) AS is_editable,
  lower(concat_ws(' ',
    ci.availability_status, ci.remark, ci.created_by, ci.warehouse_location, ci.customer_wants_material_as,
    o.order_no, o.company_name, o.quotation_number, o.crm_name, o.contact_person, o.phone_number, o.po_number
  )) AS search_text
FROM public.otp_check_inventory ci
LEFT JOIN public.otp_orders o ON o.id = ci.order_id;
