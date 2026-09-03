-- ==============================================================================
-- 08_order_ingest_webhook.sql
-- Webhook Ingestion Function for Lead-To-Order Data
-- Ingests converted orders atomically into otp_orders and otp_order_items
-- ==============================================================================

CREATE OR REPLACE FUNCTION otp_ingest_order(
  p_lto_order_id    TEXT,
  p_quotation_no    TEXT,
  p_company_name    TEXT,
  p_contact_person  TEXT,
  p_contact_number  TEXT,
  p_billing_address TEXT,
  p_shipping_addr   TEXT,
  p_payment_mode    TEXT,
  p_payment_terms   INTEGER,
  p_reference_name  TEXT,
  p_email           TEXT,
  p_transport_mode  TEXT,
  p_destination     TEXT,
  p_po_number       TEXT,
  p_quotation_copy  TEXT,
  p_acceptance_copy TEXT,
  p_total_order_qty NUMERIC,
  p_amount          NUMERIC,
  p_items           JSONB -- Array format: [{"item_no": 1, "item_name": "...", "quantity": 10}, ...]
)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_order_id  UUID;
  v_order_no  TEXT;
  v_item      JSONB;
  v_is_new    BOOLEAN := FALSE;
BEGIN
  -- Check if order with this source_lto_order_id already exists (idempotency)
  IF p_lto_order_id IS NOT NULL AND TRIM(p_lto_order_id) <> '' THEN
    SELECT id, order_no INTO v_order_id, v_order_no 
    FROM otp_orders 
    WHERE source_lto_order_id = p_lto_order_id;
  END IF;

  IF v_order_id IS NOT NULL THEN
    -- Update existing order
    UPDATE otp_orders SET
      quotation_no        = COALESCE(p_quotation_no, quotation_no),
      company_name        = COALESCE(p_company_name, company_name),
      contact_person_name = COALESCE(p_contact_person, contact_person_name),
      contact_number      = COALESCE(p_contact_number, contact_number),
      billing_address     = COALESCE(p_billing_address, billing_address),
      shipping_address    = COALESCE(p_shipping_addr, shipping_address),
      payment_mode        = COALESCE(p_payment_mode, payment_mode),
      payment_terms_days  = COALESCE(p_payment_terms, payment_terms_days),
      reference_name      = COALESCE(p_reference_name, reference_name),
      email               = COALESCE(p_email, email),
      transport_mode      = COALESCE(p_transport_mode, transport_mode),
      destination         = COALESCE(p_destination, destination),
      po_number           = COALESCE(p_po_number, po_number),
      quotation_copy_url  = COALESCE(p_quotation_copy, quotation_copy_url),
      acceptance_copy_url = COALESCE(p_acceptance_copy, acceptance_copy_url),
      total_order_qty     = COALESCE(p_total_order_qty, total_order_qty),
      amount              = COALESCE(p_amount, amount),
      updated_at          = NOW()
    WHERE id = v_order_id;
  ELSE
    -- Insert new order
    v_is_new := TRUE;
    INSERT INTO otp_orders (
      quotation_no,
      company_name,
      contact_person_name,
      contact_number,
      billing_address,
      shipping_address,
      payment_mode,
      payment_terms_days,
      reference_name,
      email,
      transport_mode,
      destination,
      po_number,
      quotation_copy_url,
      acceptance_copy_url,
      total_order_qty,
      amount,
      source_lto_order_id
    ) VALUES (
      p_quotation_no,
      p_company_name,
      p_contact_person,
      p_contact_number,
      p_billing_address,
      p_shipping_addr,
      p_payment_mode,
      COALESCE(p_payment_terms, 0),
      p_reference_name,
      p_email,
      p_transport_mode,
      p_destination,
      p_po_number,
      p_quotation_copy,
      p_acceptance_copy,
      COALESCE(p_total_order_qty, 0),
      COALESCE(p_amount, 0),
      p_lto_order_id
    ) RETURNING id, order_no INTO v_order_id, v_order_no;
  END IF;

  -- Upsert line items if provided
  IF p_items IS NOT NULL AND jsonb_typeof(p_items) = 'array' THEN
    -- Delete previous items if updating
    IF NOT v_is_new THEN
      DELETE FROM otp_order_items WHERE order_id = v_order_id;
    END IF;

    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
      IF (v_item->>'item_name') IS NOT NULL AND TRIM(v_item->>'item_name') <> '' THEN
        INSERT INTO otp_order_items(order_id, item_no, item_name, quantity)
        VALUES (
          v_order_id,
          COALESCE((v_item->>'item_no')::INTEGER, 1),
          TRIM(v_item->>'item_name'),
          COALESCE((v_item->>'quantity')::NUMERIC, 0)
        )
        ON CONFLICT (order_id, item_no) DO UPDATE SET
          item_name = EXCLUDED.item_name,
          quantity  = EXCLUDED.quantity;
      END IF;
    END LOOP;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'order_id', v_order_id,
    'order_no', v_order_no,
    'is_new', v_is_new
  );
END;
$$;
