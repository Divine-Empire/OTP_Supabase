-- =====================================================================
-- 36_packaging_transport_off_make_invoice.sql
--
-- MUST BE RUN AGAINST THE SAME PRODUCTION DATABASE as 25_/27_/35_.
--
-- Re-points Packaging and Transport to branch directly off Make Invoice,
-- in PARALLEL with Calibration Certificate, instead of being chained
-- after Calibration Certificate. Previously packaging_transport_planned
-- lived on otp_calibration_certificate and only got set once a
-- calibration certificate was submitted — meaning Packaging and
-- Transport could never show a pending order until Calibration
-- Certificate had already processed it, and calibration_required=false
-- waves never reached it at all.
--
-- New behaviour: Make Invoice's own POST route now sets BOTH
-- calibration_planned (unchanged — still only when calibration_required
-- = true) AND packaging_transport_planned (unconditionally, every wave)
-- at the same moment, independently. Both stages' Pending queues are now
-- populated straight from otp_make_invoice, so an order shows up in
-- Calibration Certificate and/or Packaging and Transport at the same
-- time, and each stage is processed independently of the other.
--
--   Pending: otp_make_invoice.packaging_transport_planned IS NOT NULL
--            AND no matching otp_packaging_transport row yet.
--   History: a matching otp_packaging_transport row exists.
--
-- otp_packaging_transport's FK is repointed from
-- calibration_certificate_id -> make_invoice_id (table was empty in
-- production, no data migration needed).
-- =====================================================================

-- packaging_transport_planned moves from otp_calibration_certificate to otp_make_invoice.
ALTER TABLE public.otp_make_invoice
  ADD COLUMN IF NOT EXISTS packaging_transport_planned timestamptz;

ALTER TABLE public.otp_calibration_certificate
  DROP COLUMN IF EXISTS packaging_transport_planned;

-- Repoint otp_packaging_transport's FK from calibration_certificate_id to make_invoice_id.
ALTER TABLE public.otp_packaging_transport
  DROP CONSTRAINT IF EXISTS otp_packaging_transport_calibration_certificate_id_fkey;

ALTER TABLE public.otp_packaging_transport
  DROP CONSTRAINT IF EXISTS otp_packaging_transport_calibration_certificate_id_key;

ALTER TABLE public.otp_packaging_transport
  RENAME COLUMN calibration_certificate_id TO make_invoice_id;

ALTER TABLE public.otp_packaging_transport
  ADD CONSTRAINT otp_packaging_transport_make_invoice_id_fkey
    FOREIGN KEY (make_invoice_id) REFERENCES public.otp_make_invoice(id) ON DELETE CASCADE;

ALTER TABLE public.otp_packaging_transport
  ADD CONSTRAINT otp_packaging_transport_make_invoice_id_key UNIQUE (make_invoice_id);
