-- =====================================================================
-- 63_order_location.sql
--
-- MUST BE RUN AGAINST THE SAME PRODUCTION DATABASE as 50_/56_ (shared
-- LTO + OTP database).
--
-- Every order now carries the physical location it ships from, picked in
-- LTO at order conversion (OrderStatusFrom.jsx) and synced into
-- otp_orders by the existing tracker trigger. OTP users are scoped to one
-- location (otp_users.location, which already existed — admin = 'all'),
-- and every OTP stage only shows a user their own location's orders.
-- Orders with no location yet (everything converted before this
-- migration) stay visible to everyone until an admin sets one.
--
-- Values are stored as the exact human label. The single mapping to IMS
-- location codes lives in OTP_Supabase/lib/locations.ts.
--
-- The trigger function below is migration 50's body verbatim (diffed
-- against the live definition before writing this) plus order_location.
-- The two _upd triggers are migration 56's, with order_location added to
-- the WHEN list so a location-only edit in LTO still re-syncs.
-- =====================================================================

ALTER TABLE public.lto_enquiry_tracker ADD COLUMN IF NOT EXISTS order_location text;
ALTER TABLE public.lto_enquiry_tracker_for_leads ADD COLUMN IF NOT EXISTS order_location text;
ALTER TABLE public.otp_orders ADD COLUMN IF NOT EXISTS order_location text;
CREATE INDEX IF NOT EXISTS idx_otp_orders_order_location ON public.otp_orders (order_location);

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
  v_q_items               jsonb;
  v_q_total_qty           integer;
  v_q_item_count          integer;

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

    SELECT COALESCE(jsonb_agg(jsonb_build_object('item_name', i.item_name, 'quantity', i.quantity, 'description', NULL, 'rate', NULL)), '[]'::jsonb),
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

    SELECT COALESCE(jsonb_agg(jsonb_build_object('item_name', i.item_name, 'quantity', i.quantity, 'description', NULL, 'rate', NULL)), '[]'::jsonb),
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

  -- Prefer the matched quotation's own items over the enquiry/lead's
  -- original item list -- see 47_order_items_from_matched_quotation.sql.
  -- Now also carries each item's `description` (migration 48) and `rate`
  -- (this migration).
  IF v_q_quotation_no IS NOT NULL THEN
    SELECT COUNT(*) INTO v_q_item_count
      FROM public.lto_make_quotation_items qi
     WHERE qi.quotation_no = v_q_quotation_no
       AND upper(trim(qi.item_name)) NOT IN ('FREIGHT', 'PACKAGING AND FORWARDING');

    IF v_q_item_count > 0 THEN
      SELECT jsonb_agg(jsonb_build_object('item_name', qi.item_name, 'quantity', qi.quantity, 'description', qi.description, 'rate', qi.rate)),
             SUM(qi.quantity)::integer
        INTO v_q_items, v_q_total_qty
        FROM public.lto_make_quotation_items qi
       WHERE qi.quotation_no = v_q_quotation_no
         AND upper(trim(qi.item_name)) NOT IN ('FREIGHT', 'PACKAGING AND FORWARDING');

      v_items := v_q_items;
      v_total_qty := v_q_total_qty;
    END IF;
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
    items, total_qty, order_acceptable_planned, order_location
  ) VALUES (
    NEW.id, CASE WHEN TG_TABLE_NAME = 'lto_enquiry_tracker' THEN 'enquiry' ELSE 'lead' END, v_source_ref, NEW.order_no,
    v_company_name, v_contact_person, v_phone_number, v_email,
    v_billing_address, v_shipping_address, v_gst_number, v_state, v_crm_name,
    NEW.po_number, NEW.destination, NEW.transport_mode, NEW.payment_mode, NEW.payment_terms_days,
    NEW.acceptance_via, NEW.acceptance_file_upload, NEW.warranty,
    COALESCE(NEW.amount_with_tax, v_q_grand_total),
    COALESCE(NEW.quotation_number, v_q_quotation_no), v_q_pdf_url,
    v_items, v_total_qty, now() + (v_oa_tat_minutes || ' minutes')::interval, NEW.order_location
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
    total_qty = EXCLUDED.total_qty,
    -- A blank tracker value never wipes a location an OTP admin already set.
    order_location = COALESCE(EXCLUDED.order_location, public.otp_orders.order_location);

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS otp_trg_enquiry_tracker_to_orders_upd ON public.lto_enquiry_tracker;
CREATE TRIGGER otp_trg_enquiry_tracker_to_orders_upd
  AFTER UPDATE ON public.lto_enquiry_tracker
  FOR EACH ROW
  WHEN (
    NEW.is_order_received_status = 'yes' AND (
      OLD.is_order_received_status IS DISTINCT FROM NEW.is_order_received_status OR
      OLD.quotation_number IS DISTINCT FROM NEW.quotation_number OR
      OLD.po_number IS DISTINCT FROM NEW.po_number OR
      OLD.destination IS DISTINCT FROM NEW.destination OR
      OLD.transport_mode IS DISTINCT FROM NEW.transport_mode OR
      OLD.payment_mode IS DISTINCT FROM NEW.payment_mode OR
      OLD.payment_terms_days IS DISTINCT FROM NEW.payment_terms_days OR
      OLD.acceptance_via IS DISTINCT FROM NEW.acceptance_via OR
      OLD.acceptance_file_upload IS DISTINCT FROM NEW.acceptance_file_upload OR
      OLD.warranty IS DISTINCT FROM NEW.warranty OR
      OLD.amount_with_tax IS DISTINCT FROM NEW.amount_with_tax OR
      OLD.order_no IS DISTINCT FROM NEW.order_no OR
      OLD.order_location IS DISTINCT FROM NEW.order_location
    )
  )
  EXECUTE FUNCTION public.otp_sync_order_from_tracker();

DROP TRIGGER IF EXISTS otp_trg_lead_tracker_to_orders_upd ON public.lto_enquiry_tracker_for_leads;
CREATE TRIGGER otp_trg_lead_tracker_to_orders_upd
  AFTER UPDATE ON public.lto_enquiry_tracker_for_leads
  FOR EACH ROW
  WHEN (
    NEW.is_order_received_status = 'yes' AND (
      OLD.is_order_received_status IS DISTINCT FROM NEW.is_order_received_status OR
      OLD.quotation_number IS DISTINCT FROM NEW.quotation_number OR
      OLD.po_number IS DISTINCT FROM NEW.po_number OR
      OLD.destination IS DISTINCT FROM NEW.destination OR
      OLD.transport_mode IS DISTINCT FROM NEW.transport_mode OR
      OLD.payment_mode IS DISTINCT FROM NEW.payment_mode OR
      OLD.payment_terms_days IS DISTINCT FROM NEW.payment_terms_days OR
      OLD.acceptance_via IS DISTINCT FROM NEW.acceptance_via OR
      OLD.acceptance_file_upload IS DISTINCT FROM NEW.acceptance_file_upload OR
      OLD.warranty IS DISTINCT FROM NEW.warranty OR
      OLD.amount_with_tax IS DISTINCT FROM NEW.amount_with_tax OR
      OLD.order_no IS DISTINCT FROM NEW.order_no OR
      OLD.order_location IS DISTINCT FROM NEW.order_location
    )
  )
  EXECUTE FUNCTION public.otp_sync_order_from_tracker();

INSERT INTO public.lto_dropdown (category, value) VALUES
  ('order_location', 'Warehouse-CG'),
  ('order_location', 'Head-Office-CG'),
  ('order_location', 'Service-Inbound-CG'),
  ('order_location', 'Maniquip-CG'),
  ('order_location', 'Warehouse-NE')
ON CONFLICT (category, value) DO NOTHING;

INSERT INTO public.otp_dropdown (category, value, sort_order) VALUES
  ('order_location', 'Warehouse-CG', 1),
  ('order_location', 'Head-Office-CG', 2),
  ('order_location', 'Service-Inbound-CG', 3),
  ('order_location', 'Maniquip-CG', 4),
  ('order_location', 'Warehouse-NE', 5)
ON CONFLICT (category, value) DO NOTHING;
