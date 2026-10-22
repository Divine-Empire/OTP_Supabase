-- =====================================================================
-- 79_dashboard_summary_rpc.sql
--
-- otp_dashboard_summary(p_location text): the Dashboard numbers in one
-- server-side query. Replaces app/api/otp-supabase/dashboard/route.ts
-- reading 10 tables row by row into Node (ten paged scans per page load).
--
-- Same result shape as the old route's `data` object. Rules:
--   * p_location scopes orders to that location plus orders with no location
--     (NULL or '') — the rule used by otp_pending_counts and lib/access.ts.
--   * Per-stage pending = otp_pending_counts() (same numbers as the sidebar
--     and each stage's Pending tab; the old JS counted a few stages differently).
--   * Months are bucketed in UTC (what the Node server did on Vercel).
-- Read-only; safe to re-run.
-- =====================================================================
CREATE OR REPLACE FUNCTION public.otp_dashboard_summary(p_location text DEFAULT NULL)
RETURNS jsonb
LANGUAGE sql
STABLE
AS $$
WITH o AS (
  SELECT id, order_no, company_name, payment_mode, amount_with_tax, created_at
  FROM public.otp_orders
  WHERE p_location IS NULL OR COALESCE(order_location, '') = '' OR order_location = p_location
),
mi AS (
  SELECT m.total_bill_amount FROM public.otp_make_invoice m WHERE m.order_id IN (SELECT id FROM o)
),
-- Per-stage pending comes from otp_pending_counts (Database/72) so the Dashboard
-- cards always equal the sidebar badges and each stage page's Pending tab.
c AS (SELECT public.otp_pending_counts(p_location) AS j),
stages AS (
  SELECT v.ord, v.key, v.label, (c.j ->> v.src)::bigint AS pending
  FROM c, (VALUES
    (1, 'order_acceptable',       'Order Acceptable',         'order-acceptable'),
    (2, 'proforma_invoice',       'Pro-Forma Invoice',        'proforma-invoice'),
    (3, 'debit_note',             'Delivery Note',            'delivery-note'),
    (4, 'check_inventory',        'Packing List',             'packing-list'),
    (5, 'indent_creation',        'Indent Creation',          'indent-creation'),
    (6, 'pre_invoice',            'Pre-Invoice',              'pre-invoice'),
    (7, 'debit_note_for_invoice', 'Delivery Note (Inv.)',     'delivery-note-for-invoice'),
    (8, 'make_invoice',           'Make Invoice',             'make-invoice'),
    (9, 'calibration',            'Calibration Certificate',  'calibration')
  ) AS v(ord, key, label, src)
),
months AS (
  SELECT date_trunc('month', timezone('UTC', now())) - (g || ' month')::interval AS m, g
  FROM generate_series(5, 0, -1) g
)
SELECT jsonb_build_object(
  'totalOrders', (SELECT count(*) FROM o),
  'ordersThisMonth', (SELECT count(*) FROM o
      WHERE created_at IS NOT NULL
        AND date_trunc('month', timezone('UTC', created_at)) = date_trunc('month', timezone('UTC', now()))),
  'totalOrderValue', (SELECT COALESCE(sum(amount_with_tax), 0) FROM o),
  'totalInvoicedRevenue', (SELECT COALESCE(sum(total_bill_amount), 0) FROM mi),
  'totalPending', (SELECT COALESCE(sum(pending), 0) FROM stages),
  'pipelineStages', (SELECT jsonb_agg(jsonb_build_object('key', key, 'label', label, 'pending', pending) ORDER BY ord) FROM stages),
  'paymentModeData', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('name', name, 'value', n) ORDER BY n DESC, name)
      FROM (SELECT COALESCE(NULLIF(payment_mode, ''), 'Unknown') AS name, count(*) AS n FROM o GROUP BY 1) t
    ), '[]'::jsonb),
  'monthlyTrend', (
      SELECT jsonb_agg(jsonb_build_object(
               'month', to_char(months.m, 'Mon'),
               'orders', (SELECT count(*) FROM o WHERE created_at IS NOT NULL
                            AND date_trunc('month', timezone('UTC', o.created_at)) = months.m)
             ) ORDER BY months.g DESC)
      FROM months),
  'topCustomers', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('name', name, 'orders', n, 'value', v) ORDER BY v DESC, name)
      FROM (SELECT COALESCE(NULLIF(company_name, ''), 'Unknown') AS name, count(*) AS n,
                   COALESCE(sum(amount_with_tax), 0) AS v
            FROM o GROUP BY 1 ORDER BY v DESC, name LIMIT 5) t
    ), '[]'::jsonb),
  'recentOrders', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
               'orderNo', order_no, 'companyName', company_name, 'paymentMode', payment_mode,
               'amount', COALESCE(amount_with_tax, 0), 'createdAt', created_at) ORDER BY created_at DESC NULLS LAST)
      FROM (SELECT * FROM o ORDER BY created_at DESC NULLS LAST LIMIT 10) r
    ), '[]'::jsonb)
);
$$;

GRANT EXECUTE ON FUNCTION public.otp_dashboard_summary(text) TO service_role;
