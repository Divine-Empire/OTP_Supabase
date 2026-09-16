-- =====================================================================
-- 14_otp_orders_acceptable.sql
--
-- MUST BE RUN AGAINST THE SAME PRODUCTION DATABASE as
-- 13_otp_orders_sync_from_lto.sql (nfwtbrmqvsejwwvraanf.supabase.co).
--
-- Purpose: Stage 1 (Order Acceptable) submission table. One row per
-- otp_orders record, created the moment the Order Acceptable form is
-- submitted for that order. Its mere existence is what moves an order
-- from "Pending" to "History" on the /order-acceptable page:
--
--   Pending: otp_orders.order_acceptable_planned IS NOT NULL
--            AND no matching otp_orders_acceptable row yet
--   History: a matching otp_orders_acceptable row exists
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.otp_orders_acceptable (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Link back to the order this submission belongs to (FK on otp_orders.id).
  -- UNIQUE because this stage is submitted at most once per order.
  order_id                 uuid NOT NULL UNIQUE REFERENCES public.otp_orders(id) ON DELETE CASCADE,

  -- Form fields (same fields as the Process Order Acceptable dialog)
  is_order_acceptable      text NOT NULL CHECK (is_order_acceptable IN ('Yes', 'No', 'Order Cancel')),
  acceptance_checklist     text,             -- comma-joined checklist items, only when is_order_acceptable = 'Yes'
  remark                   text,
  processed_by             text,

  -- Stage 2 (Check Inventory) planned date, computed at submission time.
  -- Only set when the order was actually accepted ('Yes') — a rejected or
  -- cancelled order has no next stage. Fixed 3-day offset for now, same
  -- placeholder-TAT approach as otp_orders.order_acceptable_planned; a
  -- real otp_stage_tat-driven calculation is a later phase.
  check_inventory_planned  timestamptz,

  created_at               timestamptz NOT NULL DEFAULT now(),
  updated_at               timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_otp_orders_acceptable_order_id ON public.otp_orders_acceptable (order_id);

ALTER TABLE public.otp_orders_acceptable DISABLE ROW LEVEL SECURITY;

-- Reuses the otp_trg_set_updated_at() function already created by
-- 13_otp_orders_sync_from_lto.sql in this same database.
DROP TRIGGER IF EXISTS otp_trg_orders_acceptable_updated_at ON public.otp_orders_acceptable;
CREATE TRIGGER otp_trg_orders_acceptable_updated_at
  BEFORE UPDATE ON public.otp_orders_acceptable
  FOR EACH ROW
  EXECUTE FUNCTION public.otp_trg_set_updated_at();
