-- ==============================================================================
-- 06_rls_policies.sql
-- Disable Row Level Security (RLS) on all OTP Database Tables
-- ==============================================================================

-- 1. Disable RLS on all 17 OTP tables
ALTER TABLE IF EXISTS otp_stage_tat          DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS otp_orders             DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS otp_order_items        DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS otp_order_acceptable   DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS otp_check_inventory    DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS otp_material_received  DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS otp_senior_approval    DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS otp_dispatches         DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS otp_dispatch_items     DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS otp_make_invoice       DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS otp_warehouse          DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS otp_material_receiving DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS otp_calibration        DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS otp_update_delivery    DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS otp_order_cancel       DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS otp_credit_note        DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS otp_users              DISABLE ROW LEVEL SECURITY;

-- 2. Drop existing policies if any were previously created
DROP POLICY IF EXISTS "service_role_all_otp_stage_tat"          ON otp_stage_tat;
DROP POLICY IF EXISTS "service_role_all_otp_orders"             ON otp_orders;
DROP POLICY IF EXISTS "service_role_all_otp_order_items"        ON otp_order_items;
DROP POLICY IF EXISTS "service_role_all_otp_order_acceptable"   ON otp_order_acceptable;
DROP POLICY IF EXISTS "service_role_all_otp_check_inventory"    ON otp_check_inventory;
DROP POLICY IF EXISTS "service_role_all_otp_material_received"  ON otp_material_received;
DROP POLICY IF EXISTS "service_role_all_otp_senior_approval"    ON otp_senior_approval;
DROP POLICY IF EXISTS "service_role_all_otp_dispatches"         ON otp_dispatches;
DROP POLICY IF EXISTS "service_role_all_otp_dispatch_items"     ON otp_dispatch_items;
DROP POLICY IF EXISTS "service_role_all_otp_make_invoice"       ON otp_make_invoice;
DROP POLICY IF EXISTS "service_role_all_otp_warehouse"          ON otp_warehouse;
DROP POLICY IF EXISTS "service_role_all_otp_material_receiving" ON otp_material_receiving;
DROP POLICY IF EXISTS "service_role_all_otp_calibration"        ON otp_calibration;
DROP POLICY IF EXISTS "service_role_all_otp_update_delivery"    ON otp_update_delivery;
DROP POLICY IF EXISTS "service_role_all_otp_order_cancel"       ON otp_order_cancel;
DROP POLICY IF EXISTS "service_role_all_otp_credit_note"        ON otp_credit_note;
DROP POLICY IF EXISTS "service_role_all_otp_users"              ON otp_users;

DROP POLICY IF EXISTS "anon_select_otp_stage_tat"          ON otp_stage_tat;
DROP POLICY IF EXISTS "anon_select_otp_orders"             ON otp_orders;
DROP POLICY IF EXISTS "anon_select_otp_order_items"        ON otp_order_items;
DROP POLICY IF EXISTS "anon_select_otp_order_acceptable"   ON otp_order_acceptable;
DROP POLICY IF EXISTS "anon_select_otp_check_inventory"    ON otp_check_inventory;
DROP POLICY IF EXISTS "anon_select_otp_material_received"  ON otp_material_received;
DROP POLICY IF EXISTS "anon_select_otp_senior_approval"    ON otp_senior_approval;
DROP POLICY IF EXISTS "anon_select_otp_dispatches"         ON otp_dispatches;
DROP POLICY IF EXISTS "anon_select_otp_dispatch_items"     ON otp_dispatch_items;
DROP POLICY IF EXISTS "anon_select_otp_make_invoice"       ON otp_make_invoice;
DROP POLICY IF EXISTS "anon_select_otp_warehouse"          ON otp_warehouse;
DROP POLICY IF EXISTS "anon_select_otp_material_receiving" ON otp_material_receiving;
DROP POLICY IF EXISTS "anon_select_otp_calibration"        ON otp_calibration;
DROP POLICY IF EXISTS "anon_select_otp_update_delivery"    ON otp_update_delivery;
DROP POLICY IF EXISTS "anon_select_otp_order_cancel"       ON otp_order_cancel;
DROP POLICY IF EXISTS "anon_select_otp_credit_note"        ON otp_credit_note;
DROP POLICY IF EXISTS "anon_select_otp_users"              ON otp_users;
