-- =====================================================================
-- 71_delay_report_drop_stages.sql
--
-- The Delay Report no longer shows Pro-Forma Invoice, Delivery Note (Inv.)
-- and Calibration Certificate (see Database/70_delay_report_stage_durations.sql
-- for the rest of the logic, which is unchanged). Because those stages are
-- no longer visible, the chain is now measured only between the stages that
-- ARE shown, so the columns stay consistent with each other instead of
-- silently dropping the time of a hidden stage:
--
--   Order Acceptable        its own timestamp
--   Packing List            packing list  - order acceptable
--   Pre-Invoice             pre-invoice   - packing list
--   Make Invoice            make invoice  - pre-invoice
--   Packaging and Dispatch  packaging     - make invoice
--   Total Delay             packaging     - otp_orders.created_at
--
-- (Before this, Packing List was measured from Pro-Forma when the order had
-- one and Make Invoice from Delivery Note (Inv.); no processed order has
-- either today, so current numbers are unaffected.)
-- =====================================================================

DROP FUNCTION IF EXISTS public.otp_delay_report(date, date, text);

CREATE FUNCTION public.otp_delay_report(p_from date, p_to date, p_location text DEFAULT NULL)
RETURNS TABLE (
  order_id uuid,
  order_no text,
  company_name text,
  processed_at timestamptz,
  order_acceptable_at timestamptz,
  packing_list_duration bigint,
  pre_invoice_duration bigint,
  make_invoice_duration bigint,
  packaging_dispatch_duration bigint,
  total_duration bigint
)
LANGUAGE sql
STABLE
AS $$
  WITH last_wave AS (
    SELECT DISTINCT ON (pt.order_id) pt.order_id, pt.make_invoice_id, pt.submitted_at
      FROM public.otp_packaging_transport pt
     WHERE pt.status = 'submitted' AND pt.submitted_at IS NOT NULL
     ORDER BY pt.order_id, pt.submitted_at DESC, pt.id
  ),
  wave AS (
    SELECT lw.order_id, lw.submitted_at AS pt_t,
           mi.created_at AS mi_t, q.invoiced_at AS pi_t, q.source_id, q.source_stage
      FROM last_wave lw
      JOIN public.otp_make_invoice mi ON mi.id = lw.make_invoice_id
      JOIN public.otp_pre_invoice_queue q ON q.id = mi.pre_invoice_queue_id
     WHERE lw.submitted_at >= (p_from::timestamp AT TIME ZONE 'Asia/Kolkata')
       AND lw.submitted_at <  ((p_to + 1)::timestamp AT TIME ZONE 'Asia/Kolkata')
  ),
  stamps AS (
    SELECT w.*, o.order_no, o.company_name, o.created_at AS ord_t,
           (SELECT min(x.created_at) FROM public.otp_orders_acceptable x WHERE x.order_id = w.order_id) AS oa_t,
           COALESCE(
             (SELECT ci.created_at FROM public.otp_check_inventory ci
               WHERE ci.id = w.source_id AND w.source_stage IN ('packing_list', 'check_inventory')),
             (SELECT min(x.created_at) FROM public.otp_check_inventory x WHERE x.order_id = w.order_id)
           ) AS pl_t
      FROM wave w
      JOIN public.otp_orders o ON o.id = w.order_id
     WHERE p_location IS NULL OR o.order_location IS NULL OR o.order_location = p_location
  )
  SELECT s.order_id, s.order_no, s.company_name, s.pt_t, s.oa_t,
         public.otp_minutes_between(s.pl_t, s.oa_t),
         public.otp_minutes_between(s.pi_t, COALESCE(s.pl_t, s.oa_t)),
         public.otp_minutes_between(s.mi_t, COALESCE(s.pi_t, s.pl_t, s.oa_t)),
         public.otp_minutes_between(s.pt_t, s.mi_t),
         public.otp_minutes_between(s.pt_t, s.ord_t)
    FROM stamps s
   ORDER BY s.pt_t DESC, s.order_no
$$;
