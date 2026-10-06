-- =====================================================================
-- 58_history_edit_notifications_and_wave_merge.sql
--
-- 1. otp_notifications — in-app feed (bell icon). First user: Packing List
--    History edits (PATCH /api/otp-supabase/packing-list), each row carrying
--    the before/after per item in `changes`. Read tracking is a plain
--    username array — enough at this scale, no per-user receipt table.
--
-- 2. otp_pre_invoice_queue.merged_source_ids — when several waves of one
--    order are billed together (otp_merge_queue_waves below) they collapse
--    into one queue row; source_id can only point at one otp_check_inventory
--    wave, so this keeps the rest. Packing List History-edit uses it to know
--    a scan wave is already inside a processed (merged) queue row.
--
-- 3. otp_merge_queue_waves(primary, others, stage) — atomically folds the
--    `others` queue rows into `primary`: same order only, all still pending
--    at that stage; items concatenated; released-stock and (at most one)
--    Delivery Note (Inv.) re-pointed to the primary so the ON DELETE CASCADE
--    on those FKs can't silently drop them; then the others are deleted.
--    Downstream stages then just see one normal wave -> one invoice.
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.otp_notifications (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stage       text NOT NULL,
  order_id    uuid REFERENCES public.otp_orders(id) ON DELETE CASCADE,
  order_no    text,
  crm_name    text,
  message     text NOT NULL,
  changes     jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_by  text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  read_by     text[] NOT NULL DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_otp_notifications_stage_created ON public.otp_notifications (stage, created_at DESC);

ALTER TABLE public.otp_notifications DISABLE ROW LEVEL SECURITY;

ALTER TABLE public.otp_pre_invoice_queue
  ADD COLUMN IF NOT EXISTS merged_source_ids uuid[] NOT NULL DEFAULT '{}';

CREATE OR REPLACE FUNCTION public.otp_merge_queue_waves(p_primary uuid, p_others uuid[], p_stage text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_order uuid;
  v_bad   integer;
  v_found integer;
  v_dn    integer;
BEGIN
  IF p_others IS NULL OR cardinality(p_others) = 0 THEN
    RETURN;
  END IF;
  IF p_primary = ANY(p_others) THEN
    RAISE EXCEPTION 'Primary wave is also listed among the waves to merge';
  END IF;
  IF p_stage NOT IN ('pre_invoice', 'make_invoice') THEN
    RAISE EXCEPTION 'Unknown merge stage %', p_stage;
  END IF;

  SELECT order_id INTO v_order FROM otp_pre_invoice_queue WHERE id = p_primary FOR UPDATE;
  IF v_order IS NULL THEN
    RAISE EXCEPTION 'Queue row not found';
  END IF;

  SELECT count(*) INTO v_found FROM (
    SELECT id FROM otp_pre_invoice_queue WHERE id = ANY(p_others) FOR UPDATE
  ) locked;
  IF v_found <> cardinality(p_others) THEN
    RAISE EXCEPTION 'One or more selected waves no longer exist';
  END IF;

  SELECT count(*) INTO v_bad
  FROM otp_pre_invoice_queue q
  WHERE q.id = ANY(p_others || p_primary)
    AND (
      q.order_id <> v_order
      OR (p_stage = 'pre_invoice' AND q.status <> 'pending')
      OR (p_stage = 'make_invoice' AND (
            q.status <> 'invoiced'
            OR q.make_invoice_planned IS NULL
            OR EXISTS (SELECT 1 FROM otp_make_invoice m WHERE m.pre_invoice_queue_id = q.id)))
    );
  IF v_bad > 0 THEN
    RAISE EXCEPTION 'All selected waves must belong to the same order and still be pending at this stage';
  END IF;

  SELECT count(*) INTO v_dn FROM otp_debit_note_for_invoice WHERE pre_invoice_queue_id = ANY(p_others || p_primary);
  IF v_dn > 1 THEN
    RAISE EXCEPTION 'Only one of the selected waves can have a Delivery Note (Inv.)';
  END IF;
  UPDATE otp_debit_note_for_invoice SET pre_invoice_queue_id = p_primary WHERE pre_invoice_queue_id = ANY(p_others);

  UPDATE otp_released_stock SET source_queue_id = p_primary WHERE source_queue_id = ANY(p_others);

  UPDATE otp_pre_invoice_queue p SET
    items = p.items || COALESCE((
      SELECT jsonb_agg(e ORDER BY o.created_at)
      FROM otp_pre_invoice_queue o, jsonb_array_elements(o.items) e
      WHERE o.id = ANY(p_others)
    ), '[]'::jsonb),
    merged_source_ids = (
      SELECT COALESCE(array_agg(DISTINCT x), '{}')
      FROM (
        SELECT unnest(p.merged_source_ids) AS x
        UNION SELECT p.source_id
        UNION SELECT o.source_id FROM otp_pre_invoice_queue o WHERE o.id = ANY(p_others)
        UNION SELECT unnest(o.merged_source_ids) FROM otp_pre_invoice_queue o WHERE o.id = ANY(p_others)
      ) z
      WHERE x IS NOT NULL
    )
  WHERE p.id = p_primary;

  DELETE FROM otp_pre_invoice_queue WHERE id = ANY(p_others);
END;
$$;
