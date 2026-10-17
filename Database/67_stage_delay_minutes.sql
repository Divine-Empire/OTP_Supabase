-- =====================================================================
-- 67_stage_delay_minutes.sql
--
-- Every OTP stage table gets delay_minutes (integer): how many minutes late
-- the stage was actually processed against its planned timestamp.
--
--   delay_minutes = max(0, actual - planned) in whole minutes
--
-- Late -> positive minutes, on time / early -> 0, no planned date -> NULL.
-- (SSS/LTO use the same "set by a BEFORE INSERT trigger" shape.)
--
-- The planned timestamp lives on the PARENT row, not the stage row:
--   otp_orders_acceptable        <- otp_orders.order_acceptable_planned
--   otp_proforma_invoice         <- otp_orders_acceptable.proforma_invoice_planned
--   otp_debit_note               <- otp_orders_acceptable.debit_note_planned
--   otp_check_inventory          <- otp_orders_acceptable.check_inventory_planned
--                                   (FIRST scan of an order only — repeat
--                                   scans have no planned date of their own)
--   otp_debit_note_for_invoice   <- otp_pre_invoice_queue.debit_note_planned
--   otp_make_invoice             <- otp_pre_invoice_queue.make_invoice_planned
--   otp_calibration_certificate  <- otp_make_invoice.calibration_planned
--   otp_packaging_transport      <- otp_make_invoice.packaging_transport_planned
--   otp_client_confirmation      <- otp_packaging_transport.client_confirmation_planned
-- otp_indent_creation, otp_pre_invoice_queue and otp_credit_note have NO
-- planned date, so their delay_minutes column exists (same shape everywhere)
-- but is always NULL.
--
-- "Actual" is the row's created_at, EXCEPT otp_packaging_transport: its row
-- is created as a photos-only draft and only later submitted, so actual =
-- the moment status becomes 'submitted' (trigger runs on INSERT and on the
-- draft -> submitted UPDATE).
--
-- Backfill: one pass over existing rows. 13 submitted packaging rows are
-- deliberately left NULL — Database/65 rewrote their updated_at (the only
-- record of their real submit time) to the migration timestamp.
--
-- NOTE: as first applied, this migration's backfill UPDATEs also re-stamped
-- updated_at on every row they touched; Database/68 repairs that and stops
-- delay-only updates from ever moving updated_at again.
--
-- otp_recalc_delays() is the daily pg_cron safety net: it only fills rows
-- whose delay is still NULL although a planned date is now known. It never
-- touches otp_packaging_transport (its actual time can't be reconstructed
-- later), and it never overwrites an existing value.
-- =====================================================================

ALTER TABLE public.otp_orders_acceptable       ADD COLUMN IF NOT EXISTS delay_minutes integer;
ALTER TABLE public.otp_proforma_invoice        ADD COLUMN IF NOT EXISTS delay_minutes integer;
ALTER TABLE public.otp_debit_note              ADD COLUMN IF NOT EXISTS delay_minutes integer;
ALTER TABLE public.otp_check_inventory         ADD COLUMN IF NOT EXISTS delay_minutes integer;
ALTER TABLE public.otp_indent_creation         ADD COLUMN IF NOT EXISTS delay_minutes integer;
ALTER TABLE public.otp_pre_invoice_queue       ADD COLUMN IF NOT EXISTS delay_minutes integer;
ALTER TABLE public.otp_debit_note_for_invoice  ADD COLUMN IF NOT EXISTS delay_minutes integer;
ALTER TABLE public.otp_make_invoice            ADD COLUMN IF NOT EXISTS delay_minutes integer;
ALTER TABLE public.otp_calibration_certificate ADD COLUMN IF NOT EXISTS delay_minutes integer;
ALTER TABLE public.otp_packaging_transport     ADD COLUMN IF NOT EXISTS delay_minutes integer;
ALTER TABLE public.otp_client_confirmation     ADD COLUMN IF NOT EXISTS delay_minutes integer;
ALTER TABLE public.otp_credit_note             ADD COLUMN IF NOT EXISTS delay_minutes integer;

CREATE OR REPLACE FUNCTION public.otp_delay_minutes(p_planned timestamptz, p_actual timestamptz)
RETURNS integer
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN p_planned IS NULL OR p_actual IS NULL THEN NULL
    ELSE GREATEST(0, round(extract(epoch FROM (p_actual - p_planned)) / 60))::integer
  END
