-- ==============================================================================
-- 09_seed_users.sql
-- User Migration: Google Sheet 'Login' Tab -> otp_users Table
-- Automatically seeds all 15 active users with their roles, assigned steps, and permissions
-- ==============================================================================

INSERT INTO otp_users (username, full_name, password_hash, role, assigned_steps, deploy_link, warehouse_page_access, location)
VALUES
  -- 1. admin (super_admin)
  (
    'admin', 'admin', 'admin123', 'super_admin',
    ARRAY['dashboard', 'order-acceptable', 'check-inventory', 'material-received', 'make-invoice', 'senior-approval', 'warehouse', 'calibration', 'settings', 'service-intimation', 'warehouse-material', 'make-pi', 'disp-form', 'update-delivery', 'order-cancel', 'credit-note'],
    'http://otp-iota-ashy.vercel.app/', 'all', 'all'
  ),

  -- 2. Aditya (user)
  (
    'Aditya', 'Aditya', 'A1234', 'user',
    ARRAY[]::TEXT[],
    NULL, 'Dispatch,Transporting,Packaging,Purchase', 'C.G.Warehouse'
  ),

  -- 3. Khushi Khemani (super_admin)
  (
    'Khushi Khemani', 'Khushi Khemani', 'khushi123', 'super_admin',
    ARRAY['dashboard', 'order-acceptable', 'check-inventory', 'material-received', 'make-invoice', 'senior-approval', 'warehouse', 'calibration', 'settings', 'service-intimation', 'warehouse-material', 'make-pi', 'disp-form', 'update-delivery', 'order-cancel', 'credit-note'],
    NULL, 'all', 'All'
  ),

  -- 4. admin1 (admin)
  (
    'admin1', 'admin', 'admin123', 'admin',
    ARRAY['dashboard', 'order-acceptable', 'check-inventory', 'make-invoice', 'senior-approval', 'warehouse', 'calibration', 'settings', 'service-intimation', 'warehouse-material', 'make-pi', 'disp-form'],
    NULL, 'Dispatch,Transporting,Packaging,Purchase,Purchase,PR_SR_DR Form, Dispatch Update Location, Purchase Update Location', 'All'
  ),

  -- 5. Khushi (admin)
  (
    'Khushi', 'Khushi', 'khushi1234', 'admin',
    ARRAY['dashboard', 'order-acceptable', 'check-inventory', 'make-invoice', 'material-received', 'senior-approval', 'warehouse', 'calibration', 'settings', 'service-intimation', 'warehouse-material', 'make-pi', 'disp-form'],
    NULL, 'Dispatch,Transporting,Packaging,Purchase,Purchase,PR_SR_DR Form, Dispatch Update Location, Purchase Update Location', 'All'
  ),

  -- 6. Sarita (admin)
  (
    'Sarita', 'Sarita', 'sarita1234', 'admin',
    ARRAY['dashboard', 'order-acceptable', 'check-inventory', 'make-invoice', 'senior-approval', 'warehouse', 'calibration', 'settings', 'service-intimation', 'warehouse-material', 'make-pi', 'disp-form'],
    NULL, 'Dispatch,Transporting,Packaging,Purchase,Purchase,PR_SR_DR Form, Dispatch Update Location, Purchase Update Location', 'All'
  ),

  -- 7. Priyanka (admin)
  (
    'Priyanka', 'Priyanka', 'Priyanka1234', 'admin',
    ARRAY['dashboard', 'order-acceptable', 'check-inventory', 'material-received', 'make-invoice', 'senior-approval', 'warehouse', 'calibration', 'settings', 'service-intimation', 'warehouse-material', 'make-pi', 'disp-form'],
    NULL, 'Dispatch,Transporting,Packaging,Purchase,Purchase,PR_SR_DR Form, Dispatch Update Location, Purchase Update Location', 'All'
  ),

  -- 8. accounts (super_admin)
  (
    'accounts', 'accounts', 'accounts1234', 'super_admin',
    ARRAY['make-invoice', 'make-pi'],
    NULL, 'Dispatch,Transporting,Packaging,Purchase,Purchase,PR_SR_DR Form, Dispatch Update Location, Purchase Update Location', 'All'
  ),

  -- 9. Satya (admin)
  (
    'Satya', 'Satya', 'satya1234', 'admin',
    ARRAY['dashboard', 'order-acceptable', 'check-inventory', 'material-received', 'make-invoice', 'senior-approval', 'warehouse', 'calibration', 'settings', 'service-intimation', 'warehouse-material', 'make-pi', 'disp-form', 'update-delivery', 'order-cancel', 'credit-note'],
    NULL, 'Dispatch,Transporting,Packaging,Purchase,Purchase,PR_SR_DR Form, Dispatch Update Location, Purchase Update Location', 'All'
  ),

  -- 10. Roshan (user)
  (
    'Roshan', 'Roshan', 'roshan123', 'user',
    ARRAY[]::TEXT[],
    NULL, 'Bilty Upload', 'All'
  ),

  -- 11. Mahesh Sahu (user)
  (
    'Mahesh Sahu', 'Mahesh', 'Mahesh123', 'user',
    ARRAY[]::TEXT[],
    NULL, 'Dispatch,Transporting,Packaging,Purchase', 'C.G.Warehouse'
  ),

  -- 12. Nilmani (admin)
  (
    'Nilmani', 'Nilmani', 'N1234', 'admin',
    ARRAY[]::TEXT[],
    NULL, 'Dispatch,Transporting,Packaging,Purchase, Dispatch Update Location, Purchase Update Location', 'C.G.Warehouse'
  ),

  -- 13. Deepjyoti (user)
  (
    'Deepjyoti', 'Deepjyoti', 'dp1234', 'user',
    ARRAY[]::TEXT[],
    NULL, 'Dispatch,Transporting,Packaging,Purchase', 'N.E Warehouse'
  ),

  -- 14. Maniquip (user)
  (
    'Maniquip', 'Maniquip', 'm1234', 'user',
    ARRAY[]::TEXT[],
    NULL, 'Dispatch,Transporting,Packaging,Purchase,Purchase,PR_SR_DR Form, Dispatch Update Location, Purchase Update Location', 'Maniquip store'
  ),

  -- 15. Aniket vishwas (user)
  (
    'Aniket vishwas', 'Aniket', 'av1234', 'user',
    ARRAY[]::TEXT[],
    NULL, 'Dispatch,Transporting,Packaging,Purchase, Dispatch Update Location, Purchase Update Location', 'C.G.Warehouse'
  )

ON CONFLICT (username) DO UPDATE SET
  full_name             = EXCLUDED.full_name,
  password_hash         = EXCLUDED.password_hash,
  role                  = EXCLUDED.role,
  assigned_steps        = EXCLUDED.assigned_steps,
  deploy_link           = EXCLUDED.deploy_link,
  warehouse_page_access = EXCLUDED.warehouse_page_access,
  location              = EXCLUDED.location,
  updated_at            = NOW();

-- Check seeded users count
SELECT COUNT(*) AS total_users_seeded FROM otp_users;
