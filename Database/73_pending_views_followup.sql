-- 73: follow-up to 72_pending_views_and_rpc.sql
--
-- Make Invoice's Pending view used a hand-picked subset of otp_orders columns
-- in its "order" object, so any column the Make Invoice page/mapper reads that
-- was not on that list (and any column added to otp_orders later) would come
-- back undefined. The old route did `order:otp_orders(*, shortages:..., indents:...)`,
-- i.e. every column plus the two child arrays. Rebuild the view to match that
-- exactly: all of o.* merged with the same two aggregates.
--
-- Safe to re-run (CREATE OR REPLACE). Column list/order of the view itself is
-- unchanged (q.* + "order"), so no dependent object breaks.

CREATE OR REPLACE VIEW public.otp_v_make_invoice_pending AS
SELECT
  q.*,
  to_jsonb(o.*) || jsonb_build_object(
    'shortages', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('shortage_qty', s.shortage_qty, 'status', s.status))
      FROM public.otp_check_inventory_shortage s
      WHERE s.order_id = o.id
    ), '[]'::jsonb),
    'indents', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('items', ic.items, 'material_received', ic.material_received))
      FROM public.otp_indent_creation ic
      WHERE ic.order_id = o.id
    ), '[]'::jsonb)
  ) AS "order"
FROM public.otp_pre_invoice_queue q
JOIN public.otp_orders o ON o.id = q.order_id
WHERE q.make_invoice_planned IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.otp_make_invoice mi
    WHERE mi.pre_invoice_queue_id = q.id
  );

-- Anti-join / count support indexes (IF NOT EXISTS: no-ops where 72 or older
-- migrations already created them). Each backs a NOT EXISTS probe used by a
-- pending view or by otp_pending_counts().
CREATE INDEX IF NOT EXISTS idx_otp_calibration_certificate_make_invoice_id ON public.otp_calibration_certificate (make_invoice_id);
CREATE INDEX IF NOT EXISTS idx_otp_packaging_transport_make_invoice_id     ON public.otp_packaging_transport (make_invoice_id);
CREATE INDEX IF NOT EXISTS idx_otp_client_confirmation_pt_id               ON public.otp_client_confirmation (packaging_transport_id);
CREATE INDEX IF NOT EXISTS idx_otp_debit_note_for_invoice_queue_id         ON public.otp_debit_note_for_invoice (pre_invoice_queue_id);
CREATE INDEX IF NOT EXISTS idx_otp_debit_note_order_id                     ON public.otp_debit_note (order_id);
CREATE INDEX IF NOT EXISTS idx_otp_proforma_invoice_order_id               ON public.otp_proforma_invoice (order_id);
