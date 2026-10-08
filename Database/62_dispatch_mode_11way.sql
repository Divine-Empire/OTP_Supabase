-- =====================================================================
-- 62_dispatch_mode_11way.sql
--
-- Packaging and Dispatch's Transport Mode goes from a 2-way branch
-- (Receiving's Section vs Transportation Details) to the real 11 dispatch
-- modes the business actually uses, each with its own small field set —
-- see lib/dispatch-mode.ts's FIELD_DEFS for the authoritative mapping of
-- mode -> fields -> these columns.
--
-- Only 4 fields were truly shared across every mode and already existed
-- (transporter_name/transporter_contact — now generically "driver name/
-- mobile" — expense_amount — "freight/fare" — and receiving_copy_url —
-- "proof document", reused by Customer Pickup's Handover Proof, Door
-- Delivery's POD, and the 2 legacy receiving modes' Receiving's Copy). The
-- columns below are the ones genuinely unique to one or a few modes.
--
-- Downstream routing stays 2-way: ONLY "Customer Pickup / Self Pickup"
-- skips Bilty Upload (sets client_confirmation_planned directly, like the
-- 2 legacy "By Hand ..." modes already did) — every other mode, including
-- Door Delivery, goes through Bilty Upload as before (confirmed with user).
--
-- otp_dropdown (category transport_mode) is reseeded with the 11 new
-- values. "By Hand Maniquip Store" and "By Hand-Warehouse" are
-- DELIBERATELY left in place (not replaced) — live pending-count check at
-- the time of this migration showed 12 and 18 orders respectively still
-- carrying those exact transport_mode values, so dispatch-mode.ts keeps a
-- temporary "legacy_receiving" section for them (see its own comment for
-- the removal query/condition). "By Hand-Head Office" had 0 pending and is
-- dropped outright. "By Transport"/"By Auto"/"By Bus"/"By Courier"/"By Air"
-- are dropped too (their pending orders — 14/1/2/0/0 respectively — simply
-- won't pre-fill-match on next open; the Select falls back to showing the
-- raw stored value and the user just picks a new mode manually, same
-- fallback behavior the form already had for any unmatched value). "Door
-- delivery" (1 pending) needs no entry at all: the new "Door Delivery"
-- matches it case-insensitively already.
-- =====================================================================

ALTER TABLE public.otp_packaging_transport
  ADD COLUMN IF NOT EXISTS vehicle_type text,
  ADD COLUMN IF NOT EXISTS vehicle_no text,
  ADD COLUMN IF NOT EXISTS reference_no text,
  ADD COLUMN IF NOT EXISTS carrier_name text,
  ADD COLUMN IF NOT EXISTS carrier_branch text,
  ADD COLUMN IF NOT EXISTS route_info text,
  ADD COLUMN IF NOT EXISTS carrier_driver_name text,
  ADD COLUMN IF NOT EXISTS carrier_driver_mobile text,
  ADD COLUMN IF NOT EXISTS weight text,
  ADD COLUMN IF NOT EXISTS packages_count text,
  ADD COLUMN IF NOT EXISTS event_datetime timestamptz;

DELETE FROM public.otp_dropdown
WHERE category = 'transport_mode'
  AND value IN ('By Hand-Head Office', 'By Transport', 'By Auto', 'By Bus', 'By Courier', 'By Air', 'Door delivery');

INSERT INTO public.otp_dropdown (category, value) VALUES
  ('transport_mode', 'Local Vehicle'),
  ('transport_mode', 'Auto'),
  ('transport_mode', 'Bike/Rider'),
  ('transport_mode', 'Courier'),
  ('transport_mode', 'Transport'),
  ('transport_mode', 'Bus Parcel'),
  ('transport_mode', 'Air Cargo'),
  ('transport_mode', 'Railway Parcel'),
  ('transport_mode', 'Door Delivery'),
  ('transport_mode', 'Direct Dispatch'),
  ('transport_mode', 'Customer Pickup / Self Pickup')
ON CONFLICT (category, value) DO NOTHING;
