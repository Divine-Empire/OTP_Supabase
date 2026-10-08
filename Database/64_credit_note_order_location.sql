-- =====================================================================
-- 64_credit_note_order_location.sql
--
-- otp_credit_note has no order_id FK (one invoice can span several
-- orders — see 60_credit_note.sql), so like crm_name/company_name it
-- snapshots the order's location at creation time, letting the Credit
-- Note stage apply the same per-user location scoping as every other
-- stage (Database/63_order_location.sql). Set server-side from the
-- invoice's own order, never from the client.
--
-- Existing rows are backfilled from their first item's order.
-- =====================================================================

ALTER TABLE public.otp_credit_note ADD COLUMN IF NOT EXISTS order_location text;

UPDATE public.otp_credit_note cn
   SET order_location = o.order_location
  FROM public.otp_orders o
 WHERE cn.order_location IS NULL
   AND o.id = (cn.items->0->>'order_id')::uuid;
