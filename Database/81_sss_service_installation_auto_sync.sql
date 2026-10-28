-- =====================================================================
-- 81_sss_service_installation_auto_sync.sql
--
-- Service Installation rows now sync automatically from the OTP flow:
--
--   Pre-Invoice submit  (otp_pre_invoice_queue: pending -> invoiced)
--     -> one sss_service_installation row per item flagged installation='Yes'
--        (SI numbers from a sequence). The new row's si_no is stamped back
--        into that item inside the wave's items JSON, so the exact link
--        survives Make Invoice's wave merge (which deletes merged waves and
--        concatenates their items) and any later items copy.
--
--   Make Invoice        (otp_make_invoice INSERT / UPDATE)
--     -> invoice_no / invoice_date / invoice_copy_upload are copied onto the
--        rows named by the si_no stamps in that invoice's items. Fires on
--        UPDATE too, so an invoice edited from History flows through.
--        Legacy rows (no stamp) fall back to order_no + item_name (+ serial)
--        matching against rows that don't have an invoice yet.
--
-- Replaces the old browser-side POST /api/otp-supabase/service-installation
-- call from the Pre-Invoice page (best-effort, count+1 numbering).
-- Idempotent; safe to re-run.
-- =====================================================================

-- 1. Link column + numbering ------------------------------------------------
ALTER TABLE public.sss_service_installation
  ADD COLUMN IF NOT EXISTS order_id uuid REFERENCES public.otp_orders(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_sss_si_order_id ON public.sss_service_installation (order_id);

CREATE UNIQUE INDEX IF NOT EXISTS uq_sss_si_si_no
  ON public.sss_service_installation (si_no) WHERE si_no IS NOT NULL;

CREATE SEQUENCE IF NOT EXISTS public.sss_service_installation_si_seq;

SELECT setval(
  'public.sss_service_installation_si_seq',
  GREATEST(
    COALESCE((SELECT max(substring(si_no FROM '^SI-(\d+)$')::bigint)
              FROM public.sss_service_installation), 0),
    (SELECT last_value FROM public.sss_service_installation_si_seq)
  ),
  true
);

UPDATE public.sss_service_installation s
SET order_id = o.id
FROM public.otp_orders o
WHERE s.order_id IS NULL AND o.order_no = s.order_no;

-- 2. Pre-Invoice -> create rows + stamp si_no -----------------------------------
CREATE OR REPLACE FUNCTION public.otp_trg_pre_invoice_sync_service_installation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_order   record;
  v_elem    jsonb;
  v_items   jsonb := '[]'::jsonb;
  v_si      text;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM jsonb_array_elements(NEW.items) e
    WHERE e->>'installation' = 'Yes' AND COALESCE(e->>'si_no', '') = ''
  ) THEN
    RETURN NEW;
  END IF;

  SELECT order_no, company_name, contact_person, phone_number
    INTO v_order
  FROM public.otp_orders WHERE id = NEW.order_id;

  FOR v_elem IN SELECT e FROM jsonb_array_elements(NEW.items) WITH ORDINALITY AS t(e, n) ORDER BY n LOOP
    IF v_elem->>'installation' = 'Yes' AND COALESCE(v_elem->>'si_no', '') = '' THEN
      v_si := 'SI-' || lpad(nextval('public.sss_service_installation_si_seq')::text, 3, '0');

      INSERT INTO public.sss_service_installation (
        order_no, order_id, is_installation_required, company_name,
        contact_person_name, contact_person_no, item_name, qty, serial,
        si_no, planned
      ) VALUES (
        v_order.order_no, NEW.order_id, 'Yes', v_order.company_name,
        NULLIF(v_order.contact_person, ''), NULLIF(v_order.phone_number, ''),
        NULLIF(v_elem->>'item_name', ''),
        COALESCE(NULLIF(v_elem->>'qty', '')::numeric, 0),
        NULLIF(v_elem->>'serial_no', ''),
        v_si, now()
      );

      v_elem := v_elem || jsonb_build_object('si_no', v_si);
    END IF;
    v_items := v_items || jsonb_build_array(v_elem);
  END LOOP;

  NEW.items := v_items;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS otp_trg_pre_invoice_sync_si ON public.otp_pre_invoice_queue;
