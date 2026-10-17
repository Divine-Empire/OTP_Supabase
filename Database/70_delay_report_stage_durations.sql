-- =====================================================================
-- 70_delay_report_stage_durations.sql
--
-- The dashboard Delay Report changes meaning: instead of "minutes late
-- against the planned date" (Database/67-69) it now shows how long each
-- stage took after the PREVIOUS stage of the same order:
--
--   Order Acceptable       its own timestamp (not a duration)
--   Pro-Forma Invoice      proforma  - order acceptable
--   Packing List           packing list - previous existing stage
--   Pre-Invoice            pre-invoice - previous existing stage
--   Delivery Note (Inv.)   delivery note (inv.) - previous existing stage
--   Make Invoice           make invoice - previous existing stage
--   Calibration Certificate calibration - make invoice      } parallel
--   Packaging and Dispatch  packaging  - make invoice       } branches
--   Total Delay            packaging - otp_orders.created_at
--
-- "Previous existing stage" skips stages the order never had (a non-PI
-- order has no Pro-Forma, most have no Delivery Note (Inv.)), so Packing
-- List is measured from Pro-Forma if there is one, else from Order
-- Acceptable. Calibration and Packaging both hang off Make Invoice, so both
-- are measured from it, never from each other.
--
-- Each stage's timestamp is its created_at, EXCEPT:
--   * Pre-Invoice: otp_pre_invoice_queue.invoiced_at (the row is created at
--     the Packing List scan; invoiced_at is when Pre-Invoice was processed).
--   * Packaging and Dispatch: the moment it was SUBMITTED. Its created_at is
--     the draft-save time (37 of 67 rows were saved as drafts ~62 h before
--     the real submit), so a new stable column otp_packaging_transport.
--     submitted_at is added: set by the existing trigger whenever status
--     becomes 'submitted' (INSERT as submitted, or draft -> submitted).
--
-- submitted_at backfill: updated_at (as repaired by Database/68), except the
-- 13 rows Database/65 stamped (2026-10-12 07:39-07:41 UTC) whose real submit
-- time is gone — those use created_at. updated_at triggers are switched off
-- for the backfill (the lesson of Database/67/68), and updated_at is not
-- touched.
--
-- One row per order. An order with several dispatched waves is represented
-- by its LAST dispatched wave (the order is fully out when its last wave
-- is): that wave's own scan / pre-invoice / make invoice / packaging, and
-- the order is in range when that last submit falls in [p_from, p_to]
-- (IST days). A duration is never negative (clamped to 0); a stage the order
-- never had is NULL (the UI shows "-").
--
-- The delay_minutes columns / triggers / daily job from Database/67 are left
-- as they were (planned-based lateness); this report just no longer uses
-- them.
-- =====================================================================

ALTER TABLE public.otp_packaging_transport ADD COLUMN IF NOT EXISTS submitted_at timestamptz;

CREATE OR REPLACE FUNCTION public.otp_trg_packaging_transport_set_delay() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  v_planned timestamptz;
BEGIN
  IF NEW.status = 'submitted' THEN
    IF TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'submitted' THEN
      SELECT mi.packaging_transport_planned INTO v_planned FROM public.otp_make_invoice mi WHERE mi.id = NEW.make_invoice_id;
      NEW.delay_minutes := public.otp_delay_minutes(v_planned, now());
      NEW.submitted_at := now();
    END IF;
  ELSE
    NEW.delay_minutes := NULL;
  END IF;
  RETURN NEW;
END $$;

ALTER TABLE public.otp_packaging_transport DISABLE TRIGGER otp_trg_packaging_transport_updated_at;

UPDATE public.otp_packaging_transport
   SET submitted_at = CASE
         WHEN updated_at >= '2026-10-12 07:39:00+00' AND updated_at < '2026-10-12 07:41:00+00' THEN created_at
         ELSE updated_at
       END
 WHERE status = 'submitted' AND submitted_at IS NULL;

