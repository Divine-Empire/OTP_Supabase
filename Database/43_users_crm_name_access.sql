-- =====================================================================
-- 43_users_crm_name_access.sql
--
-- MUST BE RUN AGAINST THE SAME PRODUCTION DATABASE as 18_otp_users.sql.
--
-- 1. Drops 'super_admin' from otp_users.role — unused (no seeded/real user
--    has it, and the UI never let you create one), only 'admin'/'user' are
--    meaningful here.
--
-- 2. Adds otp_users.assigned_crm_names (text[]) — which otp_orders.crm_name
--    values a 'user'-role account can see, set from Settings > User
--    Management via a multi-select, same pattern as assigned_steps. Every
--    stage's Pending/History now filters rows by
--    row.crmName ∈ assigned_crm_names for role='user' (admin is
--    unrestricted, same as page access). Empty/NULL array = sees nothing
--    with a crm_name set (rows with no crm_name at all still show, same
--    as the old order-acceptable behaviour).
-- =====================================================================

ALTER TABLE public.otp_users
  DROP CONSTRAINT IF EXISTS otp_users_role_check;
ALTER TABLE public.otp_users
  ADD CONSTRAINT otp_users_role_check CHECK (role = ANY (ARRAY['admin'::text, 'user'::text]));

ALTER TABLE public.otp_users
  ADD COLUMN IF NOT EXISTS assigned_crm_names text[] NOT NULL DEFAULT '{}'::text[];
