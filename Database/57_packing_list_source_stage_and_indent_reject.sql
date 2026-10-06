-- =====================================================================
-- 57_packing_list_source_stage_and_indent_reject.sql
--
-- 1. otp_pre_invoice_queue.source_stage: 'check_inventory' -> 'packing_list'
--    (the stage was renamed Packing List; this value is display-only, nothing
--    branches on it). The TAT stage_key 'check_inventory' and the
--    otp_orders_acceptable.check_inventory_planned column are intentionally
--    NOT renamed — internal keys used in many places, already labelled
--    "Packing List" in the UI.
--
-- 2. otp_indent_creation.material_received gains 'Rejected': an indent row
--    whose items all ended up at qty 0 (e.g. quotation reduced/removed the
--    item after the shortage was raised) can be rejected straight from the
--    Pending tab into History — no PFMS indent, and no
--    otp_check_inventory_shortage ledger row, so the order is NOT queued
--    back into Packing List (see indent-creation/route.ts PATCH).
-- =====================================================================

ALTER TABLE public.otp_pre_invoice_queue
  DROP CONSTRAINT IF EXISTS otp_pre_invoice_queue_source_stage_check;

UPDATE public.otp_pre_invoice_queue
  SET source_stage = 'packing_list'
  WHERE source_stage = 'check_inventory';

-- 'check_inventory' stays allowed only so the currently-deployed app (which
-- still writes it) keeps working until the new code is deployed. After
-- deploying, re-run the UPDATE above once to catch any rows written in
-- between, and optionally tighten this CHECK to drop 'check_inventory'.
ALTER TABLE public.otp_pre_invoice_queue
  ADD CONSTRAINT otp_pre_invoice_queue_source_stage_check
  CHECK (source_stage IN ('packing_list', 'material_received', 'check_inventory'));

ALTER TABLE public.otp_indent_creation
  DROP CONSTRAINT IF EXISTS otp_indent_creation_material_received_check;

ALTER TABLE public.otp_indent_creation
  ADD CONSTRAINT otp_indent_creation_material_received_check
  CHECK (material_received IN ('Yes', 'No', 'Rejected'));
