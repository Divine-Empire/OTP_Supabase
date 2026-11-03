-- =====================================================================
-- 86_order_trace_search.sql
--
-- Global search by Order No. / Quotation No.: for each matching order, which stage(s)
-- have a pending wave right now and what was completed last, per order and per wave.
-- One read-only function, no new table, no trigger, no cache: every call reads the live
-- tables, so the answer is always current.
--
--   otp_norm_key(text)       lower-case, letters and digits only ("DO-5412", "do 5412" and
--                            "DO5412" all become "do5412"); IMMUTABLE so it can be indexed.
--   trigram indexes          on that key for order_no and quotation_number, so "5412" (contains)
--                            and "NBD-26-27-12" (prefix) are index lookups, not table scans.
--   otp_order_trace(...)     Order Acceptable .. Client Confirmation only.
--
-- "Pending" is exactly the rule each stage's pending view / the sidebar count uses
-- (otp_pending_counts, Database/72), so the search can never disagree with the sidebar.
-- Every stage table already has an index on order_id.
--
-- Access: p_restricted / p_crm_names / p_location apply lib/access.ts's rule inside the query
-- (an order with no CRM / no location is visible to everyone), so a restricted user neither
-- sees nor spends result slots on orders they cannot open.
-- Safe to re-run.
-- =====================================================================

CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA extensions;

CREATE OR REPLACE FUNCTION public.otp_norm_key(t text)
RETURNS text
LANGUAGE sql IMMUTABLE PARALLEL SAFE
AS $$ SELECT regexp_replace(lower(coalesce(t, '')), '[^a-z0-9]', '', 'g') $$;

