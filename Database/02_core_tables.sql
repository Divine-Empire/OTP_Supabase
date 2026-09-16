-- ==============================================================================
-- 02_core_tables.sql
-- Normalized Database Schema for OTP (Order-To-Payment) System
-- Replaces ORDER-DISPATCH, DISPATCH-DELIVERY, Login, Order-Cancel, Credit-Note
-- ==============================================================================

-- 1. TAT CONFIGURATION TABLE
-- Independent from pfms_tat (pfms_tat is dedicated to pfms_indent-generation)
-- Values stored in minutes. Enforces non-negative values.
CREATE TABLE IF NOT EXISTS otp_stage_tat (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  stage_key   TEXT UNIQUE NOT NULL,
  stage_label TEXT NOT NULL,
  tat_minutes INTEGER NOT NULL DEFAULT 7200 CHECK (tat_minutes >= 0),
  description TEXT,
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Seed initial TAT settings (based on row-5 offsets in Google Sheet)
INSERT INTO otp_stage_tat (stage_key, stage_label, tat_minutes, description) VALUES
  ('order_acceptable',  'Order Acceptable',            7200, '5 working days from order creation'),
  ('check_inventory',   'Check Inventory',             4320, '3 working days from Stage 1 actual'),
  ('material_received', 'Indent / Material Received',  1440, '1 working day from Stage 2 actual'),
  ('senior_approval',   'Senior Approval',                0, 'Same day as Stage 2/3 actual'),
  ('make_invoice',      'Make Invoice',                7200, '5 working days from dispatch creation'),
  ('warehouse',         'Warehouse / Material RCVD',   7200, '5 working days from Stage 5 actual'),
  ('material_receiving','Driver / Material Receiving', 7200, '5 working days from Stage 6 actual'),
  ('calibration',       'Calibration Certificate',     7200, '5 working days from dispatch creation'),
  ('update_delivery',   'Update Delivery Note',        7200, '5 working days from dispatch creation')
ON CONFLICT (stage_key) DO NOTHING;


-- 2. MASTER ORDERS TABLE
-- Replaces ORDER-DISPATCH master attributes & state indicators
CREATE TABLE IF NOT EXISTS otp_orders (
  id                        UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_no                  TEXT UNIQUE NOT NULL DEFAULT otp_generate_order_no(),
  quotation_no              TEXT,
  timestamp                 TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  company_name              TEXT,
  contact_person_name       TEXT,
  contact_number            TEXT,
  billing_address           TEXT,
  shipping_address          TEXT,
  payment_mode              TEXT,
  payment_terms_days        INTEGER DEFAULT 0,
  reference_name            TEXT,
  email                     TEXT,
  transport_mode            TEXT,
  destination               TEXT,
  item_qty_summary          TEXT,
  po_number                 TEXT,
  quotation_copy_url        TEXT,
  acceptance_copy_url       TEXT,
  offer_show                TEXT,
  conveyed_for_registration TEXT,
  total_order_qty           NUMERIC DEFAULT 0,
  amount                    NUMERIC DEFAULT 0,
  gst_no                    TEXT,
  cre_name                  TEXT,
  payment_balance           NUMERIC DEFAULT 0,
  
  -- Progress tracking quantities
  total_dispatched_qty      NUMERIC DEFAULT 0,
  total_delivered_qty       NUMERIC DEFAULT 0,
  total_cancelled_qty       NUMERIC DEFAULT 0,
  
  -- Calculated quantities matching sheet formulas:
  -- Pending Delivery Qty = Total Order Qty - (Delivered Qty + Cancelled Qty)
  pending_delivery_qty      NUMERIC GENERATED ALWAYS AS (
                              GREATEST(0, total_order_qty - (total_delivered_qty + total_cancelled_qty))
                            ) STORED,
  -- Pending Dispatch Qty = Total Order Qty - (Dispatched Qty + Cancelled Qty)
  pending_dispatch_qty      NUMERIC GENERATED ALWAYS AS (
                              GREATEST(0, total_order_qty - (total_dispatched_qty + total_cancelled_qty))
                            ) STORED,
  delivery_status           TEXT GENERATED ALWAYS AS (
                              CASE WHEN total_order_qty - (total_delivered_qty + total_cancelled_qty) > 0 
                                   THEN 'Pending' ELSE 'Complete' END
                            ) STORED,
  dispatch_status           TEXT GENERATED ALWAYS AS (
                              CASE WHEN total_order_qty - (total_dispatched_qty + total_cancelled_qty) > 0 
                                   THEN 'Pending' ELSE 'Complete' END
                            ) STORED,
  dispatch_complete_date    TIMESTAMPTZ,
  delivery_complete_date    TIMESTAMPTZ,
  
  -- Revised order fields (from column CF/CG)
  revised_order_date        DATE,
  revised_order_status      TEXT,
  revised_order_remark      TEXT,
  sc_name                   TEXT,
  is_order_accept_cancel    BOOLEAN DEFAULT FALSE,
  
  -- Lead-To-Order tracking
  source_lto_order_id       TEXT,
  created_at                TIMESTAMPTZ DEFAULT NOW(),
  updated_at                TIMESTAMPTZ DEFAULT NOW()
);


-- 3. ORDER LINE ITEMS
-- Normalized relational store for line items 1..10+
CREATE TABLE IF NOT EXISTS otp_order_items (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id    UUID NOT NULL REFERENCES otp_orders(id) ON DELETE CASCADE,
  item_no     INTEGER NOT NULL,
  item_name   TEXT NOT NULL,
  quantity    NUMERIC NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (order_id, item_no)
);


-- 4. STAGE 1: ORDER ACCEPTABLE (ORDER-DISPATCH cols BA-BF)
CREATE TABLE IF NOT EXISTS otp_order_acceptable (
  id                        UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id                  UUID UNIQUE NOT NULL REFERENCES otp_orders(id) ON DELETE CASCADE,
  planned_date              TIMESTAMPTZ,
  actual_date               TIMESTAMPTZ,
  delay_minutes             INTEGER GENERATED ALWAYS AS (
                              CASE WHEN actual_date IS NOT NULL AND planned_date IS NOT NULL
                                   AND EXTRACT(EPOCH FROM (actual_date - planned_date))/60 > 0
                                   THEN FLOOR(EXTRACT(EPOCH FROM (actual_date - planned_date))/60)::INTEGER
                                   ELSE 0 END
                            ) STORED,
  is_order_acceptable       TEXT,
  acceptance_checklist      TEXT,
  remark                    TEXT,
  created_by                TEXT,
  created_at                TIMESTAMPTZ DEFAULT NOW(),
  updated_at                TIMESTAMPTZ DEFAULT NOW()
);


-- 5. STAGE 2: CHECK INVENTORY (ORDER-DISPATCH cols BG-BR)
CREATE TABLE IF NOT EXISTS otp_check_inventory (
  id                         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id                   UUID UNIQUE NOT NULL REFERENCES otp_orders(id) ON DELETE CASCADE,
  planned_date               TIMESTAMPTZ,
  actual_date                TIMESTAMPTZ,
  delay_minutes              INTEGER GENERATED ALWAYS AS (
                               CASE WHEN actual_date IS NOT NULL AND planned_date IS NOT NULL
                                    AND EXTRACT(EPOCH FROM (actual_date - planned_date))/60 > 0
                                    THEN FLOOR(EXTRACT(EPOCH FROM (actual_date - planned_date))/60)::INTEGER
                                    ELSE 0 END
                             ) STORED,
  availability_status        TEXT,
  remarks                    TEXT,
  customer_wants_material_as TEXT,
  created_by                 TEXT,
  warehouse_location         TEXT,
  create_indent_if_not_avail BOOLEAN DEFAULT FALSE,
  line_item_number           TEXT,
  total_qty                  NUMERIC,
  material_received_lead_time NUMERIC,
  created_at                 TIMESTAMPTZ DEFAULT NOW(),
  updated_at                 TIMESTAMPTZ DEFAULT NOW()
);


-- 6. STAGE 3: MATERIAL RECEIVED (ORDER-DISPATCH cols BS-BV)
CREATE TABLE IF NOT EXISTS otp_material_received (
  id                        UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id                  UUID UNIQUE NOT NULL REFERENCES otp_orders(id) ON DELETE CASCADE,
  planned_date              TIMESTAMPTZ,
  actual_date               TIMESTAMPTZ,
  delay_minutes             INTEGER GENERATED ALWAYS AS (
                              CASE WHEN actual_date IS NOT NULL AND planned_date IS NOT NULL
                                   AND EXTRACT(EPOCH FROM (actual_date - planned_date))/60 > 0
                                   THEN FLOOR(EXTRACT(EPOCH FROM (actual_date - planned_date))/60)::INTEGER
                                   ELSE 0 END
                            ) STORED,
  received_date             DATE,
  created_by                TEXT,
  created_at                TIMESTAMPTZ DEFAULT NOW(),
  updated_at                TIMESTAMPTZ DEFAULT NOW()
);


-- 7. STAGE 4: SENIOR APPROVAL (ORDER-DISPATCH cols BW-BZ)
CREATE TABLE IF NOT EXISTS otp_senior_approval (
  id                        UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id                  UUID UNIQUE NOT NULL REFERENCES otp_orders(id) ON DELETE CASCADE,
  planned_date              TIMESTAMPTZ,
  actual_date               TIMESTAMPTZ,
  delay_minutes             INTEGER GENERATED ALWAYS AS (
                              CASE WHEN actual_date IS NOT NULL AND planned_date IS NOT NULL
                                   AND EXTRACT(EPOCH FROM (actual_date - planned_date))/60 > 0
                                   THEN FLOOR(EXTRACT(EPOCH FROM (actual_date - planned_date))/60)::INTEGER
                                   ELSE 0 END
                            ) STORED,
  approval_name             TEXT,
  revenue                   NUMERIC,
  created_by                TEXT,
  created_at                TIMESTAMPTZ DEFAULT NOW(),
  updated_at                TIMESTAMPTZ DEFAULT NOW()
);


-- 8. DISPATCHES TABLE (replaces DISPATCH-DELIVERY rows)
CREATE TABLE IF NOT EXISTS otp_dispatches (
  id                            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  dispatch_no                   TEXT UNIQUE NOT NULL DEFAULT otp_generate_dispatch_no(),
  order_id                      UUID NOT NULL REFERENCES otp_orders(id) ON DELETE CASCADE,
  order_no                      TEXT NOT NULL,
  timestamp                     TIMESTAMPTZ DEFAULT NOW(),
  total_dispatch_qty            NUMERIC DEFAULT 0,
  total_bill_amount             NUMERIC DEFAULT 0,
  calibration_required          TEXT,
  certificate_category          TEXT,
  installation_required         TEXT,
  transporter_id                TEXT,
  vehicle_no                    TEXT,
  srn_number                    TEXT,
  srn_number_attachment_url     TEXT,
  attachment_url                TEXT,
  gst_no                        TEXT,
  dispatch_status               TEXT DEFAULT 'Pending',
  dispatch_location             TEXT,
  direct_dispatch               BOOLEAN DEFAULT FALSE,
  calibration_responsible       TEXT,
  bilty_number                  TEXT,
  bilty_date                    DATE,
  serial_no                     TEXT,
  location                      TEXT,
  expense_amount                NUMERIC,
  hamali_charge                 NUMERIC,
  parking_charge                NUMERIC,
  remarks                       TEXT,
  created_by                    TEXT,
  created_at                    TIMESTAMPTZ DEFAULT NOW(),
  updated_at                    TIMESTAMPTZ DEFAULT NOW()
);


-- 9. DISPATCH LINE ITEMS
CREATE TABLE IF NOT EXISTS otp_dispatch_items (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  dispatch_id  UUID NOT NULL REFERENCES otp_dispatches(id) ON DELETE CASCADE,
  item_no      INTEGER NOT NULL,
  item_name    TEXT NOT NULL,
  quantity     NUMERIC NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (dispatch_id, item_no)
);


-- 10. STAGE 5: MAKE INVOICE (DISPATCH-DELIVERY cols BK-BR)
CREATE TABLE IF NOT EXISTS otp_make_invoice (
  id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  dispatch_id          UUID UNIQUE NOT NULL REFERENCES otp_dispatches(id) ON DELETE CASCADE,
  planned_date         TIMESTAMPTZ,
  actual_date          TIMESTAMPTZ,
  delay_minutes        INTEGER GENERATED ALWAYS AS (
                         CASE WHEN actual_date IS NOT NULL AND planned_date IS NOT NULL
                              AND EXTRACT(EPOCH FROM (actual_date - planned_date))/60 > 0
                              THEN FLOOR(EXTRACT(EPOCH FROM (actual_date - planned_date))/60)::INTEGER
                              ELSE 0 END
                       ) STORED,
  invoice_number       TEXT,
  invoice_upload_url   TEXT,
  eway_bill_upload_url TEXT,
  total_qty            NUMERIC,
  total_bill_amount    NUMERIC,
  bill_date            DATE,
  created_by           TEXT,
  created_at           TIMESTAMPTZ DEFAULT NOW(),
  updated_at           TIMESTAMPTZ DEFAULT NOW()
);


-- 11. STAGE 6: WAREHOUSE / MATERIAL RCVD (DISPATCH-DELIVERY cols BS-CC)
CREATE TABLE IF NOT EXISTS otp_warehouse (
  id                            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  dispatch_id                   UUID UNIQUE NOT NULL REFERENCES otp_dispatches(id) ON DELETE CASCADE,
  planned_date                  TIMESTAMPTZ,
  actual_date                   TIMESTAMPTZ,
  delay_minutes                 INTEGER GENERATED ALWAYS AS (
                                  CASE WHEN actual_date IS NOT NULL AND planned_date IS NOT NULL
                                       AND EXTRACT(EPOCH FROM (actual_date - planned_date))/60 > 0
                                       THEN FLOOR(EXTRACT(EPOCH FROM (actual_date - planned_date))/60)::INTEGER
                                       ELSE 0 END
                                ) STORED,
  before_photo_url              TEXT,
  after_photo_url               TEXT,
  bilty_upload_url              TEXT,
  transporter_name              TEXT,
  transporter_contact           TEXT,
  bilty_docket_no               TEXT,
  freight_charge                NUMERIC,
  warehouse_remarks             TEXT,
  created_by                    TEXT,
  created_at                    TIMESTAMPTZ DEFAULT NOW(),
  updated_at                    TIMESTAMPTZ DEFAULT NOW()
);


-- 12. STAGE 7: DRIVER FOLLOW-UP / MATERIAL RECEIVING (DISPATCH-DELIVERY cols CD-CI)
CREATE TABLE IF NOT EXISTS otp_material_receiving (
  id                        UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  dispatch_id               UUID UNIQUE NOT NULL REFERENCES otp_dispatches(id) ON DELETE CASCADE,
  planned_date              TIMESTAMPTZ,
  actual_date               TIMESTAMPTZ,
  delay_minutes             INTEGER GENERATED ALWAYS AS (
                              CASE WHEN actual_date IS NOT NULL AND planned_date IS NOT NULL
                                   AND EXTRACT(EPOCH FROM (actual_date - planned_date))/60 > 0
                                   THEN FLOOR(EXTRACT(EPOCH FROM (actual_date - planned_date))/60)::INTEGER
                                   ELSE 0 END
                            ) STORED,
  material_receiving_status TEXT,
  site_person_name          TEXT,
  site_person_contact       TEXT,
  created_by                TEXT,
  created_at                TIMESTAMPTZ DEFAULT NOW(),
  updated_at                TIMESTAMPTZ DEFAULT NOW()
);


-- 13. STAGE 8: CALIBRATION CERTIFICATE (DISPATCH-DELIVERY cols CJ-CT)
CREATE TABLE IF NOT EXISTS otp_calibration (
  id                     UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  dispatch_id            UUID UNIQUE NOT NULL REFERENCES otp_dispatches(id) ON DELETE CASCADE,
  planned_date           TIMESTAMPTZ,
  actual_date            TIMESTAMPTZ,
  delay_minutes          INTEGER GENERATED ALWAYS AS (
                           CASE WHEN actual_date IS NOT NULL AND planned_date IS NOT NULL
                                AND EXTRACT(EPOCH FROM (actual_date - planned_date))/60 > 0
                                THEN FLOOR(EXTRACT(EPOCH FROM (actual_date - planned_date))/60)::INTEGER
                                ELSE 0 END
                         ) STORED,
  lab_cert_url           TEXT,
  st_cert_url            TEXT,
  lab_cert_date          DATE,
  st_cert_date           DATE,
  lab_cert_period        TEXT,
  st_cert_period         TEXT,
  lab_due_date           DATE,
  st_due_date            DATE,
  created_by             TEXT,
  created_at             TIMESTAMPTZ DEFAULT NOW(),
  updated_at             TIMESTAMPTZ DEFAULT NOW()
);


-- 14. STAGE 9: UPDATE DELIVERY NOTE (DISPATCH-DELIVERY cols CU-CZ)
CREATE TABLE IF NOT EXISTS otp_update_delivery (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  dispatch_id         UUID UNIQUE NOT NULL REFERENCES otp_dispatches(id) ON DELETE CASCADE,
  planned_date        TIMESTAMPTZ,
  actual_date         TIMESTAMPTZ,
  delay_minutes       INTEGER GENERATED ALWAYS AS (
                        CASE WHEN actual_date IS NOT NULL AND planned_date IS NOT NULL
                             AND EXTRACT(EPOCH FROM (actual_date - planned_date))/60 > 0
                             THEN FLOOR(EXTRACT(EPOCH FROM (actual_date - planned_date))/60)::INTEGER
                             ELSE 0 END
                      ) STORED,
  upload_dn_url       TEXT,
  dispatch_status     TEXT,
  dispatch_location   TEXT,
  total_delivered_qty NUMERIC DEFAULT 0,
  created_by          TEXT,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);


-- 15. ORDER CANCEL LOG (replaces Order-Cancel sheet)
CREATE TABLE IF NOT EXISTS otp_order_cancel (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id        UUID REFERENCES otp_orders(id) ON DELETE SET NULL,
  order_no        TEXT NOT NULL,
  cancelled_at    TIMESTAMPTZ DEFAULT NOW(),
  cancel_stage    TEXT,
  cancel_reason   TEXT,
  qty             NUMERIC DEFAULT 0,
  created_by      TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);


-- 16. CREDIT NOTE LOG (replaces Credit-Note sheet)
CREATE TABLE IF NOT EXISTS otp_credit_note (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id         UUID REFERENCES otp_orders(id) ON DELETE SET NULL,
  order_no         TEXT NOT NULL,
  invoice_no       TEXT,
  quantity         NUMERIC DEFAULT 0,
  value            NUMERIC DEFAULT 0,
  senior_approval  TEXT,
  reasons          TEXT,
  remarks          TEXT,
  created_by       TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);


-- 17. USERS AUTH TABLE (replaces Login sheet)
CREATE TABLE IF NOT EXISTS otp_users (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  username              TEXT UNIQUE NOT NULL,
  full_name             TEXT NOT NULL,
  password_hash         TEXT NOT NULL,
  role                  TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('super_admin','admin','user')),
  assigned_steps        TEXT[],
  deploy_link           TEXT,
  warehouse_page_access TEXT,
  location              TEXT,
  is_active             BOOLEAN DEFAULT TRUE,
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);
