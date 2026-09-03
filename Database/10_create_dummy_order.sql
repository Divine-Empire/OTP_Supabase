-- ==============================================================================
-- 10_create_dummy_order.sql
-- Create a Synthetic Test / Dummy Order to Test the Pipeline from Beginning
-- Run this in the Supabase SQL Editor to insert a new test order into Stage 1
-- ==============================================================================

DO $$
DECLARE
  v_order_id UUID;
  v_order_no TEXT;
BEGIN
  -- 1. Insert Master Order Header with Dummy Test Data
  INSERT INTO otp_orders (
    quotation_no,
    company_name,
    contact_person_name,
    contact_number,
    billing_address,
    shipping_address,
    payment_mode,
    payment_terms_days,
    reference_name,
    email,
    transport_mode,
    destination,
    po_number,
    quotation_copy_url,
    acceptance_copy_url,
    total_order_qty,
    amount,
    cre_name,
    payment_balance
  ) VALUES (
    'TEST-QT-' || LPAD(FLOOR(RANDOM() * 9000 + 1000)::TEXT, 4, '0'),
    'TEST CLIENT PVT LTD',
    'TEST CONTACT PERSON',
    '9999999999',
    'TEST BILLING ADDRESS, BUILDING 101, INDUSTRIAL PARK, TEST CITY 492001',
    'TEST SHIPPING SITE ADDRESS, SECTOR 5, TEST REGION 492018',
    '100% Advance',
    0,
    'TEST REFERENCE USER',
    'test.order@example.com',
    'Road Transport',
    'Test City',
    'PO-TEST-2026-001',
    'https://placehold.co/600x400.png?text=Test+Quotation+Copy',
    'https://placehold.co/600x400.png?text=Test+Acceptance+Copy',
    20,
    50000.00,
    'admin1',
    0.00
  )
  RETURNING id, order_no INTO v_order_id, v_order_no;

  -- 2. Insert Test Line Items (Item 1 & Item 2)
  INSERT INTO otp_order_items (order_id, item_no, item_name, quantity)
  VALUES
    (v_order_id, 1, 'TEST ITEM A - SAMPLE PRODUCT 1', 12),
    (v_order_id, 2, 'TEST ITEM B - SAMPLE PRODUCT 2', 8);

  RAISE NOTICE '==================================================';
  RAISE NOTICE 'SUCCESS: Synthetic Test Order Created!';
  RAISE NOTICE 'Order Number: %', v_order_no;
  RAISE NOTICE 'Order ID:     %', v_order_id;
  RAISE NOTICE 'Status:       Stage 1 (Order Acceptable) Pending';
  RAISE NOTICE '==================================================';
END $$;

-- 3. Verify that the order and its auto-scheduled Stage 1 planned date are created
SELECT 
  o.order_no,
  o.company_name,
  o.contact_person_name,
  o.total_order_qty,
  o.amount,
  oa.planned_date AS stage1_planned_date,
  oa.actual_date  AS stage1_actual_date,
  oa.delay_minutes
FROM otp_orders o
LEFT JOIN otp_order_acceptable oa ON oa.order_id = o.id
ORDER BY o.created_at DESC
LIMIT 1;
