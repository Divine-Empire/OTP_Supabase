-- Stage — Debit Note, gated on otp_orders.payment_mode = 'na', set from
-- Order Acceptable (see order-acceptable/route.ts). Terminal stage: unlike
-- Pro-Forma Invoice, processing here does NOT schedule anything further —
-- the order just moves to Debit Note History and stops.
ALTER TABLE public.otp_orders_acceptable
  ADD COLUMN IF NOT EXISTS debit_note_planned timestamptz;

CREATE TABLE IF NOT EXISTS public.otp_debit_note (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id          uuid NOT NULL REFERENCES public.otp_orders(id) ON DELETE CASCADE,
  dn_number         text,
  dn_attachment_url text,
  created_by        text,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  UNIQUE (order_id)
);
CREATE INDEX IF NOT EXISTS idx_otp_debit_note_order_id ON public.otp_debit_note (order_id);
ALTER TABLE public.otp_debit_note DISABLE ROW LEVEL SECURITY;
DROP TRIGGER IF EXISTS otp_trg_debit_note_updated_at ON public.otp_debit_note;
CREATE TRIGGER otp_trg_debit_note_updated_at
  BEFORE UPDATE ON public.otp_debit_note
  FOR EACH ROW EXECUTE FUNCTION public.otp_trg_set_updated_at();
