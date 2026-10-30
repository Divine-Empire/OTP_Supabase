-- =====================================================================
-- 82_calibration_certificate_formats.sql
--
-- Calibration Certificate stage support:
--   1. lto_items.calibration_certificate_format: which certificate layout an item uses
--      (e.g. 'common_format'). Filled once from the item-list CSV by
--      scripts/import-calibration-formats.mjs, edited per item later.
--   2. Certificate numbers  DE/N-LAB/<FY>/<n>, e.g. DE/N-LAB/2026-27/1800.
--      The financial year runs April-March (Asia/Kolkata). Each FY starts again at 1800 and
--      every number is last + 1. A plain Postgres SEQUENCE cannot restart per year, so the
--      counter lives in a one-row-per-FY table that is advanced atomically (row-locked upsert).
--   3. Storage bucket for the generated certificate PDFs.
--
-- Nothing about the certificate contents is stored: the PDF itself is the record.
-- Run in the Supabase SQL editor. Safe to re-run.
-- =====================================================================

ALTER TABLE public.lto_items
  ADD COLUMN IF NOT EXISTS calibration_certificate_format text;

-- ---------------------------------------------------------------------
-- Certificate number counter (one row per financial year)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.otp_certificate_number_counter (
  fy          text PRIMARY KEY,           -- '2026-27'
  last_value  integer NOT NULL,           -- last number handed out
  updated_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.otp_certificate_number_counter ENABLE ROW LEVEL SECURITY; -- no policies: service role only

CREATE OR REPLACE FUNCTION public.otp_current_financial_year()
RETURNS text
LANGUAGE sql STABLE
AS $$
  SELECT CASE
    WHEN EXTRACT(MONTH FROM (now() AT TIME ZONE 'Asia/Kolkata')) >= 4
      THEN EXTRACT(YEAR FROM (now() AT TIME ZONE 'Asia/Kolkata'))::int
    ELSE EXTRACT(YEAR FROM (now() AT TIME ZONE 'Asia/Kolkata'))::int - 1
  END || '-' || LPAD(
    ((CASE
      WHEN EXTRACT(MONTH FROM (now() AT TIME ZONE 'Asia/Kolkata')) >= 4
        THEN EXTRACT(YEAR FROM (now() AT TIME ZONE 'Asia/Kolkata'))::int
      ELSE EXTRACT(YEAR FROM (now() AT TIME ZONE 'Asia/Kolkata'))::int - 1
    END + 1) % 100)::text, 2, '0');
$$;

-- The number the next reservation will start from, WITHOUT consuming it (for form prefill).
CREATE OR REPLACE FUNCTION public.otp_peek_certificate_number()
RETURNS text
LANGUAGE plpgsql STABLE
AS $$
DECLARE
  v_fy   text := public.otp_current_financial_year();
  v_last integer;
BEGIN
  SELECT last_value INTO v_last FROM public.otp_certificate_number_counter WHERE fy = v_fy;
  RETURN 'DE/N-LAB/' || v_fy || '/' || (COALESCE(v_last, 1799) + 1);
END;
$$;

-- Reserves p_count consecutive numbers atomically; concurrent callers never get the same one.
CREATE OR REPLACE FUNCTION public.otp_reserve_certificate_numbers(p_count integer)
RETURNS text[]
LANGUAGE plpgsql
AS $$
DECLARE
  v_fy   text := public.otp_current_financial_year();
  v_last integer;
BEGIN
  IF p_count IS NULL OR p_count < 1 OR p_count > 500 THEN
    RAISE EXCEPTION 'p_count must be between 1 and 500';
  END IF;

  INSERT INTO public.otp_certificate_number_counter AS c (fy, last_value)
  VALUES (v_fy, 1799 + p_count)
  ON CONFLICT (fy) DO UPDATE
    SET last_value = c.last_value + p_count, updated_at = now()
  RETURNING c.last_value INTO v_last;

  RETURN ARRAY(
    SELECT 'DE/N-LAB/' || v_fy || '/' || n
    FROM generate_series(v_last - p_count + 1, v_last) AS n
    ORDER BY n
  );
END;
$$;

REVOKE ALL ON FUNCTION public.otp_reserve_certificate_numbers(integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.otp_peek_certificate_number() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.otp_reserve_certificate_numbers(integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.otp_peek_certificate_number() TO service_role;

-- ---------------------------------------------------------------------
-- Bucket for certificate PDFs (public read, like otp-attachments)
-- ---------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('otp-calibration-certificates', 'otp-calibration-certificates', true, 10485760, ARRAY['application/pdf'])
ON CONFLICT (id) DO NOTHING;
