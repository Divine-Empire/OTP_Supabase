-- =====================================================================
-- 68_fix_updated_at_after_delay_backfill.sql
--
-- Database/67's backfill UPDATEs fired each table's BEFORE UPDATE
-- otp_trg_set_updated_at trigger, which stamped updated_at = now() on every
-- backfilled row (667 rows across 7 tables, ALL with the identical
-- transaction timestamp 2026-10-17 10:22:06.113366+00). updated_at is what
-- Packaging and Dispatch History shows as "Actual" and what Pro-Forma sorts
-- by, so this repairs it and makes it impossible to repeat:
--
-- 1. otp_trg_set_updated_at() no longer moves updated_at when the ONLY
--    thing that changed on the row is delay_minutes (also covers the daily
--    otp_recalc_delays() job). Every other UPDATE behaves exactly as before.
--    The function is shared by 18 tables; tables without a delay_minutes
--    column are unaffected (to_jsonb(...) -> 'delay_minutes' is just NULL on
--    both sides).
--
-- 2. Restore the overwritten timestamps (triggers are disabled for the
--    repair so the trigger doesn't re-stamp them):
--      * Tables where updated_at == created_at in practice (orders
--        acceptable, pro-forma, packing list, delivery note (inv.), make
--        invoice, calibration): updated_at := created_at. KNOWN LOSS: the
--        handful of rows that had been genuinely edited after creation
--        (2 orders-acceptable + 3 packing-list rows, per a pre-backfill
--        count) get created_at instead of their real edit time.
--      * otp_packaging_transport: the original submit time is recoverable
--        from the delay just computed from it — actual = planned +
--        delay_minutes (exact to the minute; delay_minutes was computed
--        from this very updated_at, rounded to whole minutes). A row with
--        delay 0 only tells us "on or before planned", so it gets
--        LEAST(created_at, planned).
--      * The 13 rows Database/65 stamped (2026-10-12 07:40 UTC) were
--        excluded from the backfill and are untouched here.
-- =====================================================================

CREATE OR REPLACE FUNCTION public.otp_trg_set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF (to_jsonb(NEW) -> 'delay_minutes') IS DISTINCT FROM (to_jsonb(OLD) -> 'delay_minutes')
       AND (to_jsonb(NEW) - 'delay_minutes' - 'updated_at') = (to_jsonb(OLD) - 'delay_minutes' - 'updated_at')
    THEN
      NEW.updated_at := OLD.updated_at;
      RETURN NEW;
    END IF;
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$function$;

ALTER TABLE public.otp_orders_acceptable       DISABLE TRIGGER otp_trg_orders_acceptable_updated_at;
ALTER TABLE public.otp_proforma_invoice        DISABLE TRIGGER otp_trg_proforma_invoice_updated_at;
ALTER TABLE public.otp_check_inventory         DISABLE TRIGGER otp_trg_check_inventory_updated_at;
ALTER TABLE public.otp_debit_note_for_invoice  DISABLE TRIGGER otp_trg_debit_note_for_invoice_updated_at;
ALTER TABLE public.otp_make_invoice            DISABLE TRIGGER otp_trg_make_invoice_updated_at;
ALTER TABLE public.otp_calibration_certificate DISABLE TRIGGER otp_trg_calibration_certificate_updated_at;
ALTER TABLE public.otp_packaging_transport     DISABLE TRIGGER otp_trg_packaging_transport_updated_at;

UPDATE public.otp_orders_acceptable       SET updated_at = created_at WHERE updated_at = '2026-10-17 10:22:06.113366+00';
UPDATE public.otp_proforma_invoice        SET updated_at = created_at WHERE updated_at = '2026-10-17 10:22:06.113366+00';
UPDATE public.otp_check_inventory         SET updated_at = created_at WHERE updated_at = '2026-10-17 10:22:06.113366+00';
UPDATE public.otp_debit_note_for_invoice  SET updated_at = created_at WHERE updated_at = '2026-10-17 10:22:06.113366+00';
UPDATE public.otp_make_invoice            SET updated_at = created_at WHERE updated_at = '2026-10-17 10:22:06.113366+00';
UPDATE public.otp_calibration_certificate SET updated_at = created_at WHERE updated_at = '2026-10-17 10:22:06.113366+00';

UPDATE public.otp_packaging_transport pt
   SET updated_at = CASE
         WHEN pt.delay_minutes > 0 THEN mi.packaging_transport_planned + pt.delay_minutes * interval '1 minute'
         ELSE LEAST(pt.created_at, mi.packaging_transport_planned)
       END
  FROM public.otp_make_invoice mi
 WHERE mi.id = pt.make_invoice_id
   AND pt.updated_at = '2026-10-17 10:22:06.113366+00';

ALTER TABLE public.otp_orders_acceptable       ENABLE TRIGGER otp_trg_orders_acceptable_updated_at;
ALTER TABLE public.otp_proforma_invoice        ENABLE TRIGGER otp_trg_proforma_invoice_updated_at;
ALTER TABLE public.otp_check_inventory         ENABLE TRIGGER otp_trg_check_inventory_updated_at;
ALTER TABLE public.otp_debit_note_for_invoice  ENABLE TRIGGER otp_trg_debit_note_for_invoice_updated_at;
ALTER TABLE public.otp_make_invoice            ENABLE TRIGGER otp_trg_make_invoice_updated_at;
ALTER TABLE public.otp_calibration_certificate ENABLE TRIGGER otp_trg_calibration_certificate_updated_at;
ALTER TABLE public.otp_packaging_transport     ENABLE TRIGGER otp_trg_packaging_transport_updated_at;
