-- ==============================================================================
-- 04_triggers.sql
-- Trigger Functions for Workflow Automation, Stage Progression & Quantity Sync
-- ==============================================================================

-- 1. TRIGGER: Set Stage 1 (Order Acceptable) planned date when an order is created
CREATE OR REPLACE FUNCTION otp_trg_set_stage1_planned()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  v_tat INTEGER;
BEGIN
  SELECT tat_minutes INTO v_tat FROM otp_stage_tat WHERE stage_key = 'order_acceptable';
  INSERT INTO otp_order_acceptable(order_id, planned_date)
  VALUES (NEW.id, NEW.timestamp + (COALESCE(v_tat, 7200) * INTERVAL '1 minute'))
  ON CONFLICT (order_id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS otp_trg_after_order_insert ON otp_orders;
CREATE TRIGGER otp_trg_after_order_insert
  AFTER INSERT ON otp_orders
  FOR EACH ROW EXECUTE FUNCTION otp_trg_set_stage1_planned();


-- 2. TRIGGER: Stage 1 actual_date -> Stage 2 planned_date (Check Inventory)
CREATE OR REPLACE FUNCTION otp_trg_stage1_to_stage2()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  v_tat INTEGER;
BEGIN
  IF NEW.actual_date IS NOT NULL AND (OLD.actual_date IS NULL OR OLD.actual_date <> NEW.actual_date) THEN
    IF NEW.is_order_acceptable = 'Order Cancel' THEN
      UPDATE otp_orders
      SET is_order_accept_cancel = TRUE, updated_at = NOW()
      WHERE id = NEW.order_id;
    ELSE
      SELECT tat_minutes INTO v_tat FROM otp_stage_tat WHERE stage_key = 'check_inventory';
      INSERT INTO otp_check_inventory(order_id, planned_date)
      VALUES (NEW.order_id, NEW.actual_date + (COALESCE(v_tat, 4320) * INTERVAL '1 minute'))
      ON CONFLICT (order_id) DO UPDATE
      SET planned_date = EXCLUDED.planned_date, updated_at = NOW();
    END IF;
  END IF;
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS otp_trg_after_oa_update ON otp_order_acceptable;
CREATE TRIGGER otp_trg_after_oa_update
  BEFORE UPDATE ON otp_order_acceptable
  FOR EACH ROW EXECUTE FUNCTION otp_trg_stage1_to_stage2();


-- 3. TRIGGER: Stage 2 actual_date -> Stage 3 (Material Received) OR Stage 4 (Senior Approval)
-- If Availability Status is 'Available', skip Stage 3 and go directly to Stage 4.
CREATE OR REPLACE FUNCTION otp_trg_stage2_to_stage3_or_4()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  v_tat INTEGER;
BEGIN
  IF NEW.actual_date IS NOT NULL AND (OLD.actual_date IS NULL OR OLD.actual_date <> NEW.actual_date) THEN
    IF NEW.availability_status = 'Available' THEN
      SELECT tat_minutes INTO v_tat FROM otp_stage_tat WHERE stage_key = 'senior_approval';
      INSERT INTO otp_senior_approval(order_id, planned_date)
      VALUES (NEW.order_id, NEW.actual_date + (COALESCE(v_tat, 0) * INTERVAL '1 minute'))
      ON CONFLICT (order_id) DO UPDATE
      SET planned_date = EXCLUDED.planned_date, updated_at = NOW();
    ELSE
      SELECT tat_minutes INTO v_tat FROM otp_stage_tat WHERE stage_key = 'material_received';
      INSERT INTO otp_material_received(order_id, planned_date)
      VALUES (NEW.order_id, NEW.actual_date + (COALESCE(v_tat, 1440) * INTERVAL '1 minute'))
      ON CONFLICT (order_id) DO UPDATE
      SET planned_date = EXCLUDED.planned_date, updated_at = NOW();
    END IF;
  END IF;
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS otp_trg_after_ci_update ON otp_check_inventory;
CREATE TRIGGER otp_trg_after_ci_update
  BEFORE UPDATE ON otp_check_inventory
  FOR EACH ROW EXECUTE FUNCTION otp_trg_stage2_to_stage3_or_4();


-- 4. TRIGGER: Stage 3 actual_date -> Stage 4 planned_date (Senior Approval)
CREATE OR REPLACE FUNCTION otp_trg_stage3_to_stage4()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  v_tat INTEGER;
BEGIN
  IF NEW.actual_date IS NOT NULL AND (OLD.actual_date IS NULL OR OLD.actual_date <> NEW.actual_date) THEN
    SELECT tat_minutes INTO v_tat FROM otp_stage_tat WHERE stage_key = 'senior_approval';
    INSERT INTO otp_senior_approval(order_id, planned_date)
    VALUES (NEW.order_id, NEW.actual_date + (COALESCE(v_tat, 0) * INTERVAL '1 minute'))
    ON CONFLICT (order_id) DO UPDATE
    SET planned_date = EXCLUDED.planned_date, updated_at = NOW();
  END IF;
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS otp_trg_after_mr_update ON otp_material_received;
CREATE TRIGGER otp_trg_after_mr_update
  BEFORE UPDATE ON otp_material_received
  FOR EACH ROW EXECUTE FUNCTION otp_trg_stage3_to_stage4();


-- 5. TRIGGER: Dispatch inserted -> Initialize Make Invoice, Calibration (if required), and Update Delivery planned dates
CREATE OR REPLACE FUNCTION otp_trg_dispatch_created_init_stages()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  v_tat INTEGER;
  v_total_dispatched NUMERIC;
BEGIN
  -- 5a. Make Invoice planned date
  SELECT tat_minutes INTO v_tat FROM otp_stage_tat WHERE stage_key = 'make_invoice';
  INSERT INTO otp_make_invoice(dispatch_id, planned_date)
  VALUES (NEW.id, NEW.timestamp + (COALESCE(v_tat, 7200) * INTERVAL '1 minute'))
  ON CONFLICT (dispatch_id) DO NOTHING;

  -- 5b. Calibration Certificate planned date (if required)
  IF UPPER(COALESCE(NEW.calibration_required, '')) = 'YES' THEN
    SELECT tat_minutes INTO v_tat FROM otp_stage_tat WHERE stage_key = 'calibration';
    INSERT INTO otp_calibration(dispatch_id, planned_date)
    VALUES (NEW.id, NEW.timestamp + (COALESCE(v_tat, 7200) * INTERVAL '1 minute'))
    ON CONFLICT (dispatch_id) DO NOTHING;
  END IF;

  -- 5c. Update Delivery Note planned date
  SELECT tat_minutes INTO v_tat FROM otp_stage_tat WHERE stage_key = 'update_delivery';
  INSERT INTO otp_update_delivery(dispatch_id, planned_date)
  VALUES (NEW.id, NEW.timestamp + (COALESCE(v_tat, 7200) * INTERVAL '1 minute'))
  ON CONFLICT (dispatch_id) DO NOTHING;

  -- 5d. Recalculate dispatched quantity on parent order
  SELECT COALESCE(SUM(d.total_dispatch_qty), 0) INTO v_total_dispatched
  FROM otp_dispatches d WHERE d.order_id = NEW.order_id;

  UPDATE otp_orders
  SET total_dispatched_qty = v_total_dispatched,
      dispatch_complete_date = CASE WHEN (total_order_qty - (v_total_dispatched + total_cancelled_qty)) <= 0 THEN NOW() ELSE NULL END,
      updated_at = NOW()
  WHERE id = NEW.order_id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS otp_trg_after_dispatch_insert ON otp_dispatches;
CREATE TRIGGER otp_trg_after_dispatch_insert
  AFTER INSERT ON otp_dispatches
  FOR EACH ROW EXECUTE FUNCTION otp_trg_dispatch_created_init_stages();


-- 6. TRIGGER: Stage 5 actual_date (Make Invoice) -> Stage 6 planned_date (Warehouse)
CREATE OR REPLACE FUNCTION otp_trg_stage5_to_stage6()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  v_tat INTEGER;
BEGIN
  IF NEW.actual_date IS NOT NULL AND (OLD.actual_date IS NULL OR OLD.actual_date <> NEW.actual_date) THEN
    SELECT tat_minutes INTO v_tat FROM otp_stage_tat WHERE stage_key = 'warehouse';
    INSERT INTO otp_warehouse(dispatch_id, planned_date)
    VALUES (NEW.dispatch_id, NEW.actual_date + (COALESCE(v_tat, 7200) * INTERVAL '1 minute'))
    ON CONFLICT (dispatch_id) DO UPDATE
    SET planned_date = EXCLUDED.planned_date, updated_at = NOW();
  END IF;
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS otp_trg_after_mi_update ON otp_make_invoice;
CREATE TRIGGER otp_trg_after_mi_update
  BEFORE UPDATE ON otp_make_invoice
  FOR EACH ROW EXECUTE FUNCTION otp_trg_stage5_to_stage6();


-- 7. TRIGGER: Stage 6 actual_date (Warehouse) -> Stage 7 planned_date (Driver Follow-up)
CREATE OR REPLACE FUNCTION otp_trg_stage6_to_stage7()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  v_tat INTEGER;
BEGIN
  IF NEW.actual_date IS NOT NULL AND (OLD.actual_date IS NULL OR OLD.actual_date <> NEW.actual_date) THEN
    SELECT tat_minutes INTO v_tat FROM otp_stage_tat WHERE stage_key = 'material_receiving';
    INSERT INTO otp_material_receiving(dispatch_id, planned_date)
    VALUES (NEW.dispatch_id, NEW.actual_date + (COALESCE(v_tat, 7200) * INTERVAL '1 minute'))
    ON CONFLICT (dispatch_id) DO UPDATE
    SET planned_date = EXCLUDED.planned_date, updated_at = NOW();
  END IF;
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS otp_trg_after_wh_update ON otp_warehouse;
CREATE TRIGGER otp_trg_after_wh_update
  BEFORE UPDATE ON otp_warehouse
  FOR EACH ROW EXECUTE FUNCTION otp_trg_stage6_to_stage7();


-- 8. TRIGGER: Stage 9 update (Delivery Note) -> Sync delivered quantity and completion date on master order
CREATE OR REPLACE FUNCTION otp_trg_sync_delivered_quantities()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  v_order_id UUID;
  v_total_delivered NUMERIC;
  v_total_order_qty NUMERIC;
  v_total_cancelled NUMERIC;
BEGIN
  SELECT order_id INTO v_order_id FROM otp_dispatches WHERE id = NEW.dispatch_id;

  IF v_order_id IS NOT NULL THEN
    SELECT COALESCE(SUM(ud.total_delivered_qty), 0) INTO v_total_delivered
    FROM otp_update_delivery ud
    JOIN otp_dispatches d ON d.id = ud.dispatch_id
    WHERE d.order_id = v_order_id AND ud.actual_date IS NOT NULL;

    SELECT total_order_qty, total_cancelled_qty INTO v_total_order_qty, v_total_cancelled
    FROM otp_orders WHERE id = v_order_id;

    UPDATE otp_orders
    SET total_delivered_qty = v_total_delivered,
        delivery_complete_date = CASE WHEN (COALESCE(v_total_order_qty,0) - (v_total_delivered + COALESCE(v_total_cancelled,0))) <= 0 THEN NOW() ELSE NULL END,
        updated_at = NOW()
    WHERE id = v_order_id;
  END IF;

  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS otp_trg_after_ud_update ON otp_update_delivery;
CREATE TRIGGER otp_trg_after_ud_update
  BEFORE UPDATE ON otp_update_delivery
  FOR EACH ROW EXECUTE FUNCTION otp_trg_sync_delivered_quantities();


-- 9. TRIGGER: Order Cancel insertion -> Sync total_cancelled_qty on otp_orders
CREATE OR REPLACE FUNCTION otp_trg_sync_cancelled_quantities()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  v_total_cancelled NUMERIC;
BEGIN
  SELECT COALESCE(SUM(qty), 0) INTO v_total_cancelled
  FROM otp_order_cancel WHERE order_no = NEW.order_no;

  UPDATE otp_orders
  SET total_cancelled_qty = v_total_cancelled,
      updated_at = NOW()
  WHERE order_no = NEW.order_no;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS otp_trg_after_cancel_insert ON otp_order_cancel;
CREATE TRIGGER otp_trg_after_cancel_insert
  AFTER INSERT ON otp_order_cancel
  FOR EACH ROW EXECUTE FUNCTION otp_trg_sync_cancelled_quantities();


-- 10. Generic trigger to update updated_at timestamp on record updates
CREATE OR REPLACE FUNCTION otp_trg_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS otp_trg_orders_updated_at ON otp_orders;
CREATE TRIGGER otp_trg_orders_updated_at
  BEFORE UPDATE ON otp_orders
  FOR EACH ROW EXECUTE FUNCTION otp_trg_set_updated_at();

DROP TRIGGER IF EXISTS otp_trg_users_updated_at ON otp_users;
CREATE TRIGGER otp_trg_users_updated_at
  BEFORE UPDATE ON otp_users
  FOR EACH ROW EXECUTE FUNCTION otp_trg_set_updated_at();

DROP TRIGGER IF EXISTS otp_trg_tat_updated_at ON otp_stage_tat;
CREATE TRIGGER otp_trg_tat_updated_at
  BEFORE UPDATE ON otp_stage_tat
  FOR EACH ROW EXECUTE FUNCTION otp_trg_set_updated_at();