ALTER TABLE public.otp_packaging_transport ENABLE TRIGGER otp_trg_packaging_transport_updated_at;

CREATE OR REPLACE FUNCTION public.otp_minutes_between(p_later timestamptz, p_earlier timestamptz)
RETURNS bigint
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN p_later IS NULL OR p_earlier IS NULL THEN NULL
    ELSE GREATEST(0, round(extract(epoch FROM (p_later - p_earlier)) / 60))::bigint
  END
$$;

DROP FUNCTION IF EXISTS public.otp_delay_report(date, date, text);

CREATE FUNCTION public.otp_delay_report(p_from date, p_to date, p_location text DEFAULT NULL)
RETURNS TABLE (
  order_id uuid,
  order_no text,
  company_name text,
  processed_at timestamptz,
  order_acceptable_at timestamptz,
  proforma_invoice_duration bigint,
  packing_list_duration bigint,
  pre_invoice_duration bigint,
  delivery_note_inv_duration bigint,
  make_invoice_duration bigint,
  calibration_duration bigint,
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
           mi.id AS mi_id, mi.created_at AS mi_t, mi.pre_invoice_queue_id,
           q.invoiced_at AS pi_t, q.source_id, q.source_stage
      FROM last_wave lw
      JOIN public.otp_make_invoice mi ON mi.id = lw.make_invoice_id
      JOIN public.otp_pre_invoice_queue q ON q.id = mi.pre_invoice_queue_id
     WHERE lw.submitted_at >= (p_from::timestamp AT TIME ZONE 'Asia/Kolkata')
       AND lw.submitted_at <  ((p_to + 1)::timestamp AT TIME ZONE 'Asia/Kolkata')
  ),
  stamps AS (
    SELECT w.*, o.order_no, o.company_name, o.created_at AS ord_t,
           (SELECT min(x.created_at) FROM public.otp_orders_acceptable x WHERE x.order_id = w.order_id) AS oa_t,
           (SELECT min(x.created_at) FROM public.otp_proforma_invoice x WHERE x.order_id = w.order_id) AS pf_t,
           COALESCE(
             (SELECT ci.created_at FROM public.otp_check_inventory ci
               WHERE ci.id = w.source_id AND w.source_stage IN ('packing_list', 'check_inventory')),
             (SELECT min(x.created_at) FROM public.otp_check_inventory x WHERE x.order_id = w.order_id)
           ) AS pl_t,
           (SELECT min(d.created_at) FROM public.otp_debit_note_for_invoice d WHERE d.pre_invoice_queue_id = w.pre_invoice_queue_id) AS dni_t,
           (SELECT min(c.created_at) FROM public.otp_calibration_certificate c WHERE c.make_invoice_id = w.mi_id) AS cal_t
      FROM wave w
      JOIN public.otp_orders o ON o.id = w.order_id
     WHERE p_location IS NULL OR o.order_location IS NULL OR o.order_location = p_location
  )
  SELECT s.order_id, s.order_no, s.company_name, s.pt_t, s.oa_t,
         public.otp_minutes_between(s.pf_t,  s.oa_t),
         public.otp_minutes_between(s.pl_t,  COALESCE(s.pf_t, s.oa_t)),
         public.otp_minutes_between(s.pi_t,  COALESCE(s.pl_t, s.pf_t, s.oa_t)),
         public.otp_minutes_between(s.dni_t, COALESCE(s.pi_t, s.pl_t, s.pf_t, s.oa_t)),
         public.otp_minutes_between(s.mi_t,  COALESCE(s.dni_t, s.pi_t, s.pl_t, s.pf_t, s.oa_t)),
         public.otp_minutes_between(s.cal_t, s.mi_t),
         public.otp_minutes_between(s.pt_t,  s.mi_t),
         public.otp_minutes_between(s.pt_t,  s.ord_t)
    FROM stamps s
   ORDER BY s.pt_t DESC, s.order_no
$$;
