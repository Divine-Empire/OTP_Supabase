-- ==============================================================================
-- 09_sss_service_installation.sql
-- Service & Installation tracking table for SSS (Service Support System)
-- Populated automatically from Pre Invoice Form when installation_required = YES
-- planned = dispatch creation timestamp (same moment the dispatch is created)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.sss_service_installation (
  id                                      UUID NOT NULL DEFAULT gen_random_uuid(),
  created_at                              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  order_no                                TEXT,
  is_installation_required                TEXT,
  company_name                            TEXT,
  contact_person_name                     TEXT,
  contact_person_no                       TEXT,
  item_name                               TEXT,
  qty                                     NUMERIC,
  serial                                  TEXT,
  si_no                                   TEXT,
  invoice_date                            DATE,
  invoice_no                              TEXT,
  invoice_copy_upload                     TEXT,
  actual_material_rcvd                    TEXT,
  planned                                 TIMESTAMPTZ,   -- = dispatch creation timestamp
  actual                                  TIMESTAMPTZ,
  installation_follow_up                  TEXT,
  service_type                            TEXT,
  engineer_name                           TEXT,
  service_report_file                     TEXT,
  next_date                               DATE,
  what_did_customer_say                   TEXT,
  delay                                   INTEGER,
  updated_at                              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  engg_dsb_service_installation_planned   TIMESTAMPTZ,
  CONSTRAINT sss_service_installation_pkey PRIMARY KEY (id)
) TABLESPACE pg_default;

-- Disable RLS (same pattern as all otp_ tables)
ALTER TABLE IF EXISTS public.sss_service_installation DISABLE ROW LEVEL SECURITY;

-- Index for quick lookups by order
CREATE INDEX IF NOT EXISTS idx_sss_si_order_no ON public.sss_service_installation(order_no);
