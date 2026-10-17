-- =====================================================================
-- 69_delay_report_function.sql
--
-- Dashboard "Delay Report": every order that has been processed through
-- Packaging and Dispatch (a SUBMITTED otp_packaging_transport row whose
-- updated_at falls in [p_from, p_to], days taken in IST), with the minutes
-- of delay each stage on the way (Order Acceptable -> Packaging and
-- Dispatch) added up per order.
--
-- A stage's delay is otp_*.delay_minutes (Database/67). Per order:
--   * Order Acceptable, Pro-Forma, Packing List: the order's own rows
--     (Packing List only its first scan carries a delay).
--   * Delivery Note (Inv.), Make Invoice, Calibration, Packaging and
--     Dispatch: summed over the order's waves that have been through
--     Packaging and Dispatch (a wave still waiting there isn't part of the
--     processed journey).
--   * Indent Creation and Pre-Invoice have no planned date, hence no delay:
--     they are not in the output at all.
-- A stage with no delay data (not applicable, or no planned date) is NULL,
-- so the UI can show "-"; total_delay treats NULL as 0.
--
-- p_location mirrors lib/access.ts: NULL = every location; otherwise orders
-- at that location plus orders with no location yet.
-- =====================================================================

CREATE OR REPLACE FUNCTION public.otp_delay_report(p_from date, p_to date, p_location text DEFAULT NULL)
RETURNS TABLE (
  order_id uuid,
  order_no text,
  company_name text,
  processed_at timestamptz,
  order_acceptable_delay bigint,
  proforma_invoice_delay bigint,
  packing_list_delay bigint,
  delivery_note_inv_delay bigint,
  make_invoice_delay bigint,
  calibration_delay bigint,
  packaging_dispatch_delay bigint,
  total_delay bigint
)
LANGUAGE sql
STABLE
AS $$
  WITH processed AS (
    SELECT pt.order_id, pt.make_invoice_id, pt.delay_minutes, pt.updated_at
      FROM public.otp_packaging_transport pt
     WHERE pt.status = 'submitted'
  ),
  in_range AS (
    SELECT DISTINCT p.order_id
      FROM processed p
     WHERE p.updated_at >= (p_from::timestamp AT TIME ZONE 'Asia/Kolkata')
       AND p.updated_at <  ((p_to + 1)::timestamp AT TIME ZONE 'Asia/Kolkata')
  ),
  per_order AS (
    SELECT o.id AS order_id, o.order_no, o.company_name,
           (SELECT max(p.updated_at) FROM processed p WHERE p.order_id = o.id) AS processed_at,
           (SELECT sum(x.delay_minutes) FROM public.otp_orders_acceptable x WHERE x.order_id = o.id) AS oa,
           (SELECT sum(x.delay_minutes) FROM public.otp_proforma_invoice x WHERE x.order_id = o.id) AS pi,
           (SELECT sum(x.delay_minutes) FROM public.otp_check_inventory x WHERE x.order_id = o.id) AS pl,
           (SELECT sum(d.delay_minutes)
              FROM processed p
              JOIN public.otp_make_invoice mi ON mi.id = p.make_invoice_id
              JOIN public.otp_debit_note_for_invoice d ON d.pre_invoice_queue_id = mi.pre_invoice_queue_id
             WHERE p.order_id = o.id) AS dni,
           (SELECT sum(mi.delay_minutes)
              FROM processed p
              JOIN public.otp_make_invoice mi ON mi.id = p.make_invoice_id
             WHERE p.order_id = o.id) AS mi,
           (SELECT sum(c.delay_minutes)
              FROM processed p
              JOIN public.otp_calibration_certificate c ON c.make_invoice_id = p.make_invoice_id
             WHERE p.order_id = o.id) AS cal,
           (SELECT sum(p.delay_minutes) FROM processed p WHERE p.order_id = o.id) AS pt
      FROM public.otp_orders o
      JOIN in_range r ON r.order_id = o.id
     WHERE p_location IS NULL OR o.order_location IS NULL OR o.order_location = p_location
  )
  SELECT order_id, order_no, company_name, processed_at,
         oa, pi, pl, dni, mi, cal, pt,
         (COALESCE(oa, 0) + COALESCE(pi, 0) + COALESCE(pl, 0) + COALESCE(dni, 0)
            + COALESCE(mi, 0) + COALESCE(cal, 0) + COALESCE(pt, 0))::bigint AS total_delay
    FROM per_order
   ORDER BY processed_at DESC, order_no
$$;
