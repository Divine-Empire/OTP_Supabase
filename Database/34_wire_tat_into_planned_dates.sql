-- Wires otp_stage_tat into the two planned-date calculations that live in
-- SQL triggers (every other stage's planned date is computed in its own
-- API route — see lib/tat.ts and the getStageTatMinutes() calls added
-- alongside this migration).
--
-- Rule everywhere: a stage's planned date = the previous stage's record
-- creation time (now(), since these triggers fire at that creation moment)
-- + that stage's TAT duration from otp_stage_tat.

-- 1. otp_sync_order_from_tracker(): order_acceptable_planned was a hardcoded
--    now() + interval '5 days'. Same function otherwise, just the one value
--    changed to a dynamic otp_stage_tat lookup (falling back to 5 days if
--    the row is somehow missing).
CREATE OR REPLACE FUNCTION public.otp_sync_order_from_tracker()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_ref                  text;   -- enquiry_no or lead_no, used to find the matching quotation
  v_company_name          text;
  v_contact_person        text;
  v_phone_number          text;
  v_email                 text;
  v_billing_address       text;
  v_shipping_address      text;
  v_gst_number            text;
  v_state                 text;
  v_source_ref            text;
  v_crm_name              text;
  v_items                 jsonb;

  v_q_quotation_no        text;
  v_q_grand_total         numeric;
  v_q_ship_to_address     text;
  v_q_contact_name        text;
  v_q_contact_no          text;
  v_q_billing_address     text;
  v_q_gst_number          text;
  v_q_pdf_url             text;

  v_oa_tat_minutes        integer;
BEGIN
  IF NEW.is_order_received_status IS DISTINCT FROM 'yes' THEN
    RETURN NEW;
  END IF;

  IF TG_TABLE_NAME = 'lto_enquiry_tracker' THEN
    SELECT e.company_name, NULL, e.phone_number, e.email,
           NULL, e.shipping_address, e.gst_number, e.enquiry_for_state,
           e.enquiry_no, e.crm_name
      INTO v_company_name, v_contact_person, v_phone_number, v_email,
           v_billing_address, v_shipping_address, v_gst_number, v_state,
           v_source_ref, v_crm_name
      FROM public.lto_enquiries e
     WHERE e.id = NEW.enquiry_id;

    SELECT COALESCE(jsonb_agg(jsonb_build_object('item_name', i.item_name, 'quantity', i.quantity)), '[]'::jsonb)
      INTO v_items
      FROM public.lto_enquiry_items i
     WHERE i.enquiry_id = NEW.enquiry_id;

    v_ref := v_source_ref;

  ELSIF TG_TABLE_NAME = 'lto_enquiry_tracker_for_leads' THEN
    SELECT l.company_name, l.person_name, l.phone_number, l.email_address,
           l.address, NULL, l.gst_number, l.state,
           l.lead_no, l.crm_name
      INTO v_company_name, v_contact_person, v_phone_number, v_email,
           v_billing_address, v_shipping_address, v_gst_number, v_state,
           v_source_ref, v_crm_name
      FROM public.lto_leads l
     WHERE l.id = NEW.lead_id;

    SELECT COALESCE(jsonb_agg(jsonb_build_object('item_name', i.item_name, 'quantity', i.quantity)), '[]'::jsonb)
      INTO v_items
      FROM public.lto_lead_items i
     WHERE i.lead_id = NEW.lead_id;

    v_ref := v_source_ref;
  ELSE
    RETURN NEW;
  END IF;

  -- Latest matching quotation (same match rule as vw_enquiry_master's
  -- latest_quotation CTE), plus the client-master row it points at for
  -- billing address / GST.
  SELECT q.quotation_no, q.grand_total, q.ship_to_address,
         q.consignee_contact_name, q.consignee_contact_no,
         cm.billing_address, cm.gst_number, q.pdf_url
    INTO v_q_quotation_no, v_q_grand_total, v_q_ship_to_address,
         v_q_contact_name, v_q_contact_no,
         v_q_billing_address, v_q_gst_number, v_q_pdf_url
    FROM public.lto_make_quotations q
    LEFT JOIN public.lto_client_master cm ON cm.uuid = q.consignee_client_id
   WHERE q.enquiry_reference_no IS NOT NULL
     AND upper(trim(q.enquiry_reference_no)) = upper(trim(v_ref))
   ORDER BY q.created_at DESC, q.quotation_no DESC
   LIMIT 1;

  -- Fill gaps from the quotation/client-master data; tracker/parent-row
  -- values (already in the v_* variables) win whenever they're present.
  v_contact_person   := COALESCE(v_contact_person, v_q_contact_name);
  v_phone_number     := COALESCE(v_phone_number, v_q_contact_no);
  v_billing_address  := COALESCE(v_billing_address, v_q_billing_address);
  v_shipping_address := COALESCE(v_shipping_address, v_q_ship_to_address);
  v_gst_number       := COALESCE(v_gst_number, v_q_gst_number);

  SELECT tat_minutes INTO v_oa_tat_minutes FROM public.otp_stage_tat WHERE stage_key = 'order_acceptable';
  v_oa_tat_minutes := COALESCE(v_oa_tat_minutes, 7200);

  INSERT INTO public.otp_orders (
    source_tracker_id, source_kind, source_ref, order_no,
    company_name, contact_person, phone_number, email,
    billing_address, shipping_address, gst_number, state, crm_name,
    po_number, destination, transport_mode, payment_mode, payment_terms_days,
    acceptance_via, acceptance_file_upload, warranty, amount_with_tax,
    quotation_number, quotation_copy,
    items, order_acceptable_planned
  ) VALUES (
    NEW.id, CASE WHEN TG_TABLE_NAME = 'lto_enquiry_tracker' THEN 'enquiry' ELSE 'lead' END, v_source_ref, NEW.order_no,
    v_company_name, v_contact_person, v_phone_number, v_email,
    v_billing_address, v_shipping_address, v_gst_number, v_state, v_crm_name,
    NEW.po_number, NEW.destination, NEW.transport_mode, NEW.payment_mode, NEW.payment_terms_days,
    NEW.acceptance_via, NEW.acceptance_file_upload, NEW.warranty,
    COALESCE(NEW.amount_with_tax, v_q_grand_total),
    COALESCE(NEW.quotation_number, v_q_quotation_no), v_q_pdf_url,
    v_items, now() + (v_oa_tat_minutes || ' minutes')::interval
  )
  ON CONFLICT (source_tracker_id) DO UPDATE SET
    order_no = EXCLUDED.order_no,
    company_name = EXCLUDED.company_name,
    contact_person = EXCLUDED.contact_person,
    phone_number = EXCLUDED.phone_number,
    email = EXCLUDED.email,
    billing_address = EXCLUDED.billing_address,
    shipping_address = EXCLUDED.shipping_address,
    gst_number = EXCLUDED.gst_number,
    state = EXCLUDED.state,
    crm_name = EXCLUDED.crm_name,
    po_number = EXCLUDED.po_number,
    destination = EXCLUDED.destination,
    transport_mode = EXCLUDED.transport_mode,
    payment_mode = EXCLUDED.payment_mode,
    payment_terms_days = EXCLUDED.payment_terms_days,
    acceptance_via = EXCLUDED.acceptance_via,
    acceptance_file_upload = EXCLUDED.acceptance_file_upload,
    warranty = EXCLUDED.warranty,
    amount_with_tax = EXCLUDED.amount_with_tax,
    quotation_number = EXCLUDED.quotation_number,
    quotation_copy = EXCLUDED.quotation_copy,
    items = EXCLUDED.items;

  RETURN NEW;
