-- =====================================================================
-- 19_fix_otp_orders_trigger_dropped_quotation_value_cols.sql
--
-- MUST BE RUN AGAINST THE SAME PRODUCTION DATABASE as 13_/14_/15_.
--
-- otp_orders.quotation_value_without_tax and .quotation_value_with_tax
-- were dropped manually, but otp_sync_order_from_tracker() (last defined
-- in 15_fix_otp_orders_quotation_join.sql) still referenced both columns
-- in its INSERT column list / VALUES / ON CONFLICT DO UPDATE SET. Since
-- this function runs as a trigger on lto_enquiry_tracker(_for_leads)
-- (fired from Lead-To-Order-Supabase-New's EnquiryTracker.jsx on order
-- conversion), every conversion started failing with a
-- "column ... does not exist" error the moment those columns were
-- dropped. This just re-creates the function with both references
-- removed — no other behavior changes.
-- =====================================================================

CREATE OR REPLACE FUNCTION public.otp_sync_order_from_tracker()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
  v_items                 jsonb;

  v_q_quotation_no        text;
  v_q_grand_total         numeric;
  v_q_ship_to_address     text;
  v_q_contact_name        text;
  v_q_contact_no          text;
  v_q_billing_address     text;
  v_q_gst_number          text;
BEGIN
  IF NEW.is_order_received_status IS DISTINCT FROM 'yes' THEN
    RETURN NEW;
  END IF;

  IF TG_TABLE_NAME = 'lto_enquiry_tracker' THEN
    SELECT e.company_name, NULL, e.phone_number, e.email,
           NULL, e.shipping_address, e.gst_number, e.enquiry_for_state,
           e.enquiry_no
      INTO v_company_name, v_contact_person, v_phone_number, v_email,
           v_billing_address, v_shipping_address, v_gst_number, v_state,
           v_source_ref
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
           l.lead_no
      INTO v_company_name, v_contact_person, v_phone_number, v_email,
           v_billing_address, v_shipping_address, v_gst_number, v_state,
           v_source_ref
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
         cm.billing_address, cm.gst_number
    INTO v_q_quotation_no, v_q_grand_total, v_q_ship_to_address,
         v_q_contact_name, v_q_contact_no,
         v_q_billing_address, v_q_gst_number
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

  INSERT INTO public.otp_orders (
    source_tracker_id, source_kind, source_ref, order_no,
    company_name, contact_person, phone_number, email,
    billing_address, shipping_address, gst_number, state,
    po_number, destination, transport_mode, payment_mode, payment_terms_days,
    acceptance_via, acceptance_file_upload, warranty, amount_with_tax,
    quotation_number,
    items, order_acceptable_planned
  ) VALUES (
    NEW.id, CASE WHEN TG_TABLE_NAME = 'lto_enquiry_tracker' THEN 'enquiry' ELSE 'lead' END, v_source_ref, NEW.order_no,
    v_company_name, v_contact_person, v_phone_number, v_email,
    v_billing_address, v_shipping_address, v_gst_number, v_state,
    NEW.po_number, NEW.destination, NEW.transport_mode, NEW.payment_mode, NEW.payment_terms_days,
    NEW.acceptance_via, NEW.acceptance_file_upload, NEW.warranty,
    COALESCE(NEW.amount_with_tax, v_q_grand_total),
    COALESCE(NEW.quotation_number, v_q_quotation_no),
    v_items, now() + interval '5 days'
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
    items = EXCLUDED.items;

  RETURN NEW;
END;
$$;
