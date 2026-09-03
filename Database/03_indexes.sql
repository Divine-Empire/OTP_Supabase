-- ==============================================================================
-- 03_indexes.sql
-- Indexes for High Performance Querying in OTP System
-- ==============================================================================

-- Indexes on Master Orders
CREATE INDEX IF NOT EXISTS idx_otp_orders_order_no         ON otp_orders(order_no);
CREATE INDEX IF NOT EXISTS idx_otp_orders_company          ON otp_orders(company_name);
CREATE INDEX IF NOT EXISTS idx_otp_orders_dispatch_status  ON otp_orders(dispatch_status);
CREATE INDEX IF NOT EXISTS idx_otp_orders_delivery_status  ON otp_orders(delivery_status);
CREATE INDEX IF NOT EXISTS idx_otp_orders_timestamp        ON otp_orders(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_otp_orders_source_lto       ON otp_orders(source_lto_order_id);

-- Indexes on Order Line Items
CREATE INDEX IF NOT EXISTS idx_otp_order_items_order_id    ON otp_order_items(order_id);

-- Indexes on Stage Tables
CREATE INDEX IF NOT EXISTS idx_otp_oa_order_id             ON otp_order_acceptable(order_id);
CREATE INDEX IF NOT EXISTS idx_otp_ci_order_id             ON otp_check_inventory(order_id);
CREATE INDEX IF NOT EXISTS idx_otp_mr_order_id             ON otp_material_received(order_id);
CREATE INDEX IF NOT EXISTS idx_otp_sa_order_id             ON otp_senior_approval(order_id);

-- Indexes on Dispatches & Dispatch Items
CREATE INDEX IF NOT EXISTS idx_otp_dispatches_order_id     ON otp_dispatches(order_id);
CREATE INDEX IF NOT EXISTS idx_otp_dispatches_order_no     ON otp_dispatches(order_no);
CREATE INDEX IF NOT EXISTS idx_otp_dispatches_dispatch_no  ON otp_dispatches(dispatch_no);
CREATE INDEX IF NOT EXISTS idx_otp_dispatches_timestamp    ON otp_dispatches(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_otp_dispatch_items_id       ON otp_dispatch_items(dispatch_id);

-- Indexes on Dispatch Stages
CREATE INDEX IF NOT EXISTS idx_otp_mi_dispatch_id          ON otp_make_invoice(dispatch_id);
CREATE INDEX IF NOT EXISTS idx_otp_wh_dispatch_id          ON otp_warehouse(dispatch_id);
CREATE INDEX IF NOT EXISTS idx_otp_mrcv_dispatch_id        ON otp_material_receiving(dispatch_id);
CREATE INDEX IF NOT EXISTS idx_otp_cal_dispatch_id         ON otp_calibration(dispatch_id);
CREATE INDEX IF NOT EXISTS idx_otp_ud_dispatch_id          ON otp_update_delivery(dispatch_id);

-- Indexes on Cancel & Credit Logs
CREATE INDEX IF NOT EXISTS idx_otp_cancel_order_no         ON otp_order_cancel(order_no);
CREATE INDEX IF NOT EXISTS idx_otp_credit_order_no         ON otp_credit_note(order_no);

-- Indexes on Auth Users & TAT
CREATE INDEX IF NOT EXISTS idx_otp_users_username          ON otp_users(username);
CREATE INDEX IF NOT EXISTS idx_otp_stage_tat_key           ON otp_stage_tat(stage_key);
