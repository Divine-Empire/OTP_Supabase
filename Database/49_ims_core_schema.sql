-- =====================================================================
-- 49_ims_core_schema.sql
--
-- Batch 1/9 of the Inventory Management System (IMS) build.
--
-- Core shared schema: item master, fixed location list, FIFO stock
-- batches (one row per INN transaction, invoice_date-ordered), and a
-- ledger table for full audit trail (every IN/OUT/reversal).
--
-- Design notes:
-- - Item identity is unreliable via item_code across Purchase-FMS-Supabase
--   (pfms_item_master) and Lead-To-Order (lto_items) -- both nullable,
--   not cross-mapped. So the canonical key here is the NORMALIZED item
--   name (trim+lower), same workaround already used by
--   OTP_Supabase/app/api/otp-supabase/check-inventory/route.ts's
--   enrichOrderItemsWithCode. item_code is kept as a display-only field.
-- - Locations are NOT a free-text/master-data concept here -- confirmed
--   the same fixed 4 options already exist in both the Indent-Creation
--   form (Purchase-FMS-Supabase, pfms_dropdown category "Wharehouse")
--   and the Check-Inventory warehouse dropdown (OTP_Supabase): C.G.
--   Warehouse, N.E Warehouse, Head Office, Maniquip Store. Seeded as a
--   small fixed table, not editable via any UI for now.
-- - FIFO consumption (ims_consume_stock, added in this migration) walks
--   batches oldest-invoice_date-first, locks rows with FOR UPDATE (so two
--   concurrent OUT calls can't double-spend the same batch), and --
--   per explicit decision -- does NOT block on insufficient stock: any
--   shortfall is dumped onto a synthetic "shortfall" batch that goes
--   negative, flagged in its return row so the caller can show a
--   non-blocking warning.
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.ims_locations (
  code  text PRIMARY KEY,
  label text NOT NULL
);

-- Labels match the EXACT text stored in Purchase-FMS-Supabase's
-- pfms_indent_generation.warehouseLocation live data ("C.G Warehouse",
-- "NE Warehouse" -- no period after "C.G", no period/space in "NE";
-- confirmed by direct query, not just the dropdown's on-screen label).
INSERT INTO public.ims_locations (code, label) VALUES
  ('CG_WAREHOUSE',    'C.G Warehouse'),
  ('NE_WAREHOUSE',    'NE Warehouse'),
  ('HEAD_OFFICE',     'Head Office'),
  ('MANIQUIP_STORE',  'Maniquip Store')
ON CONFLICT (code) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.ims_item_master (
  item_key   text PRIMARY KEY,     -- normalized (trim+lower) item name
  item_name  text NOT NULL,        -- display name, first-seen casing
  item_code  text,                 -- display-only, never a match key
  category   text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.ims_stock_levels (
  item_key      text NOT NULL REFERENCES public.ims_item_master(item_key) ON DELETE CASCADE,
  location_code text NOT NULL REFERENCES public.ims_locations(code),
  max_level     numeric,
  updated_at    timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (item_key, location_code)
);

CREATE TABLE IF NOT EXISTS public.ims_stock_batches (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_key      text NOT NULL REFERENCES public.ims_item_master(item_key),
  location_code text NOT NULL REFERENCES public.ims_locations(code),
  invoice_date  date,                 -- null only for pre-cipher-decode edge cases
  qty_in        numeric NOT NULL,
  qty_remaining numeric NOT NULL,     -- can go negative (shortfall batches)
  source_type   text NOT NULL,        -- 'tally_entry' | 'opening_balance' | 'shortfall' | 'manual'
  source_ref    text,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ims_batches_fifo
  ON public.ims_stock_batches (item_key, location_code, invoice_date, created_at)
  WHERE qty_remaining <> 0;

CREATE TABLE IF NOT EXISTS public.ims_stock_ledger (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id           uuid NOT NULL REFERENCES public.ims_stock_batches(id),
  direction          text NOT NULL CHECK (direction IN ('in', 'out', 'reversal')),
  qty                numeric NOT NULL,   -- always positive; `direction` says which way
  source_type        text NOT NULL,      -- 'make_invoice' | 'debit_note' | 'tally_entry' | 'opening_balance' | 'order_cancel_reversal' | ...
  source_ref         text,
  reversed_ledger_id uuid REFERENCES public.ims_stock_ledger(id),
  created_by         text,
  created_at         timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ims_ledger_batch ON public.ims_stock_ledger (batch_id);
CREATE INDEX IF NOT EXISTS idx_ims_ledger_source ON public.ims_stock_ledger (source_type, source_ref);

CREATE OR REPLACE FUNCTION public.ims_normalize_item_name(p_name text)
RETURNS text
LANGUAGE sql IMMUTABLE
AS $$
  SELECT NULLIF(lower(trim(p_name)), '')
$$;

CREATE OR REPLACE FUNCTION public.ims_get_or_create_item(p_item_name text, p_item_code text DEFAULT NULL)
RETURNS text
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
DECLARE
  v_key text;
BEGIN
  v_key := ims_normalize_item_name(p_item_name);
  IF v_key IS NULL THEN
    RAISE EXCEPTION 'Item name is required';
  END IF;

  INSERT INTO ims_item_master (item_key, item_name, item_code)
  VALUES (v_key, p_item_name, NULLIF(p_item_code, 'N/A'))
  ON CONFLICT (item_key) DO UPDATE SET
    item_code  = COALESCE(ims_item_master.item_code, EXCLUDED.item_code),
    updated_at = now();

  RETURN v_key;
END;
$$;

-- Records one INN transaction: creates a new FIFO batch + an 'in' ledger
-- entry. Called from Purchase-FMS-Supabase's Tally Entry submit.
CREATE OR REPLACE FUNCTION public.ims_receive_stock(
  p_item_name   text,
  p_item_code   text,
  p_location_code text,
  p_invoice_date  date,
  p_qty           numeric,
  p_source_type   text,
  p_source_ref    text,
  p_created_by    text
) RETURNS uuid
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
DECLARE
  v_key      text;
  v_batch_id uuid;
BEGIN
  IF p_qty IS NULL OR p_qty <= 0 THEN
    RAISE EXCEPTION 'Quantity must be positive';
  END IF;

  v_key := ims_get_or_create_item(p_item_name, p_item_code);

  INSERT INTO ims_stock_batches (item_key, location_code, invoice_date, qty_in, qty_remaining, source_type, source_ref)
  VALUES (v_key, p_location_code, p_invoice_date, p_qty, p_qty, p_source_type, p_source_ref)
  RETURNING id INTO v_batch_id;

  INSERT INTO ims_stock_ledger (batch_id, direction, qty, source_type, source_ref, created_by)
  VALUES (v_batch_id, 'in', p_qty, p_source_type, p_source_ref, p_created_by);

  RETURN v_batch_id;
END;
$$;

DROP TYPE IF EXISTS public.ims_consume_result CASCADE;
CREATE TYPE public.ims_consume_result AS (
  batch_id      uuid,
  qty_taken     numeric,
  invoice_date  date,
  went_negative boolean
);

-- FIFO OUT: consumes p_qty for (item_name, location) oldest-invoice_date
-- batch first. Locks each batch row (FOR UPDATE) as it's touched, so
-- concurrent OUT calls against the same item/location serialize instead
-- of double-spending. Never blocks on insufficient stock -- any
-- unsatisfied remainder is dumped onto a new negative "shortfall" batch,
-- returned with went_negative = true so the caller can show a (non-
-- blocking) warning.
CREATE OR REPLACE FUNCTION public.ims_consume_stock(
  p_item_name   text,
  p_location_code text,
  p_qty           numeric,
  p_source_type   text,
  p_source_ref    text,
  p_created_by    text
) RETURNS SETOF public.ims_consume_result
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
DECLARE
  v_key       text;
  v_remaining numeric := p_qty;
  v_batch     record;
  v_take      numeric;
  v_shortfall_batch_id uuid;
  v_result    ims_consume_result;
BEGIN
  IF p_qty IS NULL OR p_qty <= 0 THEN
    RAISE EXCEPTION 'Quantity must be positive';
  END IF;

  v_key := ims_get_or_create_item(p_item_name);

  FOR v_batch IN
    SELECT id, qty_remaining, invoice_date
      FROM ims_stock_batches
     WHERE item_key = v_key
       AND location_code = p_location_code
       AND qty_remaining > 0
     ORDER BY invoice_date ASC NULLS LAST, created_at ASC
     FOR UPDATE
  LOOP
    EXIT WHEN v_remaining <= 0;

    v_take := LEAST(v_batch.qty_remaining, v_remaining);

    UPDATE ims_stock_batches SET qty_remaining = qty_remaining - v_take WHERE id = v_batch.id;

    INSERT INTO ims_stock_ledger (batch_id, direction, qty, source_type, source_ref, created_by)
    VALUES (v_batch.id, 'out', v_take, p_source_type, p_source_ref, p_created_by);

    v_result := (v_batch.id, v_take, v_batch.invoice_date, false);
    RETURN NEXT v_result;

    v_remaining := v_remaining - v_take;
  END LOOP;

  IF v_remaining > 0 THEN
    INSERT INTO ims_stock_batches (item_key, location_code, invoice_date, qty_in, qty_remaining, source_type, source_ref)
    VALUES (v_key, p_location_code, CURRENT_DATE, 0, -v_remaining, 'shortfall', p_source_ref)
    RETURNING id INTO v_shortfall_batch_id;

    INSERT INTO ims_stock_ledger (batch_id, direction, qty, source_type, source_ref, created_by)
    VALUES (v_shortfall_batch_id, 'out', v_remaining, p_source_type, p_source_ref, p_created_by);

    v_result := (v_shortfall_batch_id, v_remaining, CURRENT_DATE, true);
    RETURN NEXT v_result;
  END IF;

  RETURN;
END;
$$;

-- Reverses one 'out' ledger entry (Order Cancel / invoice void): adds the
-- qty back onto the same batch it came from, and logs a 'reversal' entry
-- pointing at it. Refuses to double-reverse the same entry.
CREATE OR REPLACE FUNCTION public.ims_reverse_ledger_entry(p_ledger_id uuid, p_created_by text)
RETURNS uuid
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
DECLARE
  v_entry        record;
  v_reversal_id  uuid;
BEGIN
  SELECT * INTO v_entry FROM ims_stock_ledger WHERE id = p_ledger_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Ledger entry not found';
  END IF;
  IF v_entry.direction <> 'out' THEN
    RAISE EXCEPTION 'Only OUT entries can be reversed';
  END IF;
  IF EXISTS (SELECT 1 FROM ims_stock_ledger WHERE reversed_ledger_id = p_ledger_id) THEN
    RAISE EXCEPTION 'This entry was already reversed';
  END IF;

  UPDATE ims_stock_batches SET qty_remaining = qty_remaining + v_entry.qty WHERE id = v_entry.batch_id;

  INSERT INTO ims_stock_ledger (batch_id, direction, qty, source_type, source_ref, reversed_ledger_id, created_by)
  VALUES (v_entry.batch_id, 'reversal', v_entry.qty, v_entry.source_type, v_entry.source_ref, p_ledger_id, p_created_by)
  RETURNING id INTO v_reversal_id;

  RETURN v_reversal_id;
END;
$$;

-- Current balance per item+location -- SUM(qty_remaining) across all that
-- item/location's batches (negative if any shortfall batches exist).
CREATE OR REPLACE VIEW public.ims_v_stock_balance AS
SELECT
  b.item_key,
  m.item_name,
  m.item_code,
  b.location_code,
  l.label AS location_label,
  SUM(b.qty_remaining) AS balance,
  sl.max_level
FROM public.ims_stock_batches b
JOIN public.ims_item_master m ON m.item_key = b.item_key
JOIN public.ims_locations l ON l.code = b.location_code
LEFT JOIN public.ims_stock_levels sl ON sl.item_key = b.item_key AND sl.location_code = b.location_code
GROUP BY b.item_key, m.item_name, m.item_code, b.location_code, l.label, sl.max_level;
