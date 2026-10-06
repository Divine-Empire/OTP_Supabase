-- =====================================================================
-- 56_otp_orders_sync_guard_unrelated_edits.sql
--
-- Root cause: otp_trg_enquiry_tracker_to_orders / otp_trg_lead_tracker_to_orders
-- fire on EVERY UPDATE to a tracker row once is_order_received_status='yes',
-- regardless of which column changed (WHEN was just `NEW.is_order_received_status
-- = 'yes'`). otp_sync_order_from_tracker() itself only reads a handful of NEW.*
-- columns (quotation_number, po_number, destination, transport_mode,
-- payment_mode, payment_terms_days, acceptance_via, acceptance_file_upload,
-- warranty, amount_with_tax, order_no) plus is_order_received_status — editing
-- anything else (remark, customer_feedback, calling_days, next_call_date...)
-- on an old, already-converted tracker row still re-fires the full upsert and
-- (re-)inserts it into otp_orders, even for orders that pre-date this pipeline
-- and were already fully processed via the old spreadsheet flow. Confirmed:
-- several pre-DO-5064 orders appeared in otp_orders with created_at timestamps
-- from a recent burst (2026-10-05), matching a pattern of old tracker rows
-- being opened/saved in LTO for unrelated reasons.
--
-- Fix: split into a plain INSERT trigger (unchanged behavior — a brand new
-- tracker row already marked 'yes' still syncs) and a separate UPDATE
-- trigger that only fires when one of the columns the sync function
-- actually consumes has genuinely changed VALUE (not just been present in
-- an UPDATE's SET list — a form that resubmits the whole row would
-- otherwise defeat an `UPDATE OF columns` restriction; a WHEN clause
-- comparing OLD/NEW values doesn't have that problem, and a WHEN clause
-- can't reference OLD at all on a combined INSERT+UPDATE trigger, hence
-- the split). This keeps the intentional, already-relied-upon behavior (an
-- order's quotation can still be revised post-conversion and otp_orders
-- re-syncs — see Database/53_indent_creation_repeatable.sql and
-- app/api/otp-supabase/packing-list/route.ts's computeReconciliation) while
-- stopping unrelated-field edits from pushing unwanted old orders into OTP.
-- =====================================================================

DROP TRIGGER IF EXISTS otp_trg_enquiry_tracker_to_orders ON public.lto_enquiry_tracker;
DROP TRIGGER IF EXISTS otp_trg_enquiry_tracker_to_orders_ins ON public.lto_enquiry_tracker;
DROP TRIGGER IF EXISTS otp_trg_enquiry_tracker_to_orders_upd ON public.lto_enquiry_tracker;

CREATE TRIGGER otp_trg_enquiry_tracker_to_orders_ins
  AFTER INSERT ON public.lto_enquiry_tracker
  FOR EACH ROW
  WHEN (NEW.is_order_received_status = 'yes')
  EXECUTE FUNCTION public.otp_sync_order_from_tracker();

CREATE TRIGGER otp_trg_enquiry_tracker_to_orders_upd
  AFTER UPDATE ON public.lto_enquiry_tracker
  FOR EACH ROW
  WHEN (
    NEW.is_order_received_status = 'yes' AND (
      OLD.is_order_received_status IS DISTINCT FROM NEW.is_order_received_status OR
      OLD.quotation_number IS DISTINCT FROM NEW.quotation_number OR
      OLD.po_number IS DISTINCT FROM NEW.po_number OR
      OLD.destination IS DISTINCT FROM NEW.destination OR
      OLD.transport_mode IS DISTINCT FROM NEW.transport_mode OR
      OLD.payment_mode IS DISTINCT FROM NEW.payment_mode OR
      OLD.payment_terms_days IS DISTINCT FROM NEW.payment_terms_days OR
      OLD.acceptance_via IS DISTINCT FROM NEW.acceptance_via OR
      OLD.acceptance_file_upload IS DISTINCT FROM NEW.acceptance_file_upload OR
      OLD.warranty IS DISTINCT FROM NEW.warranty OR
      OLD.amount_with_tax IS DISTINCT FROM NEW.amount_with_tax OR
      OLD.order_no IS DISTINCT FROM NEW.order_no
    )
  )
  EXECUTE FUNCTION public.otp_sync_order_from_tracker();

DROP TRIGGER IF EXISTS otp_trg_lead_tracker_to_orders ON public.lto_enquiry_tracker_for_leads;
DROP TRIGGER IF EXISTS otp_trg_lead_tracker_to_orders_ins ON public.lto_enquiry_tracker_for_leads;
DROP TRIGGER IF EXISTS otp_trg_lead_tracker_to_orders_upd ON public.lto_enquiry_tracker_for_leads;

CREATE TRIGGER otp_trg_lead_tracker_to_orders_ins
  AFTER INSERT ON public.lto_enquiry_tracker_for_leads
  FOR EACH ROW
  WHEN (NEW.is_order_received_status = 'yes')
  EXECUTE FUNCTION public.otp_sync_order_from_tracker();

CREATE TRIGGER otp_trg_lead_tracker_to_orders_upd
  AFTER UPDATE ON public.lto_enquiry_tracker_for_leads
  FOR EACH ROW
  WHEN (
    NEW.is_order_received_status = 'yes' AND (
      OLD.is_order_received_status IS DISTINCT FROM NEW.is_order_received_status OR
      OLD.quotation_number IS DISTINCT FROM NEW.quotation_number OR
      OLD.po_number IS DISTINCT FROM NEW.po_number OR
      OLD.destination IS DISTINCT FROM NEW.destination OR
      OLD.transport_mode IS DISTINCT FROM NEW.transport_mode OR
      OLD.payment_mode IS DISTINCT FROM NEW.payment_mode OR
      OLD.payment_terms_days IS DISTINCT FROM NEW.payment_terms_days OR
      OLD.acceptance_via IS DISTINCT FROM NEW.acceptance_via OR
      OLD.acceptance_file_upload IS DISTINCT FROM NEW.acceptance_file_upload OR
      OLD.warranty IS DISTINCT FROM NEW.warranty OR
      OLD.amount_with_tax IS DISTINCT FROM NEW.amount_with_tax OR
      OLD.order_no IS DISTINCT FROM NEW.order_no
    )
  )
  EXECUTE FUNCTION public.otp_sync_order_from_tracker();