$$;

-- ---------------------------------------------------------------------
-- BEFORE INSERT triggers (one small function per stage: each reads its own
-- parent's planned column).
-- ---------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.otp_trg_orders_acceptable_set_delay() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.delay_minutes := public.otp_delay_minutes(
    (SELECT o.order_acceptable_planned FROM public.otp_orders o WHERE o.id = NEW.order_id),
    NEW.created_at);
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.otp_trg_proforma_invoice_set_delay() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.delay_minutes := public.otp_delay_minutes(
    (SELECT oa.proforma_invoice_planned FROM public.otp_orders_acceptable oa WHERE oa.order_id = NEW.order_id ORDER BY oa.created_at DESC LIMIT 1),
    NEW.created_at);
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.otp_trg_debit_note_set_delay() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.delay_minutes := public.otp_delay_minutes(
    (SELECT oa.debit_note_planned FROM public.otp_orders_acceptable oa WHERE oa.order_id = NEW.order_id ORDER BY oa.created_at DESC LIMIT 1),
    NEW.created_at);
  RETURN NEW;
END $$;

-- Only an order's FIRST scan is measured against check_inventory_planned.
CREATE OR REPLACE FUNCTION public.otp_trg_check_inventory_set_delay() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.otp_check_inventory ci WHERE ci.order_id = NEW.order_id) THEN
    NEW.delay_minutes := NULL;
  ELSE
    NEW.delay_minutes := public.otp_delay_minutes(
      (SELECT oa.check_inventory_planned FROM public.otp_orders_acceptable oa WHERE oa.order_id = NEW.order_id ORDER BY oa.created_at DESC LIMIT 1),
      NEW.created_at);
  END IF;
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.otp_trg_debit_note_for_invoice_set_delay() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.delay_minutes := public.otp_delay_minutes(
    (SELECT q.debit_note_planned FROM public.otp_pre_invoice_queue q WHERE q.id = NEW.pre_invoice_queue_id),
    NEW.created_at);
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.otp_trg_make_invoice_set_delay() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.delay_minutes := public.otp_delay_minutes(
    (SELECT q.make_invoice_planned FROM public.otp_pre_invoice_queue q WHERE q.id = NEW.pre_invoice_queue_id),
    NEW.created_at);
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.otp_trg_calibration_certificate_set_delay() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.delay_minutes := public.otp_delay_minutes(
    (SELECT mi.calibration_planned FROM public.otp_make_invoice mi WHERE mi.id = NEW.make_invoice_id),
    NEW.created_at);
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.otp_trg_client_confirmation_set_delay() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.delay_minutes := public.otp_delay_minutes(
    (SELECT pt.client_confirmation_planned FROM public.otp_packaging_transport pt WHERE pt.id = NEW.packaging_transport_id),
    NEW.created_at);
  RETURN NEW;
END $$;

-- Draft rows carry no delay; it is stamped the moment the row becomes
-- 'submitted' (INSERT as submitted, or the draft -> submitted UPDATE). A
-- later edit of an already-submitted row never re-measures it. (OLD is only
-- touched on UPDATE — plpgsql errors on OLD in an INSERT trigger.)
CREATE OR REPLACE FUNCTION public.otp_trg_packaging_transport_set_delay() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  v_planned timestamptz;
BEGIN
  IF NEW.status = 'submitted' THEN
    IF TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'submitted' THEN
      SELECT mi.packaging_transport_planned INTO v_planned FROM public.otp_make_invoice mi WHERE mi.id = NEW.make_invoice_id;
      NEW.delay_minutes := public.otp_delay_minutes(v_planned, now());
    END IF;
  ELSE
    NEW.delay_minutes := NULL;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS otp_trg_orders_acceptable_set_delay ON public.otp_orders_acceptable;
CREATE TRIGGER otp_trg_orders_acceptable_set_delay BEFORE INSERT ON public.otp_orders_acceptable
  FOR EACH ROW EXECUTE FUNCTION public.otp_trg_orders_acceptable_set_delay();

DROP TRIGGER IF EXISTS otp_trg_proforma_invoice_set_delay ON public.otp_proforma_invoice;
CREATE TRIGGER otp_trg_proforma_invoice_set_delay BEFORE INSERT ON public.otp_proforma_invoice
  FOR EACH ROW EXECUTE FUNCTION public.otp_trg_proforma_invoice_set_delay();

