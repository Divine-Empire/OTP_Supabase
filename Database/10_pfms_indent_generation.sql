-- ==============================================================================
-- 10_pfms_indent_generation.sql
-- Indent generation table stored in Supabase
-- Populated automatically from Stage Check Inventory when material is Not Available / Partial
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public."pfms_indent-generation" (
  id uuid not null default gen_random_uuid (),
  timestamp timestamp without time zone null default CURRENT_TIMESTAMP,
  "indentNo" text null,
  "createdBy" text null,
  category text null,
  "itemName" text null,
  quantity double precision null,
  "warehouseLocation" text null,
  "itemCode" text null,
  "leadTime" integer null,
  uom text null,
  attachment text null,
  status text null default 'pending'::text,
  remarks text null,
  "plannedIndentApproval" timestamp without time zone null,
  "createdAt" timestamp without time zone null default CURRENT_TIMESTAMP,
  "updatedAt" timestamp without time zone null default CURRENT_TIMESTAMP,
  constraint "pfms_indent-generation_pkey" primary key (id)
) TABLESPACE pg_default;

CREATE UNIQUE INDEX IF NOT EXISTS "pfms_indent-generation_indentNo_key"
  ON public."pfms_indent-generation" USING btree ("indentNo") TABLESPACE pg_default;

-- Disable RLS (same pattern as all otp_ tables)
ALTER TABLE IF EXISTS public."pfms_indent-generation" DISABLE ROW LEVEL SECURITY;
