-- =====================================================================
-- 45_backfill_and_autosync_total_qty.sql
--
-- MUST BE RUN AGAINST THE SAME PRODUCTION DATABASE as 13_/19_/20_/34_/44_.
--
-- otp_orders.total_qty was added in 44_total_qty_and_quotation_number_match
-- but only gets computed going forward, by otp_sync_order_from_tracker(),
-- from lto_enquiry_items/lto_lead_items at the moment a tracker row syncs.
-- Every otp_orders row created before that migration is stuck at NULL even
-- though its own `items` jsonb column (the same data, already copied onto
-- the row) has everything needed to compute it.
--
-- 1. One-time backfill: for every existing row with total_qty still NULL,
--    sum the quantities out of its own `items` column.
--
-- 2. otp_orders_set_total_qty_from_items() + trigger: BEFORE INSERT OR
--    UPDATE OF items ON otp_orders, recomputes total_qty from NEW.items.
--    This is a safety net independent of otp_sync_order_from_tracker --
--    total_qty now derives from `items` right on this table, so any future
--    insert/update that sets/changes `items` (whatever wrote it) keeps
--    total_qty correct automatically, without relying on the caller to
--    also set total_qty itself.
-- =====================================================================

UPDATE public.otp_orders
SET total_qty = COALESCE((
  SELECT SUM((elem->>'quantity')::numeric)::integer
    FROM jsonb_array_elements(COALESCE(items, '[]'::jsonb)) elem
), 0)
WHERE total_qty IS NULL;

CREATE OR REPLACE FUNCTION public.otp_orders_set_total_qty_from_items()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  SELECT COALESCE(SUM((elem->>'quantity')::numeric), 0)::integer
    INTO NEW.total_qty
    FROM jsonb_array_elements(COALESCE(NEW.items, '[]'::jsonb)) elem;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS otp_trg_orders_total_qty ON public.otp_orders;
CREATE TRIGGER otp_trg_orders_total_qty
  BEFORE INSERT OR UPDATE OF items ON public.otp_orders
  FOR EACH ROW
  EXECUTE FUNCTION public.otp_orders_set_total_qty_from_items();
