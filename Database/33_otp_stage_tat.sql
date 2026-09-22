-- otp_stage_tat never actually got created against this production project
-- (the earlier 02_core_tables.sql / 04_triggers.sql migrations describing it
-- belong to an abandoned earlier schema design and were never applied here
-- — Settings > TAT Management has been erroring on every load as a result).
--
-- This is a fresh table matching the CURRENT pipeline's real stages/planned
-- columns (see app/settings/tat-helpers.ts for the same list kept in sync on
-- the frontend). It is a reference/config table only for now — no pipeline
-- route reads from it yet to compute planned dates (those still use fixed
-- offsets inline); wiring it in is a later phase, same as before.
CREATE TABLE IF NOT EXISTS public.otp_stage_tat (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stage_key   text NOT NULL UNIQUE,
  stage_label text NOT NULL,
  tat_minutes integer NOT NULL DEFAULT 0,
  description text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_otp_stage_tat_stage_key ON public.otp_stage_tat (stage_key);
ALTER TABLE public.otp_stage_tat DISABLE ROW LEVEL SECURITY;
DROP TRIGGER IF EXISTS otp_trg_stage_tat_updated_at ON public.otp_stage_tat;
CREATE TRIGGER otp_trg_stage_tat_updated_at
  BEFORE UPDATE ON public.otp_stage_tat
  FOR EACH ROW EXECUTE FUNCTION public.otp_trg_set_updated_at();

INSERT INTO public.otp_stage_tat (stage_key, stage_label, tat_minutes, description) VALUES
  ('order_acceptable',       'Order Acceptable',       7200, 'otp_orders.order_acceptable_planned — 5 days from order conversion'),
  ('proforma_invoice',       'Pro-Forma Invoice',      4320, 'otp_orders_acceptable.proforma_invoice_planned — 3 days from Order Acceptable (payment_mode = pi against advance only)'),
  ('debit_note',             'Debit Note',              4320, 'otp_orders_acceptable.debit_note_planned — 3 days from Order Acceptable (payment_mode = na only)'),
  ('check_inventory',        'Check Inventory',        4320, 'otp_orders_acceptable.check_inventory_planned — 3 days from Order Acceptable or Pro-Forma Invoice'),
  ('material_received',      'Material Received',      1440, 'otp_material_shortage — created on Check Inventory shortage, no fixed planned offset yet'),
  ('pre_invoice',            'Pre-Invoice',             1440, 'otp_pre_invoice_queue (status=pending) — created by Check Inventory/Material Received, no fixed planned offset yet'),
  ('debit_note_for_invoice', 'Debit Note (Inv.)',      4320, 'otp_pre_invoice_queue.debit_note_planned — 3 days from Pre-Invoice submit'),
  ('make_invoice',           'Make Invoice',            4320, 'otp_pre_invoice_queue.make_invoice_planned — 3 days from Debit Note (Inv.)'),
  ('calibration',            'Calibration Certificate', 7200, 'otp_make_invoice.calibration_planned — 5 days from Make Invoice (calibration_required only)')
ON CONFLICT (stage_key) DO NOTHING;
