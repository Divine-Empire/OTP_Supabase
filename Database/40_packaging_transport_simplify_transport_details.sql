-- =====================================================================
-- 40_packaging_transport_simplify_transport_details.sql
--
-- MUST BE RUN AGAINST THE SAME PRODUCTION DATABASE as 35_/39_.
--
-- Packaging and Transport's "Transportation Details" section is cut down
-- to 4 fields: Assigned Driver (dropdown, category=assign_driver_for_
-- dispatch), Driver Contact, Expense Amount, Transporter's Remark.
--
-- Bilty/Docket No., Bilty Upload, Freight/Hamali/Parking Charge are
-- dropped from this stage entirely — they're now exclusively captured
-- one stage later, in the dedicated Bilty Upload stage
-- (otp_bilty_upload — see Database/38_otp_bilty_upload.sql), so this
-- removes the now-redundant duplicate capture here.
-- =====================================================================

ALTER TABLE public.otp_packaging_transport
  DROP COLUMN IF EXISTS bilty_number,
  DROP COLUMN IF EXISTS bilty_upload_urls,
  DROP COLUMN IF EXISTS freight_charge,
  DROP COLUMN IF EXISTS hamali_charge,
  DROP COLUMN IF EXISTS parking_charge;
