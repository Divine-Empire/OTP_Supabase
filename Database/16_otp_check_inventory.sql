-- =====================================================================
-- 16_otp_check_inventory.sql
--
-- MUST BE RUN AGAINST THE SAME PRODUCTION DATABASE as 13_/14_/15_
-- (nfwtbrmqvsejwwvraanf.supabase.co).
--
-- Purpose: Stage 2 (Check Inventory) submission table. One row per
-- otp_orders record, created the moment the Check Inventory form is
-- submitted for that order. Its mere existence is what moves an order
-- from "Pending" to "History" on the /check-inventory page:
--
--   Pending: otp_orders_acceptable.check_inventory_planned IS NOT NULL
--            AND no matching otp_check_inventory row yet
--   History: a matching otp_check_inventory row exists
--
-- NOTE: no "next stage planned" column here on purpose — that stage
-- (Material Received) hasn't been designed yet.
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.otp_check_inventory (
  id                          uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Link back to the order this submission belongs to (FK on otp_orders.id).
  -- UNIQUE because this stage is submitted at most once per order.
  order_id                    uuid NOT NULL UNIQUE REFERENCES public.otp_orders(id) ON DELETE CASCADE,

  -- Form fields (same fields as the Check Inventory dialog)
  availability_status         text NOT NULL CHECK (availability_status IN ('Available', 'Not Available', 'Partial')),
  remark                      text,
  customer_wants_material_as  text,             -- only meaningful for Partial/Not Available
  created_by                  text,
  warehouse_location          text,
  inventory_photo_url         text,
  line_item_number            integer,
  total_qty                   numeric,
  material_received_lead_time integer,
  unavailable_items           jsonb NOT NULL DEFAULT '[]'::jsonb,
  actual_date                 timestamptz,

  created_at                  timestamptz NOT NULL DEFAULT now(),
  updated_at                  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_otp_check_inventory_order_id ON public.otp_check_inventory (order_id);

ALTER TABLE public.otp_check_inventory DISABLE ROW LEVEL SECURITY;

-- Reuses the otp_trg_set_updated_at() function already created by
-- 13_otp_orders_sync_from_lto.sql in this same database.
DROP TRIGGER IF EXISTS otp_trg_check_inventory_updated_at ON public.otp_check_inventory;
CREATE TRIGGER otp_trg_check_inventory_updated_at
  BEFORE UPDATE ON public.otp_check_inventory
  FOR EACH ROW
  EXECUTE FUNCTION public.otp_trg_set_updated_at();
