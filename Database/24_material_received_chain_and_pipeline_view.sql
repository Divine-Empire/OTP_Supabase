-- =====================================================================
-- 24_material_received_chain_and_pipeline_view.sql
--
-- MUST BE RUN AGAINST THE SAME PRODUCTION DATABASE as 17_/21_/22_/23_.
--
-- Material Received's own form is being changed to a scan+compare flow
-- (mirroring Check Inventory) instead of a single mutable "receive some
-- qty" edit. Each processing attempt now closes the current
-- otp_material_shortage row (status -> 'processed') and, if some qty is
-- still missing, forks a NEW row (status 'pending') carrying the
-- still-short qty forward — parent_shortage_id links the chain so the
-- full receiving history for an item stays auditable instead of being
-- overwritten in place. received_qty/remaining_qty on a row now describe
-- *that row's own* processing attempt, not a cumulative running total
-- across the whole chain.
--
-- Verified before writing this: every existing otp_material_shortage row
-- is still 'pending' (2 rows, 0 'partially_received'/'received'), so
-- tightening the status CHECK is safe with no data migration needed.
--
-- Also adds otp_v_order_pipeline_status — a VIEW, not a stored column,
-- so "is this order fully done yet" is always computed live from the
-- current otp_material_shortage/otp_pre_invoice_queue rows and can never
-- go stale the way a cached flag on otp_orders would once an order starts
-- producing multiple waves (some invoiced, some still pending).
-- =====================================================================

ALTER TABLE public.otp_material_shortage
  ADD COLUMN IF NOT EXISTS parent_shortage_id uuid REFERENCES public.otp_material_shortage(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_otp_material_shortage_parent ON public.otp_material_shortage (parent_shortage_id);

ALTER TABLE public.otp_material_shortage DROP CONSTRAINT IF EXISTS otp_material_shortage_status_check;
ALTER TABLE public.otp_material_shortage
  ADD CONSTRAINT otp_material_shortage_status_check CHECK (status IN ('pending', 'processed'));

CREATE OR REPLACE VIEW public.otp_v_order_pipeline_status AS
SELECT
  o.id AS order_id,
  o.order_no,
  COALESCE(ms.pending_shortage_items, 0) AS pending_shortage_items,
  COALESCE(pq.pending_pre_invoice_waves, 0) AS pending_pre_invoice_waves,
  COALESCE(pq.invoiced_pre_invoice_waves, 0) AS invoiced_pre_invoice_waves,
  (COALESCE(ms.pending_shortage_items, 0) = 0 AND COALESCE(pq.pending_pre_invoice_waves, 0) = 0) AS is_fully_resolved
FROM public.otp_orders o
LEFT JOIN (
  SELECT order_id, count(*) AS pending_shortage_items
  FROM public.otp_material_shortage
  WHERE status = 'pending'
  GROUP BY order_id
) ms ON ms.order_id = o.id
LEFT JOIN (
  SELECT
    order_id,
    count(*) FILTER (WHERE status = 'pending') AS pending_pre_invoice_waves,
    count(*) FILTER (WHERE status = 'invoiced') AS invoiced_pre_invoice_waves
  FROM public.otp_pre_invoice_queue
  GROUP BY order_id
) pq ON pq.order_id = o.id
WHERE ms.order_id IS NOT NULL OR pq.order_id IS NOT NULL;
