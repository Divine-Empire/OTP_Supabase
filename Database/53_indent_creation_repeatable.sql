-- =====================================================================
-- 53_indent_creation_repeatable.sql
--
-- Supports quotation-change reconciliation (Packing List "Updated" status,
-- see app/api/otp-supabase/packing-list/route.ts). A quotation can be
-- edited in Lead-To-Order-Supabase-New even after order conversion (the
-- Enquiry Tracker History edit modal has no is_order_received_status
-- guard), which re-fires otp_sync_order_from_tracker() and silently
-- overwrites otp_orders.items/total_qty/amount_with_tax to match the new
-- quotation. If a DIFFERENT item (one never short before) later comes up
-- short because of that change, it needs its own first-ever indent —
-- otp_indent_creation's UNIQUE(order_id) only allowed exactly one such
-- indent per order, ever, which blocks that. Per-item indent eligibility
-- (has THIS item name ever appeared in any otp_indent_creation.items row
-- for this order, not just "does the order have one at all") is now
-- checked in application code instead of relying on this constraint.
-- =====================================================================

-- idx_otp_indent_creation_order_id (from 52_) already covers lookups by
-- order_id, so no new index is needed here — just dropping the constraint
-- that forced exactly one row per order.
ALTER TABLE public.otp_indent_creation
  DROP CONSTRAINT IF EXISTS otp_indent_creation_order_id_key;