END;
$function$;

-- 2. otp_recalc_proforma_planned() (Database/29): the two 3-day hardcoded
--    offsets become dynamic otp_stage_tat lookups too, same rule (base time
--    is now(), since this fires at the moment payment_mode changes).
CREATE OR REPLACE FUNCTION public.otp_recalc_proforma_planned()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_acc public.otp_orders_acceptable;
  v_tat_minutes integer;
BEGIN
  SELECT * INTO v_acc FROM public.otp_orders_acceptable WHERE order_id = NEW.id;

  IF v_acc.id IS NULL OR v_acc.is_order_acceptable IS DISTINCT FROM 'Yes' THEN
    RETURN NEW;
  END IF;

  IF EXISTS (SELECT 1 FROM public.otp_check_inventory WHERE order_id = NEW.id) THEN
    RETURN NEW;
  END IF;

  IF NEW.payment_mode = 'pi against advance' THEN
    IF NOT EXISTS (SELECT 1 FROM public.otp_proforma_invoice WHERE order_id = NEW.id) THEN
      SELECT tat_minutes INTO v_tat_minutes FROM public.otp_stage_tat WHERE stage_key = 'proforma_invoice';
      v_tat_minutes := COALESCE(v_tat_minutes, 4320);
      UPDATE public.otp_orders_acceptable
         SET proforma_invoice_planned = now() + (v_tat_minutes || ' minutes')::interval,
             check_inventory_planned = NULL
       WHERE order_id = NEW.id;
    END IF;
  ELSE
    IF v_acc.proforma_invoice_planned IS NOT NULL
       AND NOT EXISTS (SELECT 1 FROM public.otp_proforma_invoice WHERE order_id = NEW.id) THEN
      SELECT tat_minutes INTO v_tat_minutes FROM public.otp_stage_tat WHERE stage_key = 'check_inventory';
      v_tat_minutes := COALESCE(v_tat_minutes, 4320);
      UPDATE public.otp_orders_acceptable
         SET proforma_invoice_planned = NULL,
             check_inventory_planned = now() + (v_tat_minutes || ' minutes')::interval
       WHERE order_id = NEW.id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;
