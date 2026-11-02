-- =====================================================================
-- 85_edit_calibration_request.sql
--
-- Pre-Invoice History: edit "Calib. Certificate Req." (and its dependent fields)
-- after the wave was processed. One atomic function so the queue row, the
-- Make Invoice calibration_planned and the Certi. Hardcopy columns can never
-- end up half-updated.
--
--   YES -> NO : queue calibration_required = false; Type / Hardcopy Req. / Delivery
--               Add. / address = NULL; otp_make_invoice.calibration_planned = NULL.
--   NO -> YES : queue gets the new values; if the wave already has a Make Invoice row,
--               calibration_planned = p_planned (now + Calibration TAT, computed by the
--               caller). A wave still before Make Invoice needs nothing more: Make
--               Invoice reads the queue flag when it is submitted.
--   Hardcopy planned is NOT created here: it is set when Calibration Certificate is
--   processed (the snapshot only exists then).
--
--   Refused once the certificate exists (otp_calibration_certificate row): YES -> NO,
--   and adding a hardcopy request. A hardcopy request can still be withdrawn while the
--   hardcopy PDF has not been generated (hardcopy_planned / snapshot are cleared).
--
-- Every edit is appended to otp_pre_invoice_queue.calibration_edit_log (jsonb array).
-- Safe to re-run.
-- =====================================================================

ALTER TABLE public.otp_pre_invoice_queue
  ADD COLUMN IF NOT EXISTS calibration_edit_log jsonb NOT NULL DEFAULT '[]'::jsonb;

CREATE OR REPLACE FUNCTION public.otp_edit_calibration_request(
  p_queue_id        uuid,
  p_required        boolean,
  p_type            text,
  p_hardcopy        boolean,
  p_hardcopy_type   text,
  p_hardcopy_addr   text,
  p_planned         timestamptz,
  p_actor           text
) RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  q        public.otp_pre_invoice_queue%ROWTYPE;
  v_mi_id  uuid;
  v_mi_planned timestamptz;
  cc       public.otp_calibration_certificate%ROWTYPE;
  v_has_cc boolean := false;
  v_type   text;
  v_hc     boolean;
  v_hc_type text;
  v_hc_addr text;
BEGIN
  SELECT * INTO q FROM public.otp_pre_invoice_queue WHERE id = p_queue_id FOR UPDATE;
  IF NOT FOUND OR q.status <> 'invoiced' THEN
    RAISE EXCEPTION 'Pre-Invoice wave not found or not processed yet';
  END IF;

  IF p_required THEN
    IF COALESCE(btrim(p_type), '') = '' THEN RAISE EXCEPTION 'Calibration Type is required'; END IF;
    IF p_hardcopy IS NULL THEN RAISE EXCEPTION 'Cert. Hardcopy Req. is required'; END IF;
    IF p_hardcopy AND (COALESCE(btrim(p_hardcopy_type), '') = '' OR COALESCE(btrim(p_hardcopy_addr), '') = '') THEN
      RAISE EXCEPTION 'Hardcopy Delivery Add. is required when Cert. Hardcopy Req. is Yes';
    END IF;
    v_type := btrim(p_type);
    v_hc := p_hardcopy;
    v_hc_type := CASE WHEN p_hardcopy THEN btrim(p_hardcopy_type) END;
    v_hc_addr := CASE WHEN p_hardcopy THEN btrim(p_hardcopy_addr) END;
  ELSE
    v_type := NULL; v_hc := NULL; v_hc_type := NULL; v_hc_addr := NULL;
  END IF;

  SELECT mi.id, mi.calibration_planned INTO v_mi_id, v_mi_planned
  FROM public.otp_make_invoice mi
  WHERE mi.pre_invoice_queue_id = p_queue_id
  ORDER BY mi.created_at LIMIT 1;

  IF v_mi_id IS NOT NULL THEN
    SELECT * INTO cc FROM public.otp_calibration_certificate WHERE make_invoice_id = v_mi_id;
    v_has_cc := FOUND;
  END IF;

  IF v_has_cc THEN
    IF NOT p_required THEN
      RAISE EXCEPTION 'Certificate already generated, cannot change';
    END IF;
    IF v_hc IS TRUE AND cc.hardcopy_planned IS NULL THEN
      RAISE EXCEPTION 'Certificate already generated, a hardcopy cannot be added now';
    END IF;
    IF v_hc IS NOT TRUE AND cc.hardcopy_created_at IS NOT NULL THEN
      RAISE EXCEPTION 'Hardcopy already generated, cannot change';
    END IF;
    IF v_hc IS TRUE AND cc.hardcopy_created_at IS NOT NULL
       AND (q.hardcopy_delivery_type IS DISTINCT FROM v_hc_type OR q.hardcopy_delivery_address IS DISTINCT FROM v_hc_addr) THEN
      RAISE EXCEPTION 'Hardcopy already generated, cannot change';
    END IF;
  END IF;

  UPDATE public.otp_pre_invoice_queue SET
    calibration_required      = p_required,
    calibration_type          = v_type,
    cert_hardcopy_required    = v_hc,
    hardcopy_delivery_type    = v_hc_type,
    hardcopy_delivery_address = v_hc_addr,
    calibration_edit_log      = calibration_edit_log || jsonb_build_array(jsonb_build_object(
      'at', now(),
      'by', p_actor,
      'from', jsonb_build_object(
        'calibration_required', q.calibration_required, 'calibration_type', q.calibration_type,
        'cert_hardcopy_required', q.cert_hardcopy_required,
        'hardcopy_delivery_type', q.hardcopy_delivery_type, 'hardcopy_delivery_address', q.hardcopy_delivery_address),
      'to', jsonb_build_object(
        'calibration_required', p_required, 'calibration_type', v_type,
        'cert_hardcopy_required', v_hc,
        'hardcopy_delivery_type', v_hc_type, 'hardcopy_delivery_address', v_hc_addr)))
  WHERE id = p_queue_id;

  IF v_mi_id IS NOT NULL AND NOT v_has_cc THEN
    -- Keep an existing planned date when it stays YES (editing other fields must not move the deadline).
    UPDATE public.otp_make_invoice
       SET calibration_planned = CASE WHEN p_required THEN COALESCE(v_mi_planned, p_planned) ELSE NULL END
     WHERE id = v_mi_id;
  END IF;

  -- Withdrawing a hardcopy request after Calibration was processed, before its PDF exists.
  IF v_has_cc AND v_hc IS NOT TRUE AND cc.hardcopy_planned IS NOT NULL AND cc.hardcopy_created_at IS NULL THEN
    UPDATE public.otp_calibration_certificate
       SET hardcopy_planned = NULL, certificate_snapshot = NULL
     WHERE id = cc.id;
  END IF;

  RETURN jsonb_build_object('makeInvoiceFound', v_mi_id IS NOT NULL, 'certificateExists', v_has_cc);
END;
$$;

REVOKE ALL ON FUNCTION public.otp_edit_calibration_request(uuid, boolean, text, boolean, text, text, timestamptz, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.otp_edit_calibration_request(uuid, boolean, text, boolean, text, text, timestamptz, text) TO service_role;
