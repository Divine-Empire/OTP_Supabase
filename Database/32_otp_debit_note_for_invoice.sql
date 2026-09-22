-- Stage — Debit Note (Inv.), inserted between Pre-Invoice and Make Invoice.
--
-- Unlike otp_debit_note (Order-Acceptable's 'na'-payment-mode terminal
-- stage), this one applies unconditionally to every otp_pre_invoice_queue
-- row and is NOT terminal — processing it unlocks Make Invoice.
--
-- debit_note_planned is set on every queue row the moment Pre-Invoice
-- submits it (see app/api/otp-supabase/pre-invoice/route.ts), same timing
-- as invoiced_at. make_invoice_planned only gets set once Debit Note (Inv.)
-- itself is processed for that row (see
-- app/api/otp-supabase/debit-note-for-invoice/route.ts POST) — Make
-- Invoice's own pending gate switches from status='invoiced' to
-- make_invoice_planned IS NOT NULL accordingly.
ALTER TABLE public.otp_pre_invoice_queue
  ADD COLUMN IF NOT EXISTS debit_note_planned timestamptz,
  ADD COLUMN IF NOT EXISTS make_invoice_planned timestamptz;

CREATE TABLE IF NOT EXISTS public.otp_debit_note_for_invoice (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pre_invoice_queue_id  uuid NOT NULL REFERENCES public.otp_pre_invoice_queue(id) ON DELETE CASCADE,
  order_id              uuid NOT NULL REFERENCES public.otp_orders(id) ON DELETE CASCADE,
  amount                numeric,
  dn_number             text,
  dn_attachment_url     text,
  created_by            text,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now(),
  UNIQUE (pre_invoice_queue_id)
);
CREATE INDEX IF NOT EXISTS idx_otp_debit_note_for_invoice_queue_id ON public.otp_debit_note_for_invoice (pre_invoice_queue_id);
CREATE INDEX IF NOT EXISTS idx_otp_debit_note_for_invoice_order_id ON public.otp_debit_note_for_invoice (order_id);
ALTER TABLE public.otp_debit_note_for_invoice DISABLE ROW LEVEL SECURITY;
DROP TRIGGER IF EXISTS otp_trg_debit_note_for_invoice_updated_at ON public.otp_debit_note_for_invoice;
CREATE TRIGGER otp_trg_debit_note_for_invoice_updated_at
  BEFORE UPDATE ON public.otp_debit_note_for_invoice
  FOR EACH ROW EXECUTE FUNCTION public.otp_trg_set_updated_at();
