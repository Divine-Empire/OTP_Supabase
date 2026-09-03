-- ==============================================================================
-- 11_reset_test_data.sql
-- Optional: Clear all orders/dispatches and reset order sequence to start from #1
-- (Keeps users and TAT settings intact)
-- ==============================================================================

-- 1. Truncate all pipeline tables (cascades to stages and items)
TRUNCATE TABLE 
  otp_update_delivery,
  otp_calibration,
  otp_material_receiving,
  otp_warehouse,
  otp_make_invoice,
  otp_dispatch_items,
  otp_dispatches,
  otp_senior_approval,
  otp_material_received,
  otp_check_inventory,
  otp_order_acceptable,
  otp_order_items,
  otp_order_cancel,
  otp_credit_note,
  otp_orders
CASCADE;

-- 2. Reset order sequence back to 1 (or 4728)
ALTER SEQUENCE otp_order_no_seq RESTART WITH 1;

-- 3. Confirm clean state
SELECT 'All test orders cleared and sequence reset successfully.' AS status;