CREATE INDEX IF NOT EXISTS idx_otp_orders_order_no_trgm
  ON public.otp_orders USING gin (public.otp_norm_key(order_no) extensions.gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_otp_orders_quotation_trgm
  ON public.otp_orders USING gin (public.otp_norm_key(quotation_number) extensions.gin_trgm_ops);

CREATE OR REPLACE FUNCTION public.otp_order_trace(
  p_query       text,
  p_restricted  boolean DEFAULT false,
  p_crm_names   text[]  DEFAULT NULL,
  p_location    text    DEFAULT NULL,
  p_limit       integer DEFAULT 10
) RETURNS jsonb
LANGUAGE sql STABLE
AS $$
WITH nq AS (SELECT public.otp_norm_key(p_query) AS k),
m AS (
  SELECT o.id, o.order_no, o.quotation_number, o.company_name, o.crm_name, o.order_location,
         o.order_acceptable_planned, o.created_at,
         CASE WHEN public.otp_norm_key(o.order_no) = nq.k OR public.otp_norm_key(o.quotation_number) = nq.k THEN 0
              WHEN public.otp_norm_key(o.order_no) LIKE nq.k || '%' OR public.otp_norm_key(o.quotation_number) LIKE nq.k || '%' THEN 1
              ELSE 2 END AS rnk
  FROM public.otp_orders o, nq
  WHERE length(nq.k) >= 3
    AND (public.otp_norm_key(o.order_no) LIKE '%' || nq.k || '%' OR public.otp_norm_key(o.quotation_number) LIKE '%' || nq.k || '%')
    AND (NOT p_restricted OR (
          (coalesce(o.crm_name, '') = '' OR o.crm_name = ANY (coalesce(p_crm_names, '{}'::text[])))
      AND (coalesce(p_location, '') = '' OR coalesce(o.order_location, '') = '' OR o.order_location = p_location)))
  ORDER BY rnk, o.created_at DESC
  LIMIT greatest(1, least(coalesce(p_limit, 10), 25))
),
-- One row per stage event: pending (planned set, nothing done yet) or done.
-- wave_id is the Pre-Invoice queue row from Pre-Invoice onwards; earlier stages are order-level (NULL).
ev AS (
  -- 1. Order Acceptable
  SELECT m.id AS order_id, NULL::uuid AS wave_id, 1 AS seq, 'order_acceptable' AS stage_key, 'Order Acceptable' AS stage_label,
         'pending' AS state, m.order_acceptable_planned AS planned_at, m.created_at AS at, NULL::text AS actor
  FROM m
  WHERE m.order_acceptable_planned IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM public.otp_orders_acceptable oa WHERE oa.order_id = m.id)
  UNION ALL
  SELECT m.id, NULL, 1, 'order_acceptable', 'Order Acceptable', 'done', NULL, oa.created_at, oa.processed_by
  FROM m JOIN public.otp_orders_acceptable oa ON oa.order_id = m.id
  UNION ALL
  -- 2. Pro-Forma Invoice
  SELECT m.id, NULL, 2, 'proforma_invoice', 'Pro-Forma Invoice', 'pending', oa.proforma_invoice_planned, oa.created_at, NULL
  FROM m JOIN public.otp_orders_acceptable oa ON oa.order_id = m.id
  WHERE oa.proforma_invoice_planned IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM public.otp_proforma_invoice pi WHERE pi.order_id = m.id)
  UNION ALL
  SELECT m.id, NULL, 2, 'proforma_invoice', 'Pro-Forma Invoice', 'done', NULL, pi.created_at, pi.created_by
  FROM m JOIN public.otp_proforma_invoice pi ON pi.order_id = m.id
  UNION ALL
  -- 3. Delivery Note
  SELECT m.id, NULL, 3, 'delivery_note', 'Delivery Note', 'pending', oa.debit_note_planned, oa.created_at, NULL
  FROM m JOIN public.otp_orders_acceptable oa ON oa.order_id = m.id
  WHERE oa.debit_note_planned IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM public.otp_debit_note dn WHERE dn.order_id = m.id)
  UNION ALL
  SELECT m.id, NULL, 3, 'delivery_note', 'Delivery Note', 'done', NULL, dn.created_at, dn.created_by
  FROM m JOIN public.otp_debit_note dn ON dn.order_id = m.id
  UNION ALL
  -- 4. Packing List: first check pending, or a shortage waiting to be re-checked (sidebar rule)
  SELECT m.id, NULL, 4, 'packing_list', 'Packing List', 'pending', oa.check_inventory_planned, oa.created_at, NULL
  FROM m JOIN public.otp_orders_acceptable oa ON oa.order_id = m.id
  WHERE oa.check_inventory_planned IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM public.otp_check_inventory ci WHERE ci.order_id = m.id)
  UNION ALL
  SELECT m.id, NULL, 4, 'packing_list', 'Packing List (shortage re-check)', 'pending', NULL, min(s.created_at), NULL
  FROM m JOIN public.otp_check_inventory_shortage s ON s.order_id = m.id AND s.status = 'pending'
  WHERE NOT EXISTS (
    SELECT 1 FROM public.otp_orders_acceptable oa2
    WHERE oa2.order_id = m.id AND oa2.check_inventory_planned IS NOT NULL
      AND NOT EXISTS (SELECT 1 FROM public.otp_check_inventory ci2 WHERE ci2.order_id = m.id))
  GROUP BY m.id
  UNION ALL
  SELECT m.id, NULL, 4, 'packing_list', 'Packing List', 'done', NULL, ci.created_at, ci.created_by
  FROM m JOIN public.otp_check_inventory ci ON ci.order_id = m.id
  UNION ALL
  -- 5. Indent Creation (Pending tab, then the Material Received tab, then done)
  SELECT m.id, NULL, 5, 'indent_creation', 'Indent Creation', 'pending', NULL, ic.created_at, NULL
  FROM m JOIN public.otp_indent_creation ic ON ic.order_id = m.id
  WHERE ic.indent_created_at IS NULL AND ic.material_received IS NULL
  UNION ALL
  SELECT m.id, NULL, 5, 'indent_creation', 'Indent Creation (Material Received)', 'pending', NULL, ic.indent_created_at, NULL
  FROM m JOIN public.otp_indent_creation ic ON ic.order_id = m.id
  WHERE ic.indent_created_at IS NOT NULL AND ic.material_received IS NULL
  UNION ALL
  SELECT m.id, NULL, 5, 'indent_creation', 'Indent Creation', 'done', NULL, coalesce(ic.material_received_at, ic.created_at), ic.material_received_by
  FROM m JOIN public.otp_indent_creation ic ON ic.order_id = m.id
  WHERE ic.material_received IS NOT NULL
  UNION ALL
  -- 6. Pre-Invoice (one row per wave)
  SELECT m.id, q.id, 6, 'pre_invoice', 'Pre-Invoice', 'pending', NULL, q.created_at, NULL
  FROM m JOIN public.otp_pre_invoice_queue q ON q.order_id = m.id
  WHERE q.status = 'pending'
  UNION ALL
  SELECT m.id, q.id, 6, 'pre_invoice', 'Pre-Invoice', 'done', NULL, coalesce(q.invoiced_at, q.created_at), q.created_by
  FROM m JOIN public.otp_pre_invoice_queue q ON q.order_id = m.id
  WHERE q.status = 'invoiced'
  UNION ALL
  -- 7. Delivery Note (Inv.)
  SELECT m.id, q.id, 7, 'delivery_note_for_invoice', 'Delivery Note (Inv.)', 'pending', q.debit_note_planned, q.invoiced_at, NULL
  FROM m JOIN public.otp_pre_invoice_queue q ON q.order_id = m.id
  WHERE q.debit_note_planned IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM public.otp_debit_note_for_invoice d WHERE d.pre_invoice_queue_id = q.id)
  UNION ALL
  SELECT m.id, d.pre_invoice_queue_id, 7, 'delivery_note_for_invoice', 'Delivery Note (Inv.)', 'done', NULL, d.created_at, d.created_by
  FROM m JOIN public.otp_debit_note_for_invoice d ON d.order_id = m.id
  UNION ALL
  -- 8. Make Invoice
  SELECT m.id, q.id, 8, 'make_invoice', 'Make Invoice', 'pending', q.make_invoice_planned, q.invoiced_at, NULL
  FROM m JOIN public.otp_pre_invoice_queue q ON q.order_id = m.id
  WHERE q.make_invoice_planned IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM public.otp_make_invoice mi WHERE mi.pre_invoice_queue_id = q.id)
  UNION ALL
  SELECT m.id, mi.pre_invoice_queue_id, 8, 'make_invoice', 'Make Invoice', 'done', NULL, mi.created_at, mi.created_by
  FROM m JOIN public.otp_make_invoice mi ON mi.order_id = m.id
  UNION ALL
  -- 9. Calibration Certificate (runs in parallel with Packaging and Dispatch)
  SELECT m.id, mi.pre_invoice_queue_id, 9, 'calibration', 'Calibration Certificate', 'pending', mi.calibration_planned, mi.created_at, NULL
  FROM m JOIN public.otp_make_invoice mi ON mi.order_id = m.id
  WHERE mi.calibration_planned IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM public.otp_calibration_certificate cc WHERE cc.make_invoice_id = mi.id)
  UNION ALL
  SELECT m.id, mi.pre_invoice_queue_id, 9, 'calibration', 'Calibration Certificate', 'done', NULL, cc.created_at, cc.created_by
  FROM m JOIN public.otp_make_invoice mi ON mi.order_id = m.id
  JOIN public.otp_calibration_certificate cc ON cc.make_invoice_id = mi.id
  UNION ALL
  -- 10. Packaging and Dispatch (a saved draft is still pending)
  SELECT m.id, mi.pre_invoice_queue_id, 10, 'packaging_transport', 'Packaging and Dispatch', 'pending', mi.packaging_transport_planned, mi.created_at, NULL
  FROM m JOIN public.otp_make_invoice mi ON mi.order_id = m.id
  WHERE mi.packaging_transport_planned IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM public.otp_packaging_transport pt WHERE pt.make_invoice_id = mi.id AND pt.status = 'submitted')
  UNION ALL
  SELECT m.id, mi.pre_invoice_queue_id, 10, 'packaging_transport', 'Packaging and Dispatch', 'done', NULL, coalesce(pt.submitted_at, pt.created_at), pt.created_by
  FROM m JOIN public.otp_make_invoice mi ON mi.order_id = m.id
  JOIN public.otp_packaging_transport pt ON pt.make_invoice_id = mi.id AND pt.status = 'submitted'
  UNION ALL
  -- 11. Client Confirmation
  SELECT m.id, mi.pre_invoice_queue_id, 11, 'client_confirmation', 'Client Confirmation', 'pending', pt.client_confirmation_planned, pt.created_at, NULL
  FROM m JOIN public.otp_packaging_transport pt ON pt.order_id = m.id
  JOIN public.otp_make_invoice mi ON mi.id = pt.make_invoice_id
  WHERE pt.client_confirmation_planned IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM public.otp_client_confirmation c WHERE c.packaging_transport_id = pt.id)
  UNION ALL
  SELECT m.id, mi.pre_invoice_queue_id, 11, 'client_confirmation', 'Client Confirmation', 'done', NULL, c.created_at, c.created_by
  FROM m JOIN public.otp_client_confirmation c ON c.order_id = m.id
  JOIN public.otp_packaging_transport pt ON pt.id = c.packaging_transport_id
  JOIN public.otp_make_invoice mi ON mi.id = pt.make_invoice_id
),
pend AS (
  SELECT order_id, wave_id, seq, stage_key, stage_label,
         min(planned_at) AS planned_at, min(at) AS since, count(*) AS n
  FROM ev WHERE state = 'pending'
  GROUP BY order_id, wave_id, seq, stage_key, stage_label
),
done_last AS (
  SELECT DISTINCT ON (order_id) order_id, wave_id, seq, stage_key, stage_label, at, actor
  FROM ev WHERE state = 'done'
  ORDER BY order_id, at DESC NULLS LAST, seq DESC
),
wave_done_last AS (
  SELECT DISTINCT ON (order_id, wave_id) order_id, wave_id, seq, stage_key, stage_label, at, actor
  FROM ev WHERE state = 'done' AND wave_id IS NOT NULL
  ORDER BY order_id, wave_id, at DESC NULLS LAST, seq DESC
),
waves AS (
  SELECT order_id, wave_id, min(at) AS first_at
  FROM ev WHERE wave_id IS NOT NULL
  GROUP BY order_id, wave_id
),
inv AS (
  SELECT mi.pre_invoice_queue_id AS wave_id, mi.invoice_number
  FROM public.otp_make_invoice mi
  WHERE mi.order_id IN (SELECT id FROM m)
)
SELECT coalesce(jsonb_agg(
  jsonb_build_object(
    'orderId', m.id,
    'orderNo', m.order_no,
    'quotationNumber', m.quotation_number,
    'companyName', m.company_name,
    'crmName', m.crm_name,
    'orderLocation', m.order_location,
    'cancelled', EXISTS (SELECT 1 FROM public.otp_order_cancel oc WHERE oc.order_id = m.id),
    'cancelledAt', (SELECT max(oc.cancelled_at) FROM public.otp_order_cancel oc WHERE oc.order_id = m.id),
    'pending', coalesce((
      SELECT jsonb_agg(jsonb_build_object(
               'stageKey', p.stage_key, 'stageLabel', p.stage_label, 'waveId', p.wave_id,
               'invoiceNumber', i.invoice_number, 'plannedAt', p.planned_at,
               'overdue', coalesce(p.planned_at < now(), false), 'since', p.since, 'count', p.n)
             ORDER BY p.seq, p.since)
      FROM pend p LEFT JOIN inv i ON i.wave_id = p.wave_id
      WHERE p.order_id = m.id), '[]'::jsonb),
    'lastCompleted', (
      SELECT jsonb_build_object('stageKey', d.stage_key, 'stageLabel', d.stage_label, 'at', d.at, 'by', d.actor,
                                'waveId', d.wave_id, 'invoiceNumber', i.invoice_number)
      FROM done_last d LEFT JOIN inv i ON i.wave_id = d.wave_id
      WHERE d.order_id = m.id),
    'waves', coalesce((
      SELECT jsonb_agg(jsonb_build_object(
               'waveId', w.wave_id,
               'invoiceNumber', (SELECT i.invoice_number FROM inv i WHERE i.wave_id = w.wave_id),
               'pending', coalesce((
                 SELECT jsonb_agg(jsonb_build_object('stageKey', p.stage_key, 'stageLabel', p.stage_label,
                                                     'plannedAt', p.planned_at, 'overdue', coalesce(p.planned_at < now(), false))
                                  ORDER BY p.seq)
                 FROM pend p WHERE p.order_id = w.order_id AND p.wave_id = w.wave_id), '[]'::jsonb),
               'lastCompleted', (
                 SELECT jsonb_build_object('stageKey', d.stage_key, 'stageLabel', d.stage_label, 'at', d.at, 'by', d.actor)
                 FROM wave_done_last d WHERE d.order_id = w.order_id AND d.wave_id = w.wave_id),
               'complete', NOT EXISTS (SELECT 1 FROM pend p WHERE p.order_id = w.order_id AND p.wave_id = w.wave_id)
                           AND EXISTS (SELECT 1 FROM ev e WHERE e.order_id = w.order_id AND e.wave_id = w.wave_id
                                       AND e.state = 'done' AND e.seq = 11)
             ) ORDER BY w.first_at)
      FROM waves w WHERE w.order_id = m.id), '[]'::jsonb)
  ) ORDER BY m.rnk, m.created_at DESC
), '[]'::jsonb)
FROM m;
$$;

REVOKE ALL ON FUNCTION public.otp_order_trace(text, boolean, text[], text, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.otp_order_trace(text, boolean, text[], text, integer) TO service_role;
