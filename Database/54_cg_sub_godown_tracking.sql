-- =====================================================================
-- 54_cg_sub_godown_tracking.sql
--
-- CG sub-godown tracking (Warehouse, Maniquip, Service Inbound, Head
-- Office). Row-level, captured at Packing List submit time, co-existing
-- with (not replacing) the existing `dispatch_location` field that's
-- still set later at the Pre-Invoice stage. Only matters for CG — other
-- top-level locations (NE/WB/OD) stay single flat godowns.
--
-- Separate dropdown category from "dispatch_location" so that existing
-- field stays completely unchanged.
-- =====================================================================

INSERT INTO public.otp_dropdown (category, value, sort_order) VALUES
  ('sub_godown', 'Warehouse', 1),
  ('sub_godown', 'Maniquip', 2),
  ('sub_godown', 'Service Inbound', 3),
  ('sub_godown', 'Head Office', 4)
ON CONFLICT (category, value) DO NOTHING;

-- Which exact CG sub-godown this wave was packed/dispatched from (nullable
-- — only applicable/filled when relevant).
ALTER TABLE public.otp_pre_invoice_queue
  ADD COLUMN IF NOT EXISTS sub_godown text;

-- Per-user default godown (optional — most users aren't a godown in-charge).
-- New column name, NOT reusing the existing `location` column (which has
-- its own, unrelated loose semantics today).
ALTER TABLE public.otp_users
  ADD COLUMN IF NOT EXISTS default_godown text;
