-- =====================================================================
-- 83_lto_items_is_value.sql
--
-- lto_items.otp_is_value: the IS standard an item is calibrated against (e.g.
-- 'IS 10086 Amd. 2 : 2025'). Prefilled into the certificate's "Based On" field.
-- Filled from the item-list CSV by scripts/import-calibration-formats.mjs.
-- Safe to re-run.
-- =====================================================================

ALTER TABLE public.lto_items
  ADD COLUMN IF NOT EXISTS otp_is_value text;