DROP TRIGGER IF EXISTS otp_trg_debit_note_set_delay ON public.otp_debit_note;
CREATE TRIGGER otp_trg_debit_note_set_delay BEFORE INSERT ON public.otp_debit_note
  FOR EACH ROW EXECUTE FUNCTION public.otp_trg_debit_note_set_delay();

DROP TRIGGER IF EXISTS otp_trg_check_inventory_set_delay ON public.otp_check_inventory;
CREATE TRIGGER otp_trg_check_inventory_set_delay BEFORE INSERT ON public.otp_check_inventory
  FOR EACH ROW EXECUTE FUNCTION public.otp_trg_check_inventory_set_delay();

DROP TRIGGER IF EXISTS otp_trg_debit_note_for_invoice_set_delay ON public.otp_debit_note_for_invoice;
CREATE TRIGGER otp_trg_debit_note_for_invoice_set_delay BEFORE INSERT ON public.otp_debit_note_for_invoice
  FOR EACH ROW EXECUTE FUNCTION public.otp_trg_debit_note_for_invoice_set_delay();

DROP TRIGGER IF EXISTS otp_trg_make_invoice_set_delay ON public.otp_make_invoice;
CREATE TRIGGER otp_trg_make_invoice_set_delay BEFORE INSERT ON public.otp_make_invoice
  FOR EACH ROW EXECUTE FUNCTION public.otp_trg_make_invoice_set_delay();

DROP TRIGGER IF EXISTS otp_trg_calibration_certificate_set_delay ON public.otp_calibration_certificate;
CREATE TRIGGER otp_trg_calibration_certificate_set_delay BEFORE INSERT ON public.otp_calibration_certificate
  FOR EACH ROW EXECUTE FUNCTION public.otp_trg_calibration_certificate_set_delay();

DROP TRIGGER IF EXISTS otp_trg_client_confirmation_set_delay ON public.otp_client_confirmation;
CREATE TRIGGER otp_trg_client_confirmation_set_delay BEFORE INSERT ON public.otp_client_confirmation
  FOR EACH ROW EXECUTE FUNCTION public.otp_trg_client_confirmation_set_delay();

DROP TRIGGER IF EXISTS otp_trg_packaging_transport_set_delay ON public.otp_packaging_transport;
CREATE TRIGGER otp_trg_packaging_transport_set_delay BEFORE INSERT OR UPDATE ON public.otp_packaging_transport
  FOR EACH ROW EXECUTE FUNCTION public.otp_trg_packaging_transport_set_delay();

-- ---------------------------------------------------------------------
-- Fill-the-gaps pass: also the one-time backfill for every table except
-- otp_packaging_transport. Only touches rows whose delay is still NULL, so
-- it is idempotent and never overwrites a value a trigger already set.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.otp_recalc_delays() RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  n integer;
  res jsonb := '{}'::jsonb;
