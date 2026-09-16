-- =====================================================================
-- 18_otp_users.sql
--
-- MUST BE RUN AGAINST THE SAME PRODUCTION DATABASE as 13_/14_/15_/16_/17_
-- (nfwtbrmqvsejwwvraanf.supabase.co).
--
-- otp_users didn't actually exist in the DB yet even though the login
-- page, auth-provider, Settings > User Management tab, and
-- app/api/otp-supabase/users/route.ts already assume it (columns below
-- match that route exactly). Creates the table and seeds exactly two
-- users as requested — not the older 15-user seed in 09_seed_users.sql,
-- which belongs to a broader schema plan that was never applied.
--
-- Password is stored as plain text in password_hash for now (matches
-- the existing route.ts, which does a plain .eq("password_hash", ...)
-- comparison) — real hashing is a later improvement, not in this scope.
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.otp_users (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username              text UNIQUE NOT NULL,
  full_name             text NOT NULL,
  password_hash         text NOT NULL,
  role                  text NOT NULL DEFAULT 'user' CHECK (role IN ('super_admin', 'admin', 'user')),
  assigned_steps        text[] NOT NULL DEFAULT '{}',
  deploy_link           text,
  warehouse_page_access text,
  location              text,
  is_active             boolean NOT NULL DEFAULT true,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_otp_users_username ON public.otp_users (username);

ALTER TABLE public.otp_users DISABLE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS otp_trg_users_updated_at ON public.otp_users;
CREATE TRIGGER otp_trg_users_updated_at
  BEFORE UPDATE ON public.otp_users
  FOR EACH ROW
  EXECUTE FUNCTION public.otp_trg_set_updated_at();

-- Seed: 2 users, as requested.
INSERT INTO public.otp_users (username, full_name, password_hash, role, assigned_steps, warehouse_page_access, location)
VALUES
  (
    'admin', 'ADMIN', 'admin123', 'admin',
    ARRAY['dashboard', 'order-acceptable', 'check-inventory', 'material-received', 'senior-approval',
          'disp-form', 'make-invoice', 'warehouse', 'calibration', 'update-delivery', 'order-cancel',
          'credit-note', 'ims', 'material-tested', 'settings'],
    'all', 'all'
  ),
  (
    'user', 'USER', 'user123', 'user',
    ARRAY['dashboard', 'order-acceptable', 'check-inventory'],
    NULL, NULL
  )
ON CONFLICT (username) DO UPDATE SET
  full_name      = EXCLUDED.full_name,
  password_hash  = EXCLUDED.password_hash,
  role           = EXCLUDED.role,
  assigned_steps = EXCLUDED.assigned_steps,
  updated_at     = now();
