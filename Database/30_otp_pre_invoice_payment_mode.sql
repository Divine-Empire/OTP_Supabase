-- Pre-Invoice gets a Payment Mode dropdown, pre-selected from otp_orders
-- but overridable and saved as its own snapshot column so History always
-- shows what was actually chosen at Pre-Invoice time, not the (possibly
-- since-changed) live otp_orders.payment_mode.
ALTER TABLE public.otp_pre_invoice_queue
  ADD COLUMN IF NOT EXISTS payment_mode text;

-- Same value set Lead-To-Order itself uses (lto_enquiry_tracker /
-- lto_enquiry_tracker_for_leads .payment_mode), lower-cased to match exactly
-- so the pre-selected default lines up with otp_orders.payment_mode.
INSERT INTO public.otp_dropdown (category, value, sort_order) VALUES
  ('payment_mode', 'current date cheque', 1),
  ('payment_mode', 'full on credit', 2),
  ('payment_mode', 'fullyadvance', 3),
  ('payment_mode', 'na', 4),
  ('payment_mode', 'pdc', 5),
  ('payment_mode', 'pi against advance', 6),
  ('payment_mode', 'partial advance', 7),
  ('payment_mode', 'partial advance+pdc', 8)
ON CONFLICT (category, value) DO NOTHING;
