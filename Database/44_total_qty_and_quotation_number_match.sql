-- =====================================================================
-- 44_total_qty_and_quotation_number_match.sql
--
-- MUST BE RUN AGAINST THE SAME PRODUCTION DATABASE as 13_/19_/20_/34_.
--
-- Two changes to otp_sync_order_from_tracker(), in support of the
-- Lead-To-Order-Supabase-New History-tab edit feature:
--
-- 1. Quotation match now prefers the SPECIFIC quotation the tracker row
--    points at (NEW.quotation_number), not just "whatever quotation for
--    this enquiry has the newest created_at". Previously, quotation_copy
--    (and grand_total/ship_to_address/contact fields) were ALWAYS pulled
--    from the latest quotation regardless of NEW.quotation_number — so if
--    a user picked an older revision from a dropdown, otp_orders would
--    still end up with the newest revision's PDF, silently wrong. Falls
--    back to "latest for this enquiry" when quotation_number is null or
--    doesn't match anything, same as before.
--
-- 2. otp_orders.total_qty (new column) — sum of item quantities from
--    lto_enquiry_items / lto_lead_items, same source tables the `items`
--    jsonb column already reads from. Nothing upstream stores a
--    pre-aggregated total today (confirmed: no total_qty column anywhere
--    in the LTO schema, and the Google Sheet's "Total Qty" is computed
--    inside the Apps Script itself) — so this is computed fresh here,
--    same as `items` already is.
-- =====================================================================

ALTER TABLE public.otp_orders
  ADD COLUMN IF NOT EXISTS total_qty integer;

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
  v_total_qty             integer;

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

    SELECT COALESCE(jsonb_agg(jsonb_build_object('item_name', i.item_name, 'quantity', i.quantity)), '[]'::jsonb),
           COALESCE(SUM(i.quantity), 0)
      INTO v_items, v_total_qty
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

    SELECT COALESCE(jsonb_agg(jsonb_build_object('item_name', i.item_name, 'quantity', i.quantity)), '[]'::jsonb),
           COALESCE(SUM(i.quantity), 0)
      INTO v_items, v_total_qty
      FROM public.lto_lead_items i
     WHERE i.lead_id = NEW.lead_id;

    v_ref := v_source_ref;
  ELSE
    RETURN NEW;
  END IF;

  -- Prefer the SPECIFIC quotation the tracker row points at.
  IF NEW.quotation_number IS NOT NULL THEN
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
       AND upper(trim(q.quotation_no)) = upper(trim(NEW.quotation_number))
     ORDER BY q.created_at DESC
     LIMIT 1;
  END IF;

  -- Fallback: no quotation_number on the tracker, or it didn't match
  -- anything — latest quotation for this enquiry (unchanged prior
  -- behaviour, same match rule as vw_enquiry_master's latest_quotation CTE).
  IF v_q_quotation_no IS NULL THEN
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
  END IF;

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
    items, total_qty, order_acceptable_planned
  ) VALUES (
    NEW.id, CASE WHEN TG_TABLE_NAME = 'lto_enquiry_tracker' THEN 'enquiry' ELSE 'lead' END, v_source_ref, NEW.order_no,
    v_company_name, v_contact_person, v_phone_number, v_email,
    v_billing_address, v_shipping_address, v_gst_number, v_state, v_crm_name,
    NEW.po_number, NEW.destination, NEW.transport_mode, NEW.payment_mode, NEW.payment_terms_days,
    NEW.acceptance_via, NEW.acceptance_file_upload, NEW.warranty,
    COALESCE(NEW.amount_with_tax, v_q_grand_total),
    COALESCE(NEW.quotation_number, v_q_quotation_no), v_q_pdf_url,
    v_items, v_total_qty, now() + (v_oa_tat_minutes || ' minutes')::interval
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
    items = EXCLUDED.items,
    total_qty = EXCLUDED.total_qty;

  RETURN NEW;
END;
$function$;
