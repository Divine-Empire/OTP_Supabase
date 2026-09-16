-- =====================================================================
-- 13_otp_orders_sync_from_lto.sql
--
-- MUST BE RUN AGAINST THE LEAD-TO-ORDER PRODUCTION DATABASE
-- (nfwtbrmqvsejwwvraanf.supabase.co) — NOT the old OTP_Supabase dev
-- project. Lead-To-Order-Supabase-New's own .env already points at
-- this same project, so lto_* tables and otp_orders below live in the
-- same Postgres database. That's why this is a plain in-database
-- trigger rather than an HTTP webhook/pg_net call.
--
-- Purpose: create a single otp_orders table that fills itself
-- automatically the instant a Lead-To-Order enquiry/lead converts
-- into an order (lto_enquiry_tracker(_for_leads).is_order_received_status
-- flips to 'yes'). This is purely additive — it does not read, write,
-- alter, or in any way interact with the existing Supabase Database
-- Webhook -> Apps Script -> Google Sheet flow already wired to the
-- same tables.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. otp_orders
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.otp_orders (
  id                            uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Idempotency / provenance
  source_tracker_id             uuid NOT NULL,
  source_kind                   text NOT NULL CHECK (source_kind IN ('enquiry', 'lead')),
  source_ref                    text,              -- lto_enquiries.enquiry_no or lto_leads.lead_no

  -- Order identity (reused as-is from the tracker row, not regenerated)
  order_no                      text,

  -- Customer / company info (from the parent lto_enquiries or lto_leads row)
  company_name                  text,
  contact_person                text,
  phone_number                  text,
  email                         text,
  billing_address               text,
  shipping_address              text,
  gst_number                    text,
  state                         text,

  -- Order details (from the tracker row itself)
  po_number                     text,
  destination                   text,
  transport_mode                text,
  payment_mode                  text,
  payment_terms_days            integer,
  acceptance_via                text,
  acceptance_file_upload        text,
  warranty                      text,
  amount_with_tax                numeric,
  quotation_number              text,
  quotation_value_without_tax   numeric,
  quotation_value_with_tax      numeric,

  -- Line items (kept inline as jsonb rather than a second table, per current scope)
  items                         jsonb NOT NULL DEFAULT '[]'::jsonb,

  -- Stage 1 (Order Acceptable) planned date. Simple fixed offset for now —
  -- a real otp_stage_tat-driven calculation is a later phase.
  order_acceptable_planned      timestamptz,

  created_at                    timestamptz NOT NULL DEFAULT now(),
  updated_at                    timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT otp_orders_source_tracker_id_key UNIQUE (source_tracker_id)
);

CREATE INDEX IF NOT EXISTS idx_otp_orders_order_no ON public.otp_orders (order_no);
CREATE INDEX IF NOT EXISTS idx_otp_orders_source_kind ON public.otp_orders (source_kind);

-- otp_orders is written only by the trigger below; RLS is left disabled
-- to match the rest of the otp_ schema's current design (app-layer/
-- service-role access, no policies).
ALTER TABLE public.otp_orders DISABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------
-- 2. updated_at maintenance
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.otp_trg_set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS otp_trg_orders_updated_at ON public.otp_orders;
CREATE TRIGGER otp_trg_orders_updated_at
  BEFORE UPDATE ON public.otp_orders
  FOR EACH ROW
  EXECUTE FUNCTION public.otp_trg_set_updated_at();

-- ---------------------------------------------------------------------
-- 3. Sync function — one function, two triggers (enquiry path / lead path)
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.otp_sync_order_from_tracker()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_company_name        text;
  v_contact_person       text;
  v_phone_number         text;
  v_email                text;
  v_billing_address      text;
  v_shipping_address     text;
  v_gst_number           text;
  v_state                text;
  v_source_ref           text;
  v_items                jsonb;
BEGIN
  -- Only act on rows that just became (or already are, on a later update) a
  -- received order. Skip everything else.
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

    INSERT INTO public.otp_orders (
      source_tracker_id, source_kind, source_ref, order_no,
      company_name, contact_person, phone_number, email,
      billing_address, shipping_address, gst_number, state,
      po_number, destination, transport_mode, payment_mode, payment_terms_days,
      acceptance_via, acceptance_file_upload, warranty, amount_with_tax,
      quotation_number, quotation_value_without_tax, quotation_value_with_tax,
      items, order_acceptable_planned
    ) VALUES (
      NEW.id, 'enquiry', v_source_ref, NEW.order_no,
      v_company_name, v_contact_person, v_phone_number, v_email,
      v_billing_address, v_shipping_address, v_gst_number, v_state,
      NEW.po_number, NEW.destination, NEW.transport_mode, NEW.payment_mode, NEW.payment_terms_days,
      NEW.acceptance_via, NEW.acceptance_file_upload, NEW.warranty, NEW.amount_with_tax,
      NEW.quotation_number, NEW.quotation_value_without_tax, NEW.quotation_value_with_tax,
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
      quotation_value_without_tax = EXCLUDED.quotation_value_without_tax,
      quotation_value_with_tax = EXCLUDED.quotation_value_with_tax,
      items = EXCLUDED.items;

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

    INSERT INTO public.otp_orders (
      source_tracker_id, source_kind, source_ref, order_no,
      company_name, contact_person, phone_number, email,
      billing_address, shipping_address, gst_number, state,
      po_number, destination, transport_mode, payment_mode, payment_terms_days,
      acceptance_via, acceptance_file_upload, warranty, amount_with_tax,
      quotation_number, quotation_value_without_tax, quotation_value_with_tax,
      items, order_acceptable_planned
    ) VALUES (
      NEW.id, 'lead', v_source_ref, NEW.order_no,
      v_company_name, v_contact_person, v_phone_number, v_email,
      v_billing_address, v_shipping_address, v_gst_number, v_state,
      NEW.po_number, NEW.destination, NEW.transport_mode, NEW.payment_mode, NEW.payment_terms_days,
      NEW.acceptance_via, NEW.acceptance_file_upload, NEW.warranty, NEW.amount_with_tax,
      NEW.quotation_number, NEW.quotation_value_without_tax, NEW.quotation_value_with_tax,
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
      quotation_value_without_tax = EXCLUDED.quotation_value_without_tax,
      quotation_value_with_tax = EXCLUDED.quotation_value_with_tax,
      items = EXCLUDED.items;
  END IF;

  RETURN NEW;
END;
$$;

-- ---------------------------------------------------------------------
-- 4. Triggers — additive only. Does not touch the existing Database
--    Webhook already configured on these same tables (dashboard-managed,
--    not defined in SQL, and left completely alone here).
-- ---------------------------------------------------------------------
DROP TRIGGER IF EXISTS otp_trg_enquiry_tracker_to_orders ON public.lto_enquiry_tracker;
CREATE TRIGGER otp_trg_enquiry_tracker_to_orders
  AFTER INSERT OR UPDATE ON public.lto_enquiry_tracker
  FOR EACH ROW
  WHEN (NEW.is_order_received_status = 'yes')
  EXECUTE FUNCTION public.otp_sync_order_from_tracker();

DROP TRIGGER IF EXISTS otp_trg_lead_tracker_to_orders ON public.lto_enquiry_tracker_for_leads;
CREATE TRIGGER otp_trg_lead_tracker_to_orders
  AFTER INSERT OR UPDATE ON public.lto_enquiry_tracker_for_leads
  FOR EACH ROW
  WHEN (NEW.is_order_received_status = 'yes')
  EXECUTE FUNCTION public.otp_sync_order_from_tracker();
