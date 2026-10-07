-- =====================================================================
-- 60_credit_note.sql
--
-- Credit Note — an independent stage, not chained off any prior stage's
-- planned-date (unlike every other stage in this pipeline). It's
-- triggered manually from Make Invoice's own History (grouped by
-- invoice_number, since one physical invoice can cover more than one
-- otp_make_invoice row/wave, possibly even across different orders —
-- see app/make-invoice/page.tsx's "Credit Note" button and
-- app/api/otp-supabase/credit-note/route.ts's GET ?view=invoices).
--
-- Two-step lifecycle:
--   1. Make Invoice's invoice grid -> select items/qty -> POST creates
--      this row with status='pending' (createdBy, no remarks yet).
--   2. Credit Note's own Pending tab -> process form (further edit
--      qty / remove items, add remarks) -> PATCH flips status to
--      'completed' (submittedBy/submitted_at set) -> shows in History.
--
-- order_id is deliberately NOT a single top-level FK — items can span
-- more than one order (see above), so each item in `items` carries its
-- own order_id/order_no. company_name/po_number/crm_name are
-- denormalized onto the row itself at creation time (snapshot, matching
-- this codebase's existing append-only-snapshot convention — see
-- otp_check_inventory etc.) rather than requiring a live multi-order
-- join on every read.
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.otp_credit_note (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  invoice_number  text NOT NULL,
  company_name    text,
  po_number       text,
  crm_name        text,

  -- [{order_id, order_no, make_invoice_id, item_code, item_name, qty}]
  items           jsonb NOT NULL DEFAULT '[]'::jsonb,

  remarks         text,
  status          text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed')),

  created_by      text,
  submitted_by    text,
  submitted_at    timestamptz,

  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_otp_credit_note_invoice_number ON public.otp_credit_note (invoice_number);
CREATE INDEX IF NOT EXISTS idx_otp_credit_note_status ON public.otp_credit_note (status);

ALTER TABLE public.otp_credit_note DISABLE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS otp_trg_credit_note_updated_at ON public.otp_credit_note;
CREATE TRIGGER otp_trg_credit_note_updated_at
  BEFORE UPDATE ON public.otp_credit_note
  FOR EACH ROW
  EXECUTE FUNCTION public.otp_trg_set_updated_at();
