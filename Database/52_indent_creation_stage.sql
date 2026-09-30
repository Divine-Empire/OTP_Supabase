-- =====================================================================
-- 52_indent_creation_stage.sql
--
-- Replaces the old "Material Received" stage/page/table with a new
-- "Indent Creation" stage that has 3 tabs (Pending / Material Received /
-- History), all backed by ONE table (otp_indent_creation):
--
--   Pending             : indent_created_at IS NULL
--   Material Received   : indent_created_at IS NOT NULL AND material_received IS NULL
--   History             : material_received IS NOT NULL (Yes or No)
--
-- otp_check_inventory (Packing List) can now be scanned more than once per
-- order (the UNIQUE(order_id) constraint is dropped) — repeat scans for an
-- order that has ALREADY had one otp_indent_creation row never create a
-- second one; instead any still-outstanding shortage is tracked in the new
-- otp_check_inventory_shortage ledger, which is what makes the order
-- reappear in Packing List's own Pending tab (not Indent Creation) for
-- re-checking, once History is reached on its otp_indent_creation row.
--
-- The old otp_material_shortage table is retired: its 4 live 'pending'
-- rows are carried forward into otp_check_inventory_shortage so no
-- in-flight order is silently lost; its 5 'processed' (completed) rows are
-- historical-only and not migrated. The table is then dropped, and the two
-- routes that joined it for a pendingQty display (pre-invoice, make-invoice)
-- are updated in code to read from the new ledger instead.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. otp_check_inventory — allow repeat scans per order
-- ---------------------------------------------------------------------
ALTER TABLE public.otp_check_inventory
  DROP CONSTRAINT IF EXISTS otp_check_inventory_order_id_key;

-- ---------------------------------------------------------------------
-- 2. otp_indent_creation — one row per order, ever (first-shortage only)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.otp_indent_creation (
  id                          uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  order_id                    uuid NOT NULL REFERENCES public.otp_orders(id) ON DELETE CASCADE,
  check_inventory_id          uuid NOT NULL REFERENCES public.otp_check_inventory(id) ON DELETE CASCADE,

  items                       jsonb NOT NULL DEFAULT '[]'::jsonb, -- [{item_code, item_name, qty}] shortage items from that scan

  -- Process form (Pending tab) — filled in to move to the Material Received tab
  customer_wants_material_as text,
  created_by                 text,
  warehouse_location         text,
  receiving_lead_time        numeric,
  inventory_photo_url        text,
  remarks                    text,
  indent_created_at          timestamptz, -- NULL = still Pending; set = moved to Material Received tab
  pfms_indent_no             text,        -- best-effort (see lib/pfms.ts) — stays null while PFMS_CREATE_INDENT_URL is unset

  -- Material Received tab confirmation
  material_received          text CHECK (material_received IN ('Yes', 'No')), -- NULL = Material Received tab; set = History
  material_received_by       text,
  material_received_at       timestamptz,

  created_at                 timestamptz NOT NULL DEFAULT now(),
  updated_at                 timestamptz NOT NULL DEFAULT now(),

  UNIQUE (order_id)
);

CREATE INDEX IF NOT EXISTS idx_otp_indent_creation_order_id ON public.otp_indent_creation (order_id);

ALTER TABLE public.otp_indent_creation DISABLE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS otp_trg_indent_creation_updated_at ON public.otp_indent_creation;
CREATE TRIGGER otp_trg_indent_creation_updated_at
  BEFORE UPDATE ON public.otp_indent_creation
  FOR EACH ROW
  EXECUTE FUNCTION public.otp_trg_set_updated_at();

-- ---------------------------------------------------------------------
-- 3. otp_check_inventory_shortage — repeat-scan ledger (Packing List's own
--    loop, decoupled from Indent Creation, which only ever fires once)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.otp_check_inventory_shortage (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  order_id            uuid NOT NULL REFERENCES public.otp_orders(id) ON DELETE CASCADE,
  check_inventory_id  uuid REFERENCES public.otp_check_inventory(id) ON DELETE SET NULL,

  item_code           text NOT NULL,
  item_name           text NOT NULL,
  shortage_qty        numeric NOT NULL,

  status              text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'resolved')),
  parent_id           uuid REFERENCES public.otp_check_inventory_shortage(id) ON DELETE SET NULL,

  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_otp_check_inventory_shortage_order_id ON public.otp_check_inventory_shortage (order_id);
CREATE INDEX IF NOT EXISTS idx_otp_check_inventory_shortage_status ON public.otp_check_inventory_shortage (status);

ALTER TABLE public.otp_check_inventory_shortage DISABLE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS otp_trg_check_inventory_shortage_updated_at ON public.otp_check_inventory_shortage;
CREATE TRIGGER otp_trg_check_inventory_shortage_updated_at
  BEFORE UPDATE ON public.otp_check_inventory_shortage
  FOR EACH ROW
  EXECUTE FUNCTION public.otp_trg_set_updated_at();

-- ---------------------------------------------------------------------
-- 4. Carry forward the 4 live 'pending' otp_material_shortage rows so
--    those orders aren't silently dropped, then retire the old table.
-- ---------------------------------------------------------------------
INSERT INTO public.otp_check_inventory_shortage (order_id, check_inventory_id, item_code, item_name, shortage_qty, status, created_at, updated_at)
SELECT order_id, check_inventory_id, item_code, item_name, remaining_qty, 'pending', created_at, updated_at
FROM public.otp_material_shortage
WHERE status = 'pending';

-- CASCADE: otp_v_order_pipeline_status (Database/24_...sql) is a DB-only
-- view never queried from application code — safe to drop along with it.
DROP TABLE IF EXISTS public.otp_material_shortage CASCADE;

-- ---------------------------------------------------------------------
-- 5. TAT settings parity — add the new stage, leave the old key in place
--    (unused going forward, harmless for historical otp_stage_tat rows).
-- ---------------------------------------------------------------------
INSERT INTO public.otp_stage_tat (stage_key, stage_label, tat_minutes, description) VALUES
  ('indent_creation', 'Indent Creation', 1440, 'otp_indent_creation — created on Packing List shortage (first time only), no fixed planned offset yet')
ON CONFLICT (stage_key) DO NOTHING;

-- ---------------------------------------------------------------------
-- 6. Migrate existing user permissions: material-received -> indent-creation
-- ---------------------------------------------------------------------
UPDATE public.otp_users
SET assigned_steps = array_replace(assigned_steps, 'material-received', 'indent-creation')
WHERE 'material-received' = ANY(assigned_steps);
