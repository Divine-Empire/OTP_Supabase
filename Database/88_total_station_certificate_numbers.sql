-- =====================================================================
-- 88: Total Station certificate numbers  (N<calendar year><5-digit sequence>, e.g. N202600227)
--
-- Same scheme as Auto Level (87) but its own counter, so the two series never share numbers.
-- One row per calendar year, advanced atomically (row-locked upsert).
-- A year with no row starts at 1. To continue from an existing number, set
--   INSERT INTO otp_total_station_number_counter (year, last_value) VALUES (2026, <last used>)
--   ON CONFLICT (year) DO UPDATE SET last_value = EXCLUDED.last_value;
-- Run in the Supabase SQL editor. Safe to re-run.
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.otp_total_station_number_counter (
  year        integer PRIMARY KEY,
  last_value  integer NOT NULL,           -- last sequence handed out
  updated_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.otp_total_station_number_counter ENABLE ROW LEVEL SECURITY; -- no policies: service role only

CREATE OR REPLACE FUNCTION public.otp_peek_total_station_number()
RETURNS text
LANGUAGE plpgsql STABLE
AS $$
DECLARE
  v_year integer := EXTRACT(YEAR FROM (now() AT TIME ZONE 'Asia/Kolkata'))::int;
  v_last integer;
BEGIN
  SELECT last_value INTO v_last FROM public.otp_total_station_number_counter WHERE year = v_year;
  RETURN 'N' || v_year || LPAD((COALESCE(v_last, 0) + 1)::text, 5, '0');
END;
$$;

CREATE OR REPLACE FUNCTION public.otp_reserve_total_station_numbers(p_count integer)
RETURNS text[]
LANGUAGE plpgsql
AS $$
DECLARE
  v_year integer := EXTRACT(YEAR FROM (now() AT TIME ZONE 'Asia/Kolkata'))::int;
  v_last integer;
BEGIN
  IF p_count IS NULL OR p_count < 1 OR p_count > 500 THEN
    RAISE EXCEPTION 'p_count must be between 1 and 500';
  END IF;

  INSERT INTO public.otp_total_station_number_counter AS c (year, last_value)
  VALUES (v_year, p_count)
  ON CONFLICT (year) DO UPDATE
    SET last_value = c.last_value + p_count, updated_at = now()
  RETURNING c.last_value INTO v_last;

  RETURN ARRAY(
    SELECT 'N' || v_year || LPAD(n::text, 5, '0')
    FROM generate_series(v_last - p_count + 1, v_last) AS n
    ORDER BY n
  );
END;
$$;

REVOKE ALL ON FUNCTION public.otp_reserve_total_station_numbers(integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.otp_peek_total_station_number() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.otp_reserve_total_station_numbers(integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.otp_peek_total_station_number() TO service_role;
