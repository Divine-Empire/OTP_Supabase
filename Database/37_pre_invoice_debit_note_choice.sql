-- =====================================================================
-- 37_pre_invoice_debit_note_choice.sql
--
-- MUST BE RUN AGAINST THE SAME PRODUCTION DATABASE as 21_/25_/32_.
--
-- Pre-Invoice's Process dialog gets a new "Debit Note (Inv.) Required"
-- Yes/No field. Previously debit_note_planned was set unconditionally on
-- every Pre-Invoice submit, always routing the wave through Debit Note
-- (Inv.) before Make Invoice ever became reachable.
--
-- New behaviour, decided at Pre-Invoice submit time:
--   YES -> debit_note_planned is set (unchanged TAT/logic) — wave shows up
--          in Debit Note (Inv.)'s Pending. Only once THAT stage is
--          processed does make_invoice_planned get set (unchanged, see
--          debit-note-for-invoice/route.ts).
--   NO  -> debit_note_planned is left NULL, and make_invoice_planned is
--          set directly instead — wave skips Debit Note (Inv.) entirely
--          and shows up straight in Make Invoice's Pending.
--
-- debit_note_for_invoice_required stores the choice itself, for display
-- in Pre-Invoice's own History (same convention as calibration_required).
-- =====================================================================

ALTER TABLE public.otp_pre_invoice_queue
  ADD COLUMN IF NOT EXISTS debit_note_for_invoice_required boolean;
