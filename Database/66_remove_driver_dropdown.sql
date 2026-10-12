-- =====================================================================
-- 66_remove_driver_dropdown.sql
--
-- Packaging and Dispatch's driver / rider name fields are plain text inputs
-- now (they used to be a Select fed by this otp_dropdown category, seeded by
-- Database/40_packaging_transport_simplify_transport_details.sql). Nothing
-- else reads the category, so its seeded values are deleted.
-- =====================================================================

DELETE FROM public.otp_dropdown WHERE category = 'assign_driver_for_dispatch';
