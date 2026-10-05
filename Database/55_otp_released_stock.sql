-- =====================================================================
-- 55_otp_released_stock.sql
--
-- "Released Stock" ledger — lightweight, append-style, same shape/style as
-- otp_check_inventory_shortage (see 52_indent_creation_stage.sql). Tracks
-- qty an order's Pre-Invoice Process step freed up by reducing an item's
-- qty below what Packing List originally queued for it (e.g. a client
-- asks to ship less now), so that freed qty can be surfaced (read-only
-- banner) to a DIFFERENT order's Packing List scan for the same
-- item_name, and consumed (qty_remaining decremented) when that other
-- order actually scans/finds it — see packing-list/route.ts and
-- pre-invoice/route.ts.
--
-- Packing List's own History (otp_check_inventory) deliberately stays
-- untouched/immutable — it's the "what did the warehouse physically
-- find" audit trail that computeReconciliation() depends on as a stable
-- baseline. This ledger lives alongside it, not instead of it.
--
-- Match key is item_name only (nameKey() convention — item_code catalogs
-- are not synced between systems, see packing-list/route.ts). item_code
-- here is display-only.
--
-- NOT a live-inventory/reservation system: qty_remaining only ever
-- decrements (never re-incremented, no locking) and rows are never
-- deleted — same lightweight-ledger precedent as
-- otp_check_inventory_shortage.
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.otp_released_stock (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  item_name         text NOT NULL,            -- match key (nameKey()'d at write/read time in app code)
  item_code         text,                     -- display only, never used to match

  qty_released      numeric NOT NULL CHECK (qty_released > 0),
  qty_remaining     numeric NOT NULL CHECK (qty_remaining >= 0),

  source_order_id   uuid NOT NULL REFERENCES public.otp_orders(id) ON DELETE CASCADE,
  source_queue_id   uuid NOT NULL REFERENCES public.otp_pre_invoice_queue(id) ON DELETE CASCADE,

  reason            text NOT NULL,            -- required — why the qty was reduced (UI-enforced, DB-enforced too)
  released_by       text,

  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_otp_released_stock_item_name ON public.otp_released_stock (item_name);
CREATE INDEX IF NOT EXISTS idx_otp_released_stock_qty_remaining ON public.otp_released_stock (qty_remaining);
CREATE INDEX IF NOT EXISTS idx_otp_released_stock_source_order_id ON public.otp_released_stock (source_order_id);

ALTER TABLE public.otp_released_stock DISABLE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS otp_trg_released_stock_updated_at ON public.otp_released_stock;
CREATE TRIGGER otp_trg_released_stock_updated_at
  BEFORE UPDATE ON public.otp_released_stock
  FOR EACH ROW
  EXECUTE FUNCTION public.otp_trg_set_updated_at();
