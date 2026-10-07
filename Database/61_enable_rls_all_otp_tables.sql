-- =====================================================================
-- 61_enable_rls_all_otp_tables.sql
--
-- Every earlier otp_* migration disabled RLS on its own new table
-- (DISABLE ROW LEVEL SECURITY) — that convention is now reversed.
--
-- The app's only Supabase client (lib/supabase.ts's getSupabaseAdmin())
-- runs server-side only, inside app/api/otp-supabase/*/route.ts handlers,
-- authenticated with SUPABASE_SERVICE_ROLE_KEY — service_role always
-- bypasses RLS regardless of this setting. No otp_* table is ever queried
-- from the browser (grepped the whole app/components/lib tree: no
-- NEXT_PUBLIC_SUPABASE_* usage, no client-side createClient() call
-- anywhere). So enabling RLS here is a pure hardening step (closes off
-- the public anon key — shipped in the browser bundle by nature — from
-- being able to read/write otp_* data directly via Supabase's REST API)
-- with zero effect on how the app itself talks to these tables.
--
-- No policies are added: every other otp_* table already has RLS enabled
-- with zero policies (default-deny for anon/authenticated), confirmed via
-- pg_policies — this just brings the 3 tables added this session in line
-- with that same already-established posture, not a new one.
-- =====================================================================

ALTER TABLE public.otp_credit_note ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.otp_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.otp_released_stock ENABLE ROW LEVEL SECURITY;
