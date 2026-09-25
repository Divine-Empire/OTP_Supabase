-- =====================================================================
-- 50_ims_opening_balance_csv_import.sql
--
-- Supports the CSV-based Opening Qty/Max Level import (Settings >
-- Inventory (IMS)) — replaces the earlier one-row-at-a-time form.
--
-- 1. ims_item_master gets a `group_name` column (the GROUP column in the
--    reference sheet, e.g. "ABCFG" — a level above `category`, e.g.
--    "ANCHOR FASTENERS-ABCFG").
--
-- 2. ims_set_opening_balance() -- an IDEMPOTENT opening-balance writer.
--    ims_receive_stock() (migration 49) always INSERTS a new additive
--    batch, which is correct for real Tally Entry events but wrong here:
--    importing the same location's CSV twice (e.g. to fix a typo) would
--    silently double the opening qty. This function instead REPLACES the
--    single 'opening_balance' batch for a given (item, location) -- Tally
--    Entry's own batches (source_type = 'tally_entry') are untouched, so
--    real stock movement recorded after go-live is never affected by a
--    re-import.
-- =====================================================================

ALTER TABLE public.ims_item_master
  ADD COLUMN IF NOT EXISTS group_name text;

CREATE OR REPLACE FUNCTION public.ims_set_opening_balance(
  p_item_name     text,
  p_item_code     text,
  p_category      text,
  p_group_name    text,
  p_location_code text,
  p_qty           numeric,
  p_max_level     numeric,
  p_created_by    text
) RETURNS uuid
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
DECLARE
  v_key      text;
  v_batch_id uuid;
BEGIN
  v_key := ims_get_or_create_item(p_item_name, p_item_code);

  UPDATE ims_item_master
     SET category   = COALESCE(NULLIF(p_category, ''), category),
         group_name = COALESCE(NULLIF(p_group_name, ''), group_name),
         updated_at = now()
   WHERE item_key = v_key;

  -- Replace this (item, location)'s existing opening-balance batch, if
  -- any -- re-importing the same CSV row is then a correction, not a
  -- second addition. Real tally_entry batches are a different
  -- source_type, so they're never touched here.
  DELETE FROM ims_stock_ledger
   WHERE batch_id IN (
     SELECT id FROM ims_stock_batches
      WHERE item_key = v_key AND location_code = p_location_code AND source_type = 'opening_balance'
   );
  DELETE FROM ims_stock_batches
   WHERE item_key = v_key AND location_code = p_location_code AND source_type = 'opening_balance';

  IF p_qty IS NOT NULL AND p_qty > 0 THEN
    INSERT INTO ims_stock_batches (item_key, location_code, invoice_date, qty_in, qty_remaining, source_type, source_ref)
    VALUES (v_key, p_location_code, CURRENT_DATE, p_qty, p_qty, 'opening_balance', NULL)
    RETURNING id INTO v_batch_id;

    INSERT INTO ims_stock_ledger (batch_id, direction, qty, source_type, source_ref, created_by)
    VALUES (v_batch_id, 'in', p_qty, 'opening_balance', NULL, p_created_by);
  END IF;

  IF p_max_level IS NOT NULL THEN
    INSERT INTO ims_stock_levels (item_key, location_code, max_level, updated_at)
    VALUES (v_key, p_location_code, p_max_level, now())
    ON CONFLICT (item_key, location_code) DO UPDATE SET max_level = EXCLUDED.max_level, updated_at = now();
  END IF;

  RETURN v_batch_id;
END;
$function$;

DROP VIEW IF EXISTS public.ims_v_stock_balance;
CREATE VIEW public.ims_v_stock_balance AS
SELECT
  b.item_key,
  m.item_name,
  m.item_code,
  m.category,
  m.group_name,
  b.location_code,
  l.label AS location_label,
  SUM(b.qty_remaining) AS balance,
  sl.max_level
FROM public.ims_stock_batches b
JOIN public.ims_item_master m ON m.item_key = b.item_key
JOIN public.ims_locations l ON l.code = b.location_code
LEFT JOIN public.ims_stock_levels sl ON sl.item_key = b.item_key AND sl.location_code = b.location_code
GROUP BY b.item_key, m.item_name, m.item_code, m.category, m.group_name, b.location_code, l.label, sl.max_level;