CREATE TRIGGER otp_trg_pre_invoice_sync_si
  BEFORE UPDATE ON public.otp_pre_invoice_queue
  FOR EACH ROW
  WHEN (OLD.status = 'pending' AND NEW.status = 'invoiced')
  EXECUTE FUNCTION public.otp_trg_pre_invoice_sync_service_installation();

-- 3. Make Invoice -> copy invoice details ------------------------------------------
CREATE OR REPLACE FUNCTION public.sss_si_apply_invoice(
  p_order_id uuid,
  p_items    jsonb,
  p_inv_no   text,
  p_inv_date date,
  p_inv_url  text
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_elem jsonb;
BEGIN
  -- Exact: rows named by a si_no stamp.
  UPDATE public.sss_service_installation s
  SET invoice_no = p_inv_no, invoice_date = p_inv_date, invoice_copy_upload = p_inv_url
  WHERE s.si_no IN (
    SELECT e->>'si_no' FROM jsonb_array_elements(p_items) e
    WHERE COALESCE(e->>'si_no', '') <> ''
  )
  AND (s.invoice_no IS DISTINCT FROM p_inv_no
       OR s.invoice_date IS DISTINCT FROM p_inv_date
       OR s.invoice_copy_upload IS DISTINCT FROM p_inv_url);

  -- Legacy rows created before stamping existed: one still-uninvoiced row
  -- of the same order + item per unstamped installation item.
  FOR v_elem IN
    SELECT e FROM jsonb_array_elements(p_items) e
    WHERE e->>'installation' = 'Yes' AND COALESCE(e->>'si_no', '') = ''
  LOOP
    UPDATE public.sss_service_installation
    SET invoice_no = p_inv_no, invoice_date = p_inv_date, invoice_copy_upload = p_inv_url
    WHERE id = (
      SELECT s.id FROM public.sss_service_installation s
      WHERE s.order_id = p_order_id
        AND s.invoice_no IS NULL
        AND s.item_name IS NOT DISTINCT FROM NULLIF(v_elem->>'item_name', '')
      ORDER BY (s.serial IS NOT DISTINCT FROM NULLIF(v_elem->>'serial_no', '')) DESC, s.si_no
      LIMIT 1
      FOR UPDATE SKIP LOCKED
    );
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION public.otp_trg_make_invoice_sync_service_installation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  PERFORM public.sss_si_apply_invoice(
    NEW.order_id, NEW.items, NEW.invoice_number, NEW.invoice_date, NEW.invoice_upload_url);
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS otp_trg_make_invoice_sync_si ON public.otp_make_invoice;
CREATE TRIGGER otp_trg_make_invoice_sync_si
  AFTER INSERT OR UPDATE OF invoice_number, invoice_date, invoice_upload_url, items
  ON public.otp_make_invoice
  FOR EACH ROW
  EXECUTE FUNCTION public.otp_trg_make_invoice_sync_service_installation();

-- 4. One-time backfill: invoices made before this migration ------------------------
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT m.order_id, m.items, m.invoice_number, m.invoice_date, m.invoice_upload_url
    FROM public.otp_make_invoice m
    WHERE EXISTS (SELECT 1 FROM public.sss_service_installation s
                  WHERE s.order_id = m.order_id AND s.invoice_no IS NULL)
    ORDER BY m.created_at
  LOOP
    PERFORM public.sss_si_apply_invoice(
      r.order_id, r.items, r.invoice_number, r.invoice_date, r.invoice_upload_url);
  END LOOP;
END $$;
