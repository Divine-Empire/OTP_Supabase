-- ==============================================================================
-- 11_pfms_material_testing.sql
-- Material testing table stored in Supabase
-- Connected to /material-tested page in OTP system
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public."pfms_material-testing" (
  id text not null,
  timestamp timestamp without time zone not null default CURRENT_TIMESTAMP,
  "liftNo" text not null,
  "qcBy" text null,
  "qcDate" timestamp without time zone null,
  "workingCondition" text null,
  remarks text null,
  "pendingQty" double precision null,
  "approvedQty" double precision null,
  checklist text[] null,
  "serialNumbers" text[] null,
  images text[] null,
  "rejectType" text null,
  "partName" text null,
  "rejectedQty" double precision null,
  "plannedPurchaseReturns" timestamp without time zone null,
  "createdAt" timestamp without time zone not null default CURRENT_TIMESTAMP,
  "updatedAt" timestamp without time zone not null default CURRENT_TIMESTAMP,
  delay double precision null,
  constraint "pfms_material-testing_pkey" primary key (id)
) TABLESPACE pg_default;

-- Disable RLS
ALTER TABLE IF EXISTS public."pfms_material-testing" DISABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_pfms_mt_lift_no ON public."pfms_material-testing" ("liftNo");