BEGIN
  UPDATE public.otp_orders_acceptable t
     SET delay_minutes = public.otp_delay_minutes(o.order_acceptable_planned, t.created_at)
    FROM public.otp_orders o
   WHERE o.id = t.order_id AND t.delay_minutes IS NULL
     AND public.otp_delay_minutes(o.order_acceptable_planned, t.created_at) IS NOT NULL;
  GET DIAGNOSTICS n = ROW_COUNT; res := res || jsonb_build_object('otp_orders_acceptable', n);

  UPDATE public.otp_proforma_invoice t
     SET delay_minutes = public.otp_delay_minutes(oa.proforma_invoice_planned, t.created_at)
    FROM public.otp_orders_acceptable oa
   WHERE oa.order_id = t.order_id AND t.delay_minutes IS NULL
     AND public.otp_delay_minutes(oa.proforma_invoice_planned, t.created_at) IS NOT NULL;
  GET DIAGNOSTICS n = ROW_COUNT; res := res || jsonb_build_object('otp_proforma_invoice', n);

  UPDATE public.otp_debit_note t
     SET delay_minutes = public.otp_delay_minutes(oa.debit_note_planned, t.created_at)
    FROM public.otp_orders_acceptable oa
   WHERE oa.order_id = t.order_id AND t.delay_minutes IS NULL
     AND public.otp_delay_minutes(oa.debit_note_planned, t.created_at) IS NOT NULL;
  GET DIAGNOSTICS n = ROW_COUNT; res := res || jsonb_build_object('otp_debit_note', n);

  UPDATE public.otp_check_inventory t
     SET delay_minutes = public.otp_delay_minutes(oa.check_inventory_planned, t.created_at)
    FROM public.otp_orders_acceptable oa
   WHERE oa.order_id = t.order_id AND t.delay_minutes IS NULL
     AND t.id = (SELECT x.id FROM public.otp_check_inventory x WHERE x.order_id = t.order_id ORDER BY x.created_at, x.id LIMIT 1)
     AND public.otp_delay_minutes(oa.check_inventory_planned, t.created_at) IS NOT NULL;
  GET DIAGNOSTICS n = ROW_COUNT; res := res || jsonb_build_object('otp_check_inventory', n);

  UPDATE public.otp_debit_note_for_invoice t
     SET delay_minutes = public.otp_delay_minutes(q.debit_note_planned, t.created_at)
    FROM public.otp_pre_invoice_queue q
   WHERE q.id = t.pre_invoice_queue_id AND t.delay_minutes IS NULL
     AND public.otp_delay_minutes(q.debit_note_planned, t.created_at) IS NOT NULL;
  GET DIAGNOSTICS n = ROW_COUNT; res := res || jsonb_build_object('otp_debit_note_for_invoice', n);

  UPDATE public.otp_make_invoice t
     SET delay_minutes = public.otp_delay_minutes(q.make_invoice_planned, t.created_at)
    FROM public.otp_pre_invoice_queue q
   WHERE q.id = t.pre_invoice_queue_id AND t.delay_minutes IS NULL
     AND public.otp_delay_minutes(q.make_invoice_planned, t.created_at) IS NOT NULL;
  GET DIAGNOSTICS n = ROW_COUNT; res := res || jsonb_build_object('otp_make_invoice', n);

  UPDATE public.otp_calibration_certificate t
     SET delay_minutes = public.otp_delay_minutes(mi.calibration_planned, t.created_at)
    FROM public.otp_make_invoice mi
   WHERE mi.id = t.make_invoice_id AND t.delay_minutes IS NULL
     AND public.otp_delay_minutes(mi.calibration_planned, t.created_at) IS NOT NULL;
  GET DIAGNOSTICS n = ROW_COUNT; res := res || jsonb_build_object('otp_calibration_certificate', n);

  UPDATE public.otp_client_confirmation t
     SET delay_minutes = public.otp_delay_minutes(pt.client_confirmation_planned, t.created_at)
    FROM public.otp_packaging_transport pt
   WHERE pt.id = t.packaging_transport_id AND t.delay_minutes IS NULL
     AND public.otp_delay_minutes(pt.client_confirmation_planned, t.created_at) IS NOT NULL;
  GET DIAGNOSTICS n = ROW_COUNT; res := res || jsonb_build_object('otp_client_confirmation', n);

  RETURN res;
END $$;

SELECT public.otp_recalc_delays();

-- ---------------------------------------------------------------------
-- otp_packaging_transport backfill (actual = updated_at at submit), run
-- once and NOT part of the daily job. Skips the 13 rows Database/65
-- rewrote (updated_at = 2026-10-12 07:40 UTC), whose real submit time is
-- gone, and any draft.
-- ---------------------------------------------------------------------
UPDATE public.otp_packaging_transport pt
   SET delay_minutes = public.otp_delay_minutes(mi.packaging_transport_planned, pt.updated_at)
  FROM public.otp_make_invoice mi
 WHERE mi.id = pt.make_invoice_id
   AND pt.status = 'submitted'
   AND pt.delay_minutes IS NULL
   AND NOT (pt.updated_at >= '2026-10-12 07:39:00+00' AND pt.updated_at < '2026-10-12 07:41:00+00');

-- ---------------------------------------------------------------------
-- Daily safety net, 00:10 IST (18:40 UTC; the existing call-tracker job
-- already runs at 18:30 UTC).
-- ---------------------------------------------------------------------
DO $$
BEGIN
  PERFORM cron.unschedule(jobid) FROM cron.job WHERE jobname = 'otp_recalc_delays';
  PERFORM cron.schedule('otp_recalc_delays', '40 18 * * *', 'SELECT public.otp_recalc_delays()');
END $$;
