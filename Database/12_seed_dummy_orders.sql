-- ==============================================================================
-- 12_seed_dummy_orders.sql
-- Bulk Insert Real/Dummy Orders from Stage 1 (Order Acceptable)
-- ==============================================================================

DO $$
DECLARE
  v_order_id UUID;
BEGIN

  -- Order #1: DO-4737 (RAJAT EQUIPMENTS PRIVATE LIMITED)
  INSERT INTO otp_orders (
    order_no, quotation_no, timestamp, company_name, contact_person_name,
    contact_number, billing_address, shipping_address, payment_mode,
    payment_terms_days, reference_name, email, transport_mode, destination,
    po_number, quotation_copy_url, acceptance_copy_url, offer_show,
    conveyed_for_registration, total_order_qty, amount, gst_no, cre_name
  ) VALUES (
    'DO-4737', 'CRR-26-27-1963', '2026-09-02 12:44:58.786'::timestamptz, 'RAJAT EQUIPMENTS PRIVATE LIMITED', 'Om Prakash Ji',
    '9826652500', 'PLOT NO.33, NEAR YATAYAT THANA, BHANPURI INDUSTRIAL AREA, BHANPURI, Raipur, Chhattisgarh, 493221', 'PLOT NO.33, NEAR YATAYAT THANA, BHANPURI INDUSTRIAL AREA, BHANPURI, Raipur, Chhattisgarh, 493221', 'fullyadvance',
    1, 'NIKITA ROUT', NULL, 'by hand-warehouse', 'Raipur',
    NULL, 'https://nfwtbrmqvsejwwvraanf.supabase.co/storage/v1/object/public/quotation_image/Quotation_CRR-26-27-1963.pdf', 'https://nfwtbrmqvsejwwvraanf.supabase.co/storage/v1/object/public/acceptance_file_upload/1788421060032-rwh0ttwz9w9.pdf', 'no',
    'No', 3.0, 2743.5, '22AADCR5472P2ZY', 'NIKITA'
  )
  ON CONFLICT (order_no) DO UPDATE SET
    company_name = EXCLUDED.company_name,
    total_order_qty = EXCLUDED.total_order_qty,
    amount = EXCLUDED.amount,
    updated_at = NOW()
  RETURNING id INTO v_order_id;
  DELETE FROM otp_order_items WHERE order_id = v_order_id;
  INSERT INTO otp_order_items (order_id, item_no, item_name, quantity) VALUES
    (v_order_id, 1, 'BOSCH-75MM KNOTTED WIRE CUP BRUSH', 3.0);

  -- Order #2: DO-4736 (WONDER WATER PROOFING WORKS)
  INSERT INTO otp_orders (
    order_no, quotation_no, timestamp, company_name, contact_person_name,
    contact_number, billing_address, shipping_address, payment_mode,
    payment_terms_days, reference_name, email, transport_mode, destination,
    po_number, quotation_copy_url, acceptance_copy_url, offer_show,
    conveyed_for_registration, total_order_qty, amount, gst_no, cre_name
  ) VALUES (
    'DO-4736', 'CRR-26-27-1968', '2026-09-03 06:48:17.907'::timestamptz, 'WONDER WATER PROOFING WORKS', 'Kumar Ji',
    '9893342543', '431, NEAR TOLL PLAZA, KOSA NAGAR BHILAI, Durg, Chhattisgarh, 490023', '431, NEAR TOLL PLAZA, KOSA NAGAR BHILAI, Durg, Chhattisgarh, 490023', 'full on credit',
    30, 'KHUSHI KHEMANI', NULL, 'by hand-warehouse', 'Raipur',
    NULL, 'https://nfwtbrmqvsejwwvraanf.supabase.co/storage/v1/object/public/quotation_image/Quotation_CRR-26-27-1968.pdf', 'https://nfwtbrmqvsejwwvraanf.supabase.co/storage/v1/object/public/acceptance_file_upload/1788419511335-vot7vhi4w8.pdf', 'no',
    'No', 1.0, 34102.0, '22AQQPM8407P1Z6', 'GANGA'
  )
  ON CONFLICT (order_no) DO UPDATE SET
    company_name = EXCLUDED.company_name,
    total_order_qty = EXCLUDED.total_order_qty,
    amount = EXCLUDED.amount,
    updated_at = NOW()
  RETURNING id INTO v_order_id;
  DELETE FROM otp_order_items WHERE order_id = v_order_id;
  INSERT INTO otp_order_items (order_id, item_no, item_name, quantity) VALUES
    (v_order_id, 1, 'BOSCH-ROTARY HAMMER-GBH 4-32 DFR', 1.0);

  -- Order #3: DO-4735 (Fortune Resources & Properties LLP)
  INSERT INTO otp_orders (
    order_no, quotation_no, timestamp, company_name, contact_person_name,
    contact_number, billing_address, shipping_address, payment_mode,
    payment_terms_days, reference_name, email, transport_mode, destination,
    po_number, quotation_copy_url, acceptance_copy_url, offer_show,
    conveyed_for_registration, total_order_qty, amount, gst_no, cre_name
  ) VALUES (
    'DO-4735', 'CRR-26-27-1900-01', '2026-08-27 08:19:17.129'::timestamptz, 'Fortune Resources & Properties LLP', 'Yakesh Ji',
    '9907972033', 'Rama High Street Shop No.- G-26 & 27, Near MGM Eye Hospital Vidhan Sabha Road, Ama Seoni, Raipur, Raipur, Chhattisgarh, 492005', 'Rama High Street Shop No.- G-26 & 27, Near MGM Eye Hospital Vidhan Sabha Road, Ama Seoni, Raipur, Raipur, Chhattisgarh, 492005', 'full on credit',
    30, 'KHUSHI KHEMANI', NULL, 'by hand-warehouse', 'Raipur',
    'RWGPOIND/00943/26-27', 'https://nfwtbrmqvsejwwvraanf.supabase.co/storage/v1/object/public/quotation_image/Quotation_CRR-26-27-1900-01.pdf', 'https://nfwtbrmqvsejwwvraanf.supabase.co/storage/v1/object/public/acceptance_file_upload/1788415934762-8rw993v1jde.pdf', 'no',
    'No', 4.0, 4484.0, '22AAHFF3097R1ZW', 'NIKITA'
  )
  ON CONFLICT (order_no) DO UPDATE SET
    company_name = EXCLUDED.company_name,
    total_order_qty = EXCLUDED.total_order_qty,
    amount = EXCLUDED.amount,
    updated_at = NOW()
  RETURNING id INTO v_order_id;
  DELETE FROM otp_order_items WHERE order_id = v_order_id;
  INSERT INTO otp_order_items (order_id, item_no, item_name, quantity) VALUES
    (v_order_id, 1, 'FISCHER-CHEMICAL-FIS V PLUS 360 S-IN', 4.0);

  -- Order #4: DO-4734 (GUWAHATI INDUSTRIAL SALES & SERVICE)
  INSERT INTO otp_orders (
    order_no, quotation_no, timestamp, company_name, contact_person_name,
    contact_number, billing_address, shipping_address, payment_mode,
    payment_terms_days, reference_name, email, transport_mode, destination,
    po_number, quotation_copy_url, acceptance_copy_url, offer_show,
    conveyed_for_registration, total_order_qty, amount, gst_no, cre_name
  ) VALUES (
    'DO-4734', 'CRR-26-27-1931-01', '2026-08-31 10:36:01.607'::timestamptz, 'GUWAHATI INDUSTRIAL SALES & SERVICE', 'Mr. Dodiya Ji',
    '9435044597', 'GROUND FLOOR, SHOP NO. 1, COMMERCIAL BUILDING, A.T. ROAD, PALTAN BAZAR, Kamrup Metropolitan, Assam, 781001', 'GROUND FLOOR, SHOP NO. 1, COMMERCIAL BUILDING, A.T. ROAD, PALTAN BAZAR, Kamrup Metropolitan, Assam, 781001', 'fullyadvance',
    1, 'PRASANNA SIR', NULL, 'by hand-warehouse', 'Kamrup Metropolitan',
    NULL, 'https://nfwtbrmqvsejwwvraanf.supabase.co/storage/v1/object/public/quotation_image/Quotation_CRR-26-27-1931-01.pdf', 'https://nfwtbrmqvsejwwvraanf.supabase.co/storage/v1/object/public/acceptance_file_upload/1788413976796-dirtcdtro4.pdf', 'no',
    'No', 10.0, 5409.12, '18AGXPD9414A1ZC', 'GANGA'
  )
  ON CONFLICT (order_no) DO UPDATE SET
    company_name = EXCLUDED.company_name,
    total_order_qty = EXCLUDED.total_order_qty,
    amount = EXCLUDED.amount,
    updated_at = NOW()
  RETURNING id INTO v_order_id;
  DELETE FROM otp_order_items WHERE order_id = v_order_id;
  INSERT INTO otp_order_items (order_id, item_no, item_name, quantity) VALUES
    (v_order_id, 1, 'BEAM MOULD-700X150X150-MM', 10.0);

  -- Order #5: DO-4733 (Ashok Mill and Hardware Stores - 10061)
  INSERT INTO otp_orders (
    order_no, quotation_no, timestamp, company_name, contact_person_name,
    contact_number, billing_address, shipping_address, payment_mode,
    payment_terms_days, reference_name, email, transport_mode, destination,
    po_number, quotation_copy_url, acceptance_copy_url, offer_show,
    conveyed_for_registration, total_order_qty, amount, gst_no, cre_name
  ) VALUES (
    'DO-4733', 'CRR-26-27-1920', '2026-08-29 12:05:59.747'::timestamptz, 'Ashok Mill and Hardware Stores - 10061', 'Rajesh Ji',
    '9827150871', 'MAIN ROAD, 1, DAYALBAND, BILASPUR, Bilaspur, Chhattisgarh, 495001', 'MAIN ROAD, 1, DAYALBAND, BILASPUR, Bilaspur, Chhattisgarh, 495001', 'full on credit',
    3, 'CHAHAT PANDEY', NULL, 'by transport', 'Bilaspur',
    NULL, 'https://nfwtbrmqvsejwwvraanf.supabase.co/storage/v1/object/public/quotation_image/Quotation_CRR-26-27-1920.pdf', 'https://nfwtbrmqvsejwwvraanf.supabase.co/storage/v1/object/public/acceptance_file_upload/1788409498326-jrgx3ba1uyb.pdf', 'no',
    'No', 40.0, 42952.0, '22ABDPA4015D1ZR', 'GANGA'
  )
  ON CONFLICT (order_no) DO UPDATE SET
    company_name = EXCLUDED.company_name,
    total_order_qty = EXCLUDED.total_order_qty,
    amount = EXCLUDED.amount,
    updated_at = NOW()
  RETURNING id INTO v_order_id;
  DELETE FROM otp_order_items WHERE order_id = v_order_id;
  INSERT INTO otp_order_items (order_id, item_no, item_name, quantity) VALUES
    (v_order_id, 1, 'FISCHER-CHEMICAL-FIS V PLUS 360 S-IN', 40.0);

  -- Order #6: DO-4732 (JAIN FOODS)
  INSERT INTO otp_orders (
    order_no, quotation_no, timestamp, company_name, contact_person_name,
    contact_number, billing_address, shipping_address, payment_mode,
    payment_terms_days, reference_name, email, transport_mode, destination,
    po_number, quotation_copy_url, acceptance_copy_url, offer_show,
    conveyed_for_registration, total_order_qty, amount, gst_no, cre_name
  ) VALUES (
    'DO-4732', 'NBD-26-27-858', '2026-09-02 13:09:25.3'::timestamptz, 'JAIN FOODS', 'Mayan ji',
    '7389111719', 'B-103, NEW RISHABH ENCLAVE, NEW RAJENDRA NAGAR, AMLIDIH, Raipur, Raipur, Chhattisgarh, 492012', 'B-103, NEW RISHABH ENCLAVE, NEW RAJENDRA NAGAR, AMLIDIH, Raipur, Raipur, Chhattisgarh, 492012', 'fullyadvance',
    1, 'AMAY SWARNKAR', NULL, 'by hand maniquip store', 'raipur',
    NULL, 'https://nfwtbrmqvsejwwvraanf.supabase.co/storage/v1/object/public/quotation_image/Quotation_NBD-26-27-858.pdf', 'https://nfwtbrmqvsejwwvraanf.supabase.co/storage/v1/object/public/acceptance_file_upload/1788355211562-6safq2gcvcv.jpeg', 'no',
    'No', 1.0, 2500.42, '22CBGPB7001K2Z5', 'GANGA'
  )
  ON CONFLICT (order_no) DO UPDATE SET
    company_name = EXCLUDED.company_name,
    total_order_qty = EXCLUDED.total_order_qty,
    amount = EXCLUDED.amount,
    updated_at = NOW()
  RETURNING id INTO v_order_id;
  DELETE FROM otp_order_items WHERE order_id = v_order_id;
  INSERT INTO otp_order_items (order_id, item_no, item_name, quantity) VALUES
    (v_order_id, 1, 'BOSCH-HEAT GUN-GHG 180', 1.0);

  -- Order #7: DO-4731 (ASC INFRATECH PRIVATE LIMITED- UP)
  INSERT INTO otp_orders (
    order_no, quotation_no, timestamp, company_name, contact_person_name,
    contact_number, billing_address, shipping_address, payment_mode,
    payment_terms_days, reference_name, email, transport_mode, destination,
    po_number, quotation_copy_url, acceptance_copy_url, offer_show,
    conveyed_for_registration, total_order_qty, amount, gst_no, cre_name
  ) VALUES (
    'DO-4731', 'CRR-26-27-1962', '2026-09-02 12:38:27.655'::timestamptz, 'ASC INFRATECH PRIVATE LIMITED- UP', 'Love Ji',
    '8800023102', 'B-63, SECTOR-67, NOIDA, Gautambuddha Nagar, Uttar Pradesh, 201301', 'ASC INFRATECH PVT LTD Khata No.00207, Gata No.255 Baghouna Khurd, Ballia, Uttar Pradesh-277501 Mr. Vikash 6202661366', 'pi against advance',
    1, 'PRASANNA SIR', NULL, 'by transport', 'Ballia, Uttar Pradesh',
    'ASC/PO/VCH015/P241007A/539', 'https://nfwtbrmqvsejwwvraanf.supabase.co/storage/v1/object/public/quotation_image/Quotation_CRR-26-27-1962.pdf', 'https://nfwtbrmqvsejwwvraanf.supabase.co/storage/v1/object/public/acceptance_file_upload/1788354193193-mtojidsgux.pdf', 'yes',
    'No', 5.0, 590000.0, '09AAICA3327R1Z5', 'GEETA'
  )
  ON CONFLICT (order_no) DO UPDATE SET
    company_name = EXCLUDED.company_name,
    total_order_qty = EXCLUDED.total_order_qty,
    amount = EXCLUDED.amount,
    updated_at = NOW()
  RETURNING id INTO v_order_id;
  DELETE FROM otp_order_items WHERE order_id = v_order_id;
  INSERT INTO otp_order_items (order_id, item_no, item_name, quantity) VALUES
    (v_order_id, 1, 'WACKER-EXTERNAL VIBRATOR- AR 52/6/042', 4.0),
    (v_order_id, 2, 'WACKER - FUE-M/S 85A-FRP-SC FREQUENCY CONVERTER', 1.0);

  -- Order #8: DO-4730 (AQUAPLAST INFRAPROJECTS PRIVATE LIMITED)
  INSERT INTO otp_orders (
    order_no, quotation_no, timestamp, company_name, contact_person_name,
    contact_number, billing_address, shipping_address, payment_mode,
    payment_terms_days, reference_name, email, transport_mode, destination,
    po_number, quotation_copy_url, acceptance_copy_url, offer_show,
    conveyed_for_registration, total_order_qty, amount, gst_no, cre_name
  ) VALUES (
    'DO-4730', 'CRR-26-27-1936-01', '2026-08-31 12:10:11.147'::timestamptz, 'AQUAPLAST INFRAPROJECTS PRIVATE LIMITED', 'Ravindra Ji',
    '7828901011', 'Office Nos. 613-616, Magneto Mall, Waard No 28, Maharishi Valmiki Ward, N. H. 6, Magneto Mall Labhandi, Labhandi, Raipur, Raipur, Chhattisgarh, 492001', 'Somesh Vihar Baloda Bazar Chhattisgarh 493332', 'full on credit',
    1, 'GEETA BHIWAGADE', NULL, 'by transport', 'BALODABAZAR',
    'CRR-26-27-1936-01', 'https://nfwtbrmqvsejwwvraanf.supabase.co/storage/v1/object/public/quotation_image/Quotation_CRR-26-27-1936-01.pdf', 'https://nfwtbrmqvsejwwvraanf.supabase.co/storage/v1/object/public/acceptance_file_upload/1788353644901-7cevvpl3663.pdf', 'no',
    'No', 1.0, 2832.0, '22AAZCA9891R1ZB', 'GEETA'
  )
  ON CONFLICT (order_no) DO UPDATE SET
    company_name = EXCLUDED.company_name,
    total_order_qty = EXCLUDED.total_order_qty,
    amount = EXCLUDED.amount,
    updated_at = NOW()
  RETURNING id INTO v_order_id;
  DELETE FROM otp_order_items WHERE order_id = v_order_id;
  INSERT INTO otp_order_items (order_id, item_no, item_name, quantity) VALUES
    (v_order_id, 1, 'GTI-TRIPOD-ALLUMINIUM', 1.0);

  -- Order #9: DO-4729 (SPD CONSTRUCTIONS LIMITED-OD)
  INSERT INTO otp_orders (
    order_no, quotation_no, timestamp, company_name, contact_person_name,
    contact_number, billing_address, shipping_address, payment_mode,
    payment_terms_days, reference_name, email, transport_mode, destination,
    po_number, quotation_copy_url, acceptance_copy_url, offer_show,
    conveyed_for_registration, total_order_qty, amount, gst_no, cre_name
  ) VALUES (
    'DO-4729', 'CRR-26-27-1888-01', '2026-08-26 07:33:23.646'::timestamptz, 'SPD CONSTRUCTIONS LIMITED-OD', 'JYOTI RANJAN JI',
    '7488832080', '5th Floor, Unit - 516, Royal Arcade,, Nandankanan Rd, Raghunathpur, Bhubaneswar, Khordha, Odisha, 751024', 'Bhubaneswar Odisha - 751001', 'pi against advance',
    1, 'RANJAN KUMAR PRUSTY', NULL, 'by transport', 'ODISHA',
    'SPDCL/S221/PO/2026/0042', 'https://nfwtbrmqvsejwwvraanf.supabase.co/storage/v1/object/public/quotation_image/Quotation_CRR-26-27-1888-01.pdf', 'https://nfwtbrmqvsejwwvraanf.supabase.co/storage/v1/object/public/acceptance_file_upload/1788351556614-0frymazpki4t.pdf', 'yes',
    'No', 3.0, 414180.0, '21AAOCS5321F1ZM', 'PRIYA'
  )
  ON CONFLICT (order_no) DO UPDATE SET
    company_name = EXCLUDED.company_name,
    total_order_qty = EXCLUDED.total_order_qty,
    amount = EXCLUDED.amount,
    updated_at = NOW()
  RETURNING id INTO v_order_id;
  DELETE FROM otp_order_items WHERE order_id = v_order_id;
  INSERT INTO otp_order_items (order_id, item_no, item_name, quantity) VALUES
    (v_order_id, 1, 'WACKER-INTERNAL VIBRATOR-IRFU 58-5MTR', 3.0);

  -- Order #10: DO-4728 (AA CREATIONS)
  INSERT INTO otp_orders (
    order_no, quotation_no, timestamp, company_name, contact_person_name,
    contact_number, billing_address, shipping_address, payment_mode,
    payment_terms_days, reference_name, email, transport_mode, destination,
    po_number, quotation_copy_url, acceptance_copy_url, offer_show,
    conveyed_for_registration, total_order_qty, amount, gst_no, cre_name
  ) VALUES (
    'DO-4728', 'NBD-26-27-856', '2026-09-02 12:04:19.411'::timestamptz, 'AA CREATIONS', 'ANKIT JI',
    '9424154550', '10, Mandir Path, Choubey Colony, Raipur, Raipur, Chhattisgarh, 492001', '10, Mandir Path, Choubey Colony, Raipur, Raipur, Chhattisgarh, 492001', 'fullyadvance',
    1, 'AMAY SWARNKAR', NULL, 'by hand maniquip store', 'raipur',
    NULL, 'https://nfwtbrmqvsejwwvraanf.supabase.co/storage/v1/object/public/quotation_image/Quotation_NBD-26-27-856.pdf', 'https://nfwtbrmqvsejwwvraanf.supabase.co/storage/v1/object/public/acceptance_file_upload/1788351173636-8qkpnav4av.jpeg', 'no',
    'No', 3.0, 3875.12, '22ACDFA3998E1ZI', 'GANGA'
  )
  ON CONFLICT (order_no) DO UPDATE SET
    company_name = EXCLUDED.company_name,
    total_order_qty = EXCLUDED.total_order_qty,
    amount = EXCLUDED.amount,
    updated_at = NOW()
  RETURNING id INTO v_order_id;
  DELETE FROM otp_order_items WHERE order_id = v_order_id;
  INSERT INTO otp_order_items (order_id, item_no, item_name, quantity) VALUES
    (v_order_id, 1, 'FISCHER-CHEMICAL-FIS V PLUS 360 S-IN', 2.0),
    (v_order_id, 2, 'GUN 360ML HEAVY DUTY FISCHER TYPE', 1.0);

  -- Order #11: DO-4727 (STARKEY INFRATECH PRIVATE LIMITED)
  INSERT INTO otp_orders (
    order_no, quotation_no, timestamp, company_name, contact_person_name,
    contact_number, billing_address, shipping_address, payment_mode,
    payment_terms_days, reference_name, email, transport_mode, destination,
    po_number, quotation_copy_url, acceptance_copy_url, offer_show,
    conveyed_for_registration, total_order_qty, amount, gst_no, cre_name
  ) VALUES (
    'DO-4727', 'NBD_CRR-26-27-605-01', '2026-09-02 07:06:41.02'::timestamptz, 'STARKEY INFRATECH PRIVATE LIMITED', 'BHOLE KAUSHIK JI',
    '7906461234', 'WARD NO 10, WADRAFNAGAR, WADRAFNAGAR, Rajkheta, Balrampur Ramanujganj, Chhattisgarh, 497225', 'Nabarangpur, Odisha - 764059', 'fullyadvance',
    1, 'AMAY SWARNKAR', NULL, 'by hand-warehouse', 'Nabarangpur',
    NULL, 'https://nfwtbrmqvsejwwvraanf.supabase.co/storage/v1/object/public/quotation_image/Quotation_NBD_CRR-26-27-605-01.pdf', 'https://nfwtbrmqvsejwwvraanf.supabase.co/storage/v1/object/public/acceptance_file_upload/1788345537526-v92pzhs4h6d.pdf', 'no',
    'No', 2.0, 46775.2, '22AATCS6216L1ZY', 'GANGA'
  )
  ON CONFLICT (order_no) DO UPDATE SET
    company_name = EXCLUDED.company_name,
    total_order_qty = EXCLUDED.total_order_qty,
    amount = EXCLUDED.amount,
    updated_at = NOW()
  RETURNING id INTO v_order_id;
  DELETE FROM otp_order_items WHERE order_id = v_order_id;
  INSERT INTO otp_order_items (order_id, item_no, item_name, quantity) VALUES
    (v_order_id, 1, 'SOKKIA-AUTOMATIC LEVEL-B40A-D5', 1.0),
    (v_order_id, 2, 'PACKAGING AND FORWARDING', 1.0);

  -- Order #12: DO-4726 (MOSH VARAYA INFRASTRUCTURE LIMITED RAIPUR - 10409)
  INSERT INTO otp_orders (
    order_no, quotation_no, timestamp, company_name, contact_person_name,
    contact_number, billing_address, shipping_address, payment_mode,
    payment_terms_days, reference_name, email, transport_mode, destination,
    po_number, quotation_copy_url, acceptance_copy_url, offer_show,
    conveyed_for_registration, total_order_qty, amount, gst_no, cre_name
  ) VALUES (
    'DO-4726', 'CRR-26-27-1948-01', '2026-09-01 11:20:03.009'::timestamptz, 'MOSH VARAYA INFRASTRUCTURE LIMITED RAIPUR - 10409', 'Ujjwal Ji',
    '9721229855', 'Block I-002, commercial unit Part E, Phase I, Shriram Business Park, Ward No 26, OPP. MGM EYE HOSPITAL, Amaseoni, Raipur, Raipur, Chhattisgarh, 492014', 'Nagarnar, Bastar, Chhattisgarh - 494001', 'full on credit',
    30, 'GEETA BHIWAGADE', NULL, 'by hand-warehouse', 'JAGDALPUR',
    'MVIL/NRS-12/SEP/2026', 'https://nfwtbrmqvsejwwvraanf.supabase.co/storage/v1/object/public/quotation_image/Quotation_CRR-26-27-1948-01.pdf', 'https://nfwtbrmqvsejwwvraanf.supabase.co/storage/v1/object/public/acceptance_file_upload/1788345468703-arwxnl2dioh.pdf', 'no',
    'No', 11.0, 6521.74, '22AACCC5192J1ZQ', 'PRIYA'
  )
  ON CONFLICT (order_no) DO UPDATE SET
    company_name = EXCLUDED.company_name,
    total_order_qty = EXCLUDED.total_order_qty,
    amount = EXCLUDED.amount,
    updated_at = NOW()
  RETURNING id INTO v_order_id;
  DELETE FROM otp_order_items WHERE order_id = v_order_id;
  INSERT INTO otp_order_items (order_id, item_no, item_name, quantity) VALUES
    (v_order_id, 1, 'TEST SIEVES-BRASS-200MM DIA-212MICRON', 1.0),
    (v_order_id, 2, 'TEST SIEVES-BRASS-200MM DIA-1MM', 1.0),
    (v_order_id, 3, 'TEST SIEVES-GI-450 DIA-26.5MM', 1.0),
    (v_order_id, 4, 'TEST SIEVES-GI-450 DIA-25MM', 1.0),
    (v_order_id, 5, 'TEST SIEVES-GI-450 DIA-19MM', 1.0),
    (v_order_id, 6, 'TEST SIEVES-GI-450 DIA-16MM', 1.0),
    (v_order_id, 7, 'TEST SIEVE-GI-450 DIA-12.5MM', 1.0),
    (v_order_id, 8, 'TEST SIEVES-GI-450 DIA-10MM', 1.0),
    (v_order_id, 9, 'TEST SIEVES-GI-450 DIA-4.75MM', 1.0),
    (v_order_id, 10, 'TEST SIEVES-GI-450 DIA-2.36MM', 1.0);

  -- Order #13: DO-4725 (ABHINAV TRADERS)
  INSERT INTO otp_orders (
    order_no, quotation_no, timestamp, company_name, contact_person_name,
    contact_number, billing_address, shipping_address, payment_mode,
    payment_terms_days, reference_name, email, transport_mode, destination,
    po_number, quotation_copy_url, acceptance_copy_url, offer_show,
    conveyed_for_registration, total_order_qty, amount, gst_no, cre_name
  ) VALUES (
    'DO-4725', 'NBD-26-27-855', '2026-09-02 08:25:52.305'::timestamptz, 'ABHINAV TRADERS', 'SHIVAM TIWARI JI',
    '8770641655', 'Ward No. 06, Near Bus Stand, GMS Padariya Narayanganj, Padariya Alias Narayanganj, Mandla, Madhya Pradesh, 481662', 'Ward No. 06, Near Bus Stand, GMS Padariya Narayanganj, Padariya Alias Narayanganj, Mandla, Madhya Pradesh, 481662', 'fullyadvance',
    1, 'AMAY SWARNKAR', NULL, 'by hand maniquip store', 'raipur',
    NULL, 'https://nfwtbrmqvsejwwvraanf.supabase.co/storage/v1/object/public/quotation_image/Quotation_NBD-26-27-855.pdf', 'https://nfwtbrmqvsejwwvraanf.supabase.co/storage/v1/object/public/acceptance_file_upload/1788338721915-2n5978pbxpd.jpeg', 'no',
    'No', 1.0, 4172.48, '23AUSPT1288K3ZU', 'GANGA'
  )
  ON CONFLICT (order_no) DO UPDATE SET
    company_name = EXCLUDED.company_name,
    total_order_qty = EXCLUDED.total_order_qty,
    amount = EXCLUDED.amount,
    updated_at = NOW()
  RETURNING id INTO v_order_id;
  DELETE FROM otp_order_items WHERE order_id = v_order_id;
  INSERT INTO otp_order_items (order_id, item_no, item_name, quantity) VALUES
    (v_order_id, 1, 'BOSCH-LASER MEASURING GLM 40-12', 1.0);

  -- Order #14: DO-4724 (M/S NIDHI SHREE ENTERPRISES)
  INSERT INTO otp_orders (
    order_no, quotation_no, timestamp, company_name, contact_person_name,
    contact_number, billing_address, shipping_address, payment_mode,
    payment_terms_days, reference_name, email, transport_mode, destination,
    po_number, quotation_copy_url, acceptance_copy_url, offer_show,
    conveyed_for_registration, total_order_qty, amount, gst_no, cre_name
  ) VALUES (
    'DO-4724', 'CRR-26-27-1877-06', '2026-08-25 10:28:06.614'::timestamptz, 'M/S NIDHI SHREE ENTERPRISES', 'Ankur Ji',
    '7781944521', 'BILLING ADDRESS- SECOND FLOOR, 2-B, GANPATI APARTMENTS, NH 2, Maithon, Dhanbad, Jharkhand, 828207', 'Koderma junction (jhumri tilaiya) :- Damodar Valley corporation (Koderma thermal power station):- KTPS-   opposite Punjab National Bank patna - Ranchi road jhumri tilaiya koderma Jharkhand (825409)', 'fullyadvance',
    1, 'NIKITA ROUT', NULL, 'by transport', 'koderma',
    NULL, 'https://nfwtbrmqvsejwwvraanf.supabase.co/storage/v1/object/public/quotation_image/Quotation_CRR-26-27-1877-06.pdf', 'https://nfwtbrmqvsejwwvraanf.supabase.co/storage/v1/object/public/acceptance_file_upload/1788337444957-9uvp1erzkbd.pdf', 'no',
    'No', 67.0, 116673.0, '20BAIPS9946N1ZY', 'NIKITA'
  )
  ON CONFLICT (order_no) DO UPDATE SET
    company_name = EXCLUDED.company_name,
    total_order_qty = EXCLUDED.total_order_qty,
    amount = EXCLUDED.amount,
    updated_at = NOW()
  RETURNING id INTO v_order_id;
  DELETE FROM otp_order_items WHERE order_id = v_order_id;
  INSERT INTO otp_order_items (order_id, item_no, item_name, quantity) VALUES
    (v_order_id, 1, 'CUBE MOULD-150X150X150MM', 18.0),
    (v_order_id, 2, 'SLUMP CONE WITH TEMPING ROD', 2.0),
    (v_order_id, 3, 'CUBE MOULD-70.6 X 70.6 X 70.6MM', 9.0),
    (v_order_id, 4, 'MORTAR CUBE VIBRATOR-HIGH FREQUENCY', 1.0),
    (v_order_id, 5, 'ELONGATION GAUGE', 1.0),
    (v_order_id, 6, 'FLANKINESS GAUGE', 1.0),
    (v_order_id, 7, 'VICAT NEEDLE APPARTUS', 1.0),
    (v_order_id, 8, 'HOT PLATE', 1.0),
    (v_order_id, 9, 'OVEN-THERMOSTATICALLY CONTROLLED-18"X18"', 1.0),
    (v_order_id, 10, 'RAPID MOISTURE METER-50%', 1.0);

  -- Order #15: DO-4723 (SYSTEMATIC INDUSTRIES LIMITED)
  INSERT INTO otp_orders (
    order_no, quotation_no, timestamp, company_name, contact_person_name,
    contact_number, billing_address, shipping_address, payment_mode,
    payment_terms_days, reference_name, email, transport_mode, destination,
    po_number, quotation_copy_url, acceptance_copy_url, offer_show,
    conveyed_for_registration, total_order_qty, amount, gst_no, cre_name
  ) VALUES (
    'DO-4723', 'NBD-26-27-809-03', '2026-08-22 10:32:41.159'::timestamptz, 'SYSTEMATIC INDUSTRIES LIMITED', 'Vivek Jain Ji',
    '9250211966', 'P.H No.21, Systematic Industries Limited, Siltara Phase-I, Block Dharsiwa, Raipur, Raipur, Chhattisgarh, 493111', 'P.H No.21, Systematic Industries Limited, Siltara Phase-I, Block Dharsiwa, Raipur, Raipur, Chhattisgarh, 493111', 'fullyadvance',
    1, 'AMAY SWARNKAR', NULL, 'by hand-warehouse', 'DHARSIWA,RAIPUR',
    'SLTR/PRJ/27/PO0015', 'https://nfwtbrmqvsejwwvraanf.supabase.co/storage/v1/object/public/quotation_image/Quotation_NBD-26-27-809-03.pdf', 'https://nfwtbrmqvsejwwvraanf.supabase.co/storage/v1/object/public/acceptance_file_upload/1788336241950-y9aysp5446.pdf', 'no',
    'No', 52.0, 89945.5, '22AAHCS2314K1ZL', 'GANGA'
  )
  ON CONFLICT (order_no) DO UPDATE SET
    company_name = EXCLUDED.company_name,
    total_order_qty = EXCLUDED.total_order_qty,
    amount = EXCLUDED.amount,
    updated_at = NOW()
  RETURNING id INTO v_order_id;
  DELETE FROM otp_order_items WHERE order_id = v_order_id;
  INSERT INTO otp_order_items (order_id, item_no, item_name, quantity) VALUES
    (v_order_id, 1, 'FISCHER-CHEMICAL-FIS V PLUS 360 S-IN', 50.0),
    (v_order_id, 2, 'FISCHER-GUN-FIS AM DISPENSER-360ML', 1.0),
    (v_order_id, 3, 'BOSCH-ROTARY HAMMER-GBH 4-32 DFR', 1.0);

  -- Order #16: DO-4722 (SUDHAMA NUT BOLT HOUSE)
  INSERT INTO otp_orders (
    order_no, quotation_no, timestamp, company_name, contact_person_name,
    contact_number, billing_address, shipping_address, payment_mode,
    payment_terms_days, reference_name, email, transport_mode, destination,
    po_number, quotation_copy_url, acceptance_copy_url, offer_show,
    conveyed_for_registration, total_order_qty, amount, gst_no, cre_name
  ) VALUES (
    'DO-4722', 'CRR-26-27-1954', '2026-09-02 07:43:50.522'::timestamptz, 'SUDHAMA NUT BOLT HOUSE', 'Krishna Ji',
    '8770646918', '0, 5, NEW BOMBAY MARKET, G.E.ROAD, RAIPUR, Raipur, Chhattisgarh, 492001', '0, 5, NEW BOMBAY MARKET, G.E.ROAD, RAIPUR, Raipur, Chhattisgarh, 492001', 'full on credit',
    30, 'GANGA DHRITLAHARE', NULL, 'by hand maniquip store', 'Raipur',
    NULL, 'https://nfwtbrmqvsejwwvraanf.supabase.co/storage/v1/object/public/quotation_image/Quotation_CRR-26-27-1954.pdf', 'https://nfwtbrmqvsejwwvraanf.supabase.co/storage/v1/object/public/acceptance_file_upload/1788335620174-fa4s2tw7f1.pdf', 'no',
    'No', 2.0, 6844.0, '22AEYPK1466L1Z0', 'GANGA'
  )
  ON CONFLICT (order_no) DO UPDATE SET
    company_name = EXCLUDED.company_name,
    total_order_qty = EXCLUDED.total_order_qty,
    amount = EXCLUDED.amount,
    updated_at = NOW()
  RETURNING id INTO v_order_id;
  DELETE FROM otp_order_items WHERE order_id = v_order_id;
  INSERT INTO otp_order_items (order_id, item_no, item_name, quantity) VALUES
    (v_order_id, 1, 'FISCHER-CHEMICAL-INJECTION MORTAR FIS EM PLUS 585 S', 2.0);

  -- Order #17: DO-4721 (SUDHAMA NUT BOLT HOUSE)
  INSERT INTO otp_orders (
    order_no, quotation_no, timestamp, company_name, contact_person_name,
    contact_number, billing_address, shipping_address, payment_mode,
    payment_terms_days, reference_name, email, transport_mode, destination,
    po_number, quotation_copy_url, acceptance_copy_url, offer_show,
    conveyed_for_registration, total_order_qty, amount, gst_no, cre_name
  ) VALUES (
    'DO-4721', 'CRR-26-27-1953', '2026-09-02 07:38:12.172'::timestamptz, 'SUDHAMA NUT BOLT HOUSE', 'Krishna Ji',
    '8770646918', '0, 5, NEW BOMBAY MARKET, G.E.ROAD, RAIPUR, Raipur, Chhattisgarh, 492001', '0, 5, NEW BOMBAY MARKET, G.E.ROAD, RAIPUR, Raipur, Chhattisgarh, 492001', 'full on credit',
    30, 'KHUSHI KHEMANI', NULL, 'by hand-warehouse', 'Raipur',
    NULL, 'https://nfwtbrmqvsejwwvraanf.supabase.co/storage/v1/object/public/quotation_image/Quotation_CRR-26-27-1953.pdf', 'https://nfwtbrmqvsejwwvraanf.supabase.co/storage/v1/object/public/acceptance_file_upload/1788334956599-3qd5ful9r4l.pdf', 'no',
    'No', 5000.0, 37760.0, '22AEYPK1466L1Z0', 'GANGA'
  )
  ON CONFLICT (order_no) DO UPDATE SET
    company_name = EXCLUDED.company_name,
    total_order_qty = EXCLUDED.total_order_qty,
    amount = EXCLUDED.amount,
    updated_at = NOW()
  RETURNING id INTO v_order_id;
  DELETE FROM otp_order_items WHERE order_id = v_order_id;
  INSERT INTO otp_order_items (order_id, item_no, item_name, quantity) VALUES
    (v_order_id, 1, 'FISCHER-ANCHOR-EA M8 N ZP-DROP-IN-ANCHOR', 5000.0);

  -- Order #18: DO-4720 (RATNA ENGINEERING AND RCC WORKS - 10933)
  INSERT INTO otp_orders (
    order_no, quotation_no, timestamp, company_name, contact_person_name,
    contact_number, billing_address, shipping_address, payment_mode,
    payment_terms_days, reference_name, email, transport_mode, destination,
    po_number, quotation_copy_url, acceptance_copy_url, offer_show,
    conveyed_for_registration, total_order_qty, amount, gst_no, cre_name
  ) VALUES (
    'DO-4720', 'CRR-26-27-1949', '2026-09-01 12:21:18.479'::timestamptz, 'RATNA ENGINEERING AND RCC WORKS - 10933', 'Mr. Abhishek Ji',
    '9669796000', 'SHOP NO 19, PRAKASH BHAWN, INFRONT OF KANKALI TALAB, KANKALI PARA, RAIPUR, Raipur, Chhattisgarh, 492001', 'SHOP NO 19, PRAKASH BHAWN, INFRONT OF KANKALI TALAB, KANKALI PARA, RAIPUR, Raipur, Chhattisgarh, 492001', 'full on credit',
    7, 'SARITA BAGHEL', NULL, 'by hand-warehouse', 'Raipur',
    NULL, 'https://nfwtbrmqvsejwwvraanf.supabase.co/storage/v1/object/public/quotation_image/Quotation_CRR-26-27-1949.pdf', 'https://nfwtbrmqvsejwwvraanf.supabase.co/storage/v1/object/public/acceptance_file_upload/1788267428881-hp7s7tmekt4.pdf', 'no',
    'No', 20.0, 8260.0, '22CAFPS2872B1ZY', 'GANGA'
  )
  ON CONFLICT (order_no) DO UPDATE SET
    company_name = EXCLUDED.company_name,
    total_order_qty = EXCLUDED.total_order_qty,
    amount = EXCLUDED.amount,
    updated_at = NOW()
  RETURNING id INTO v_order_id;
  DELETE FROM otp_order_items WHERE order_id = v_order_id;
  INSERT INTO otp_order_items (order_id, item_no, item_name, quantity) VALUES
    (v_order_id, 1, 'FISCHER- G M12X1000 8.8 ZP THREADED ROD', 20.0);

  -- Order #19: DO-4719 (MOSH VARAYA INFRASTRUCTURE LIMITED RAIPUR - 10409)
  INSERT INTO otp_orders (
    order_no, quotation_no, timestamp, company_name, contact_person_name,
    contact_number, billing_address, shipping_address, payment_mode,
    payment_terms_days, reference_name, email, transport_mode, destination,
    po_number, quotation_copy_url, acceptance_copy_url, offer_show,
    conveyed_for_registration, total_order_qty, amount, gst_no, cre_name
  ) VALUES (
    'DO-4719', 'CRR-26-27-1907-05', '2026-08-29 05:48:56.147'::timestamptz, 'MOSH VARAYA INFRASTRUCTURE LIMITED RAIPUR - 10409', 'Ujjaval Pandey Ji',
    '9721229855', 'Block I-002, commercial unit Part E, Phase I, Shriram Business Park, Ward No 26, OPP. MGM EYE HOSPITAL, Amaseoni, Raipur, Raipur, Chhattisgarh, 492014', 'Block I-002, commercial unit Part E, Phase I, Shriram Business Park, Ward No 26, OPP. MGM EYE HOSPITAL, Amaseoni, Raipur, Raipur, Chhattisgarh, 492014', 'full on credit',
    15, 'PRIYA SWARNKAR', NULL, 'by hand-warehouse', 'CHHATTISGARH',
    'MVIL/NRS-11/SEP/2026', 'https://nfwtbrmqvsejwwvraanf.supabase.co/storage/v1/object/public/quotation_image/Quotation_CRR-26-27-1907-05.pdf', 'https://nfwtbrmqvsejwwvraanf.supabase.co/storage/v1/object/public/acceptance_file_upload/1788267013721-kbtindj8tl7.pdf', 'no',
    'No', 41.0, 208669.49, '22AACCC5192J1ZQ', 'PRIYA'
  )
  ON CONFLICT (order_no) DO UPDATE SET
    company_name = EXCLUDED.company_name,
    total_order_qty = EXCLUDED.total_order_qty,
    amount = EXCLUDED.amount,
    updated_at = NOW()
  RETURNING id INTO v_order_id;
  DELETE FROM otp_order_items WHERE order_id = v_order_id;
  INSERT INTO otp_order_items (order_id, item_no, item_name, quantity) VALUES
    (v_order_id, 1, 'WEIGHT BALANCE-ELECTRONIC-6KG', 1.0),
    (v_order_id, 2, 'OVEN- THERMOSTATICALLY CONTROLLED-24"X24"', 1.0),
    (v_order_id, 3, 'HOT PLATE', 1.0),
    (v_order_id, 4, 'STOP WATCH RACER', 1.0),
    (v_order_id, 5, 'ManiQuip-CHANNEL TYPE COMPRESSION TESTING MACHINE DIGITAL DISPLAY-2000kN', 1.0),
    (v_order_id, 6, 'THERMOMETER-DIGITAL WIRE TYPE-50-300DEGREE', 1.0),
    (v_order_id, 7, 'SLUMP CONE WITH TEMPING ROD', 2.0),
    (v_order_id, 8, 'GLASS-MEASURING CYLINDER-500ML', 1.0),
    (v_order_id, 9, 'GLASS-MEASURING CYLINDER-250ML', 1.0),
    (v_order_id, 10, 'GLASS-MEASURING CYLINDER-100ML', 1.0);

  -- Order #20: DO-4718 (CHEVROX CONSTRUCTIONS PRIVATE LIMITED- OD)
  INSERT INTO otp_orders (
    order_no, quotation_no, timestamp, company_name, contact_person_name,
    contact_number, billing_address, shipping_address, payment_mode,
    payment_terms_days, reference_name, email, transport_mode, destination,
    po_number, quotation_copy_url, acceptance_copy_url, offer_show,
    conveyed_for_registration, total_order_qty, amount, gst_no, cre_name
  ) VALUES (
    'DO-4718', 'CRR-26-27-1933-02', '2026-08-31 10:46:15.221'::timestamptz, 'CHEVROX CONSTRUCTIONS PRIVATE LIMITED- OD', 'Tripati Narayan Ji',
    '9939052323', 'C/56, Palaspalli Colony Road, Heifer International Odisha Office, Palashpalli, Bhubaneswar, Khordha, Odisha, 751020', 'CHEVROX CONSTRUCTIONS PVT. LTD.
C/F IRON TRIANGLE LTD BASE
CAMP,TEMPLE WORK
JORANADA,POST-JORANDA
MAHIMAGADI,DISTRICT DHENKANAL
-Odisha-759014
INDIA
PO No : ODIPO26/501058', 'full on credit',
    15, 'GEETA BHIWAGADE', NULL, 'by transport', 'DHENKANAL',
    'ODIPO26/501058', 'https://nfwtbrmqvsejwwvraanf.supabase.co/storage/v1/object/public/quotation_image/Quotation_CRR-26-27-1933-02.pdf', 'https://nfwtbrmqvsejwwvraanf.supabase.co/storage/v1/object/public/acceptance_file_upload/1788266954586-76wmr6dlzz.pdf', 'no',
    'No', 10.0, 61690.0, '21AAGCM7457A1ZT', 'GEETA'
  )
  ON CONFLICT (order_no) DO UPDATE SET
    company_name = EXCLUDED.company_name,
    total_order_qty = EXCLUDED.total_order_qty,
    amount = EXCLUDED.amount,
    updated_at = NOW()
  RETURNING id INTO v_order_id;
  DELETE FROM otp_order_items WHERE order_id = v_order_id;
  INSERT INTO otp_order_items (order_id, item_no, item_name, quantity) VALUES
    (v_order_id, 1, 'ManiQuip Needle 6Mtr Long 40MM', 6.0),
    (v_order_id, 2, 'ManiQuip Needle 6Mtr Long 60MM', 3.0),
    (v_order_id, 3, 'PACKAGING AND FORWARDING', 1.0);

  -- Order #21: DO-4717 (SHALU GAIKWAD)
  INSERT INTO otp_orders (
    order_no, quotation_no, timestamp, company_name, contact_person_name,
    contact_number, billing_address, shipping_address, payment_mode,
    payment_terms_days, reference_name, email, transport_mode, destination,
    po_number, quotation_copy_url, acceptance_copy_url, offer_show,
    conveyed_for_registration, total_order_qty, amount, gst_no, cre_name
  ) VALUES (
    'DO-4717', 'NBD-26-27-852', '2026-09-01 10:58:42.658'::timestamptz, 'SHALU GAIKWAD', 'SHALU GAIKWAD JI',
    '6260168622', 'Raipur Chhattisgarh - 492001', 'Raipur Chhattisgarh - 492001', 'fullyadvance',
    1, 'AMAY SWARNKAR', NULL, 'by hand maniquip store', 'raipur',
    NULL, 'https://nfwtbrmqvsejwwvraanf.supabase.co/storage/v1/object/public/quotation_image/Quotation_NBD-26-27-852.pdf', 'https://nfwtbrmqvsejwwvraanf.supabase.co/storage/v1/object/public/acceptance_file_upload/1788261985940-fhsx1ux1rsn.jpeg', 'no',
    'No', 2.0, 2675.06, NULL, 'GANGA'
  )
  ON CONFLICT (order_no) DO UPDATE SET
    company_name = EXCLUDED.company_name,
    total_order_qty = EXCLUDED.total_order_qty,
    amount = EXCLUDED.amount,
    updated_at = NOW()
  RETURNING id INTO v_order_id;
  DELETE FROM otp_order_items WHERE order_id = v_order_id;
  INSERT INTO otp_order_items (order_id, item_no, item_name, quantity) VALUES
    (v_order_id, 1, 'FISCHER-CHEMICAL-FIS V PLUS 360 S-IN', 1.0),
    (v_order_id, 2, 'GUN 360ML HEAVY DUTY FISCHER TYPE', 1.0);

  -- Order #22: DO-4716 (East India Udyog Ltd)
  INSERT INTO otp_orders (
    order_no, quotation_no, timestamp, company_name, contact_person_name,
    contact_number, billing_address, shipping_address, payment_mode,
    payment_terms_days, reference_name, email, transport_mode, destination,
    po_number, quotation_copy_url, acceptance_copy_url, offer_show,
    conveyed_for_registration, total_order_qty, amount, gst_no, cre_name
  ) VALUES (
    'DO-4716', 'CRR-26-27-1620-04', '2026-08-04 00:45:52.189'::timestamptz, 'East India Udyog Ltd', 'Prafulla Ji',
    '8249210370', '1, Anandpur, Keonjhar, Kendujhar, Odisha, 758021', 'Bhubaneswar Odisha - 751001', 'fullyadvance',
    1, 'RANJAN KUMAR PRUSTY', NULL, 'by transport', 'BHUBANESWAR',
    '9020100038', 'https://nfwtbrmqvsejwwvraanf.supabase.co/storage/v1/object/public/quotation_image/Quotation_CRR-26-27-1620-04.pdf', 'https://nfwtbrmqvsejwwvraanf.supabase.co/storage/v1/object/public/acceptance_file_upload/1788259835386-74yrmsuqonl.PDF', 'no',
    'No', 3.0, 217120.0, '21AAACE6839Q1ZA', 'NIKITA'
  )
  ON CONFLICT (order_no) DO UPDATE SET
    company_name = EXCLUDED.company_name,
    total_order_qty = EXCLUDED.total_order_qty,
    amount = EXCLUDED.amount,
    updated_at = NOW()
  RETURNING id INTO v_order_id;
  DELETE FROM otp_order_items WHERE order_id = v_order_id;
  INSERT INTO otp_order_items (order_id, item_no, item_name, quantity) VALUES
    (v_order_id, 1, 'ManiQuip DOUBLE DRUM WALK BEHIND ROLLER - MQR 2500 UT', 1.0),
    (v_order_id, 2, 'HYDRAULIC OIL 68no', 1.0),
    (v_order_id, 3, 'PACKAGING AND FORWARDING', 1.0);

  -- Order #23: DO-4715 (PUNJAB IRON STORES)
  INSERT INTO otp_orders (
    order_no, quotation_no, timestamp, company_name, contact_person_name,
    contact_number, billing_address, shipping_address, payment_mode,
    payment_terms_days, reference_name, email, transport_mode, destination,
    po_number, quotation_copy_url, acceptance_copy_url, offer_show,
    conveyed_for_registration, total_order_qty, amount, gst_no, cre_name
  ) VALUES (
    'DO-4715', 'CRR-26-27-1924-01', '2026-08-31 05:00:08.081'::timestamptz, 'PUNJAB IRON STORES', 'Mr. Ritesh Ji',
    '9179180443', 'GOL BAZAR, BILASPUR, BILASPUR, Bilaspur, Chhattisgarh, 495001', 'GOL BAZAR, BILASPUR, BILASPUR, Bilaspur, Chhattisgarh, 495001', 'full on credit',
    7, 'KHUSHI KHEMANI', NULL, 'by bus', 'Bilaspur',
    NULL, 'https://nfwtbrmqvsejwwvraanf.supabase.co/storage/v1/object/public/quotation_image/Quotation_CRR-26-27-1924-01.pdf', 'https://nfwtbrmqvsejwwvraanf.supabase.co/storage/v1/object/public/acceptance_file_upload/1788251637020-3okcny8i5qf.pdf', 'no',
    'No', 100.0, 207680.0, '22AEZPJ4665D1ZA', 'GANGA'
  )
  ON CONFLICT (order_no) DO UPDATE SET
    company_name = EXCLUDED.company_name,
    total_order_qty = EXCLUDED.total_order_qty,
    amount = EXCLUDED.amount,
    updated_at = NOW()
  RETURNING id INTO v_order_id;
  DELETE FROM otp_order_items WHERE order_id = v_order_id;
  INSERT INTO otp_order_items (order_id, item_no, item_name, quantity) VALUES
    (v_order_id, 1, 'FISCHER-CHEMICAL-FIS V PLUS 360 S-IN', 100.0);

  -- Order #24: DO-4714 (PROTECH ENGINEERING SERVICES)
  INSERT INTO otp_orders (
    order_no, quotation_no, timestamp, company_name, contact_person_name,
    contact_number, billing_address, shipping_address, payment_mode,
    payment_terms_days, reference_name, email, transport_mode, destination,
    po_number, quotation_copy_url, acceptance_copy_url, offer_show,
    conveyed_for_registration, total_order_qty, amount, gst_no, cre_name
  ) VALUES (
    'DO-4714', 'CRR-26-27-1947', '2026-09-01 07:44:04.869'::timestamptz, 'PROTECH ENGINEERING SERVICES', 'B.MITRA JI',
    '8319868408', 'KAMAL VIHAR, A13, SECTOR 8B, Shree Durga Mandir, Kamal Vihar, Raipur, Raipur, Chhattisgarh, 492015', 'KAMAL VIHAR, A13, SECTOR 8B, Shree Durga Mandir, Kamal Vihar, Raipur, Raipur, Chhattisgarh, 492015', 'fullyadvance',
    1, 'AMAY SWARNKAR', NULL, 'by hand maniquip store', 'raipur',
    NULL, 'https://nfwtbrmqvsejwwvraanf.supabase.co/storage/v1/object/public/quotation_image/Quotation_CRR-26-27-1947.pdf', 'https://nfwtbrmqvsejwwvraanf.supabase.co/storage/v1/object/public/acceptance_file_upload/1788249505297-0aoyfcwqcgco.jpg', 'no',
    'No', 7.0, 7938.0, '22AIVPG2906J1Z7', 'PRIYA'
  )
  ON CONFLICT (order_no) DO UPDATE SET
    company_name = EXCLUDED.company_name,
    total_order_qty = EXCLUDED.total_order_qty,
    amount = EXCLUDED.amount,
    updated_at = NOW()
  RETURNING id INTO v_order_id;
  DELETE FROM otp_order_items WHERE order_id = v_order_id;
  INSERT INTO otp_order_items (order_id, item_no, item_name, quantity) VALUES
    (v_order_id, 1, 'LANCER-SHOES-TP-1003DD-7NO', 2.0),
    (v_order_id, 2, 'LANCER-SHOES-TP-1003DD-8NO', 2.0),
    (v_order_id, 3, 'LANCER-SHOES-TP-1003DD-9NO', 1.0),
    (v_order_id, 4, 'LANCER-SHOES-TP-1003DD-10NO', 2.0);

  -- Order #25: DO-4713 (SHIVSHAKTI ENTERPRISES)
  INSERT INTO otp_orders (
    order_no, quotation_no, timestamp, company_name, contact_person_name,
    contact_number, billing_address, shipping_address, payment_mode,
    payment_terms_days, reference_name, email, transport_mode, destination,
    po_number, quotation_copy_url, acceptance_copy_url, offer_show,
    conveyed_for_registration, total_order_qty, amount, gst_no, cre_name
  ) VALUES (
    'DO-4713', 'CRR-26-27-1946', '2026-09-01 07:30:19.783'::timestamptz, 'SHIVSHAKTI ENTERPRISES', 'SPARSH JI',
    '7879709799', '01, NEAR SARASWATI RAILWAY STATION, RAM NAGAR ROAD, Kota Road, Kommerce House, Gogaon, Raipur, Raipur, Chhattisgarh, 492001', '01, NEAR SARASWATI RAILWAY STATION, RAM NAGAR ROAD, Kota Road, Kommerce House, Gogaon, Raipur, Raipur, Chhattisgarh, 492001', 'fullyadvance',
    1, 'AMAY SWARNKAR', NULL, 'by hand maniquip store', 'raipur',
    NULL, 'https://nfwtbrmqvsejwwvraanf.supabase.co/storage/v1/object/public/quotation_image/Quotation_CRR-26-27-1946.pdf', 'https://nfwtbrmqvsejwwvraanf.supabase.co/storage/v1/object/public/acceptance_file_upload/1788249025665-tks2nxvtl2e.jpg', 'no',
    'No', 20.0, 21476.0, '22BBNPA0995H1ZR', 'NIKITA'
  )
  ON CONFLICT (order_no) DO UPDATE SET
    company_name = EXCLUDED.company_name,
    total_order_qty = EXCLUDED.total_order_qty,
    amount = EXCLUDED.amount,
    updated_at = NOW()
  RETURNING id INTO v_order_id;
  DELETE FROM otp_order_items WHERE order_id = v_order_id;
  INSERT INTO otp_order_items (order_id, item_no, item_name, quantity) VALUES
    (v_order_id, 1, 'FISCHER-CHEMICAL-FIS V PLUS 360 S-IN', 20.0);

  -- Order #26: DO-4712 (GIRDHAR BUILDERS AND CONSTRUCTION)
  INSERT INTO otp_orders (
    order_no, quotation_no, timestamp, company_name, contact_person_name,
    contact_number, billing_address, shipping_address, payment_mode,
    payment_terms_days, reference_name, email, transport_mode, destination,
    po_number, quotation_copy_url, acceptance_copy_url, offer_show,
    conveyed_for_registration, total_order_qty, amount, gst_no, cre_name
  ) VALUES (
    'DO-4712', 'CRR-26-27-1941-03', '2026-08-31 13:50:11.67'::timestamptz, 'GIRDHAR BUILDERS AND CONSTRUCTION', 'SAHIL JI',
    '9630350005', '1ST FLOOR, 1ST, GIRDHAR BHAWAN, DEEN DAYAL UPADHAYAY NAGAR, NEAR APPU SWEETS, Raipur, Raipur, Chhattisgarh, 492010', '1ST FLOOR, 1ST, GIRDHAR BHAWAN, DEEN DAYAL UPADHAYAY NAGAR, NEAR APPU SWEETS, Raipur, Raipur, Chhattisgarh, 492010', 'fullyadvance',
    1, 'NIKITA ROUT', NULL, 'by hand-warehouse', 'Raipur',
    NULL, 'https://nfwtbrmqvsejwwvraanf.supabase.co/storage/v1/object/public/quotation_image/Quotation_CRR-26-27-1941-03.pdf', 'https://nfwtbrmqvsejwwvraanf.supabase.co/storage/v1/object/public/acceptance_file_upload/1788248319757-w5guy4ydy7d.pdf', 'no',
    'No', 2.0, 30000.0, '22AFRPG3887K1ZY', 'NIKITA'
  )
  ON CONFLICT (order_no) DO UPDATE SET
    company_name = EXCLUDED.company_name,
    total_order_qty = EXCLUDED.total_order_qty,
    amount = EXCLUDED.amount,
    updated_at = NOW()
  RETURNING id INTO v_order_id;
  DELETE FROM otp_order_items WHERE order_id = v_order_id;
  INSERT INTO otp_order_items (order_id, item_no, item_name, quantity) VALUES
    (v_order_id, 1, 'ManiQuip-MQMC500 MINI CRANE 500KG LITE', 1.0),
    (v_order_id, 2, 'BUCKET LITE 5%', 1.0);

  -- Order #27: DO-4711 (M/S MAHENDRA BUILDCON)
  INSERT INTO otp_orders (
    order_no, quotation_no, timestamp, company_name, contact_person_name,
    contact_number, billing_address, shipping_address, payment_mode,
    payment_terms_days, reference_name, email, transport_mode, destination,
    po_number, quotation_copy_url, acceptance_copy_url, offer_show,
    conveyed_for_registration, total_order_qty, amount, gst_no, cre_name
  ) VALUES (
    'DO-4711', 'CRR-26-27-1921', '2026-08-29 12:51:48.674'::timestamptz, 'M/S MAHENDRA BUILDCON', 'Gurmeet Bagga Ji',
    '9826190371', 'KUNDALA VASHUNDHARA CITY, KHARSIYA ROAD, AMBIKAPUR, Surguja, Chhattisgarh, 497001', 'KUNDALA VASHUNDHARA CITY, KHARSIYA ROAD, AMBIKAPUR, Surguja, Chhattisgarh, 497001', 'fullyadvance',
    1, 'NIKITA ROUT', NULL, 'by transport', 'ANNUPPUR',
    NULL, 'https://nfwtbrmqvsejwwvraanf.supabase.co/storage/v1/object/public/quotation_image/Quotation_CRR-26-27-1921.pdf', 'https://nfwtbrmqvsejwwvraanf.supabase.co/storage/v1/object/public/acceptance_file_upload/1788247784678-5nxygzo54rk.pdf', 'no',
    'No', 2.0, 157530.0, '22ABDFM6125G1ZN', 'NIKITA'
  )
  ON CONFLICT (order_no) DO UPDATE SET
    company_name = EXCLUDED.company_name,
    total_order_qty = EXCLUDED.total_order_qty,
    amount = EXCLUDED.amount,
    updated_at = NOW()
  RETURNING id INTO v_order_id;
  DELETE FROM otp_order_items WHERE order_id = v_order_id;
  INSERT INTO otp_order_items (order_id, item_no, item_name, quantity) VALUES
    (v_order_id, 1, 'ManiQuip- SEMI AUTOMATIC CTM 2000KN HMI DISPLAY', 1.0),
    (v_order_id, 2, 'PACKAGING AND FORWARDING', 1.0);

  -- Order #28: DO-4710 (BHOOMI CONSTRUCTION)
  INSERT INTO otp_orders (
    order_no, quotation_no, timestamp, company_name, contact_person_name,
    contact_number, billing_address, shipping_address, payment_mode,
    payment_terms_days, reference_name, email, transport_mode, destination,
    po_number, quotation_copy_url, acceptance_copy_url, offer_show,
    conveyed_for_registration, total_order_qty, amount, gst_no, cre_name
  ) VALUES (
    'DO-4710', 'NBD-26-27-850', '2026-08-31 14:09:42.733'::timestamptz, 'BHOOMI CONSTRUCTION', 'BABLU KHAN JI',
    '9371727770', 'BEHIND DWARKANATH NAGAR, 0, LAXMI NARAYAN NAGAR, AMRAVATI, AMRAVATI, Amravati, Maharashtra, 444606', 'BEHIND DWARKANATH NAGAR, 0, LAXMI NARAYAN NAGAR, AMRAVATI, AMRAVATI, Amravati, Maharashtra, 444606', 'fullyadvance',
    1, 'AMAY SWARNKAR', NULL, 'by hand maniquip store', 'raipur',
    NULL, 'https://nfwtbrmqvsejwwvraanf.supabase.co/storage/v1/object/public/quotation_image/Quotation_NBD-26-27-850.pdf', 'https://nfwtbrmqvsejwwvraanf.supabase.co/storage/v1/object/public/acceptance_file_upload/1788247554958-r9kx0mb4wl.jpeg', 'no',
    'No', 1.0, 6613.9, '27ANMPS3392L1Z6', 'MANIQUIP'
  )
  ON CONFLICT (order_no) DO UPDATE SET
    company_name = EXCLUDED.company_name,
    total_order_qty = EXCLUDED.total_order_qty,
    amount = EXCLUDED.amount,
    updated_at = NOW()
  RETURNING id INTO v_order_id;
  DELETE FROM otp_order_items WHERE order_id = v_order_id;
  INSERT INTO otp_order_items (order_id, item_no, item_name, quantity) VALUES
    (v_order_id, 1, 'BOSCH-ROTARY HAMMER-GBH 220', 1.0);

  -- Order #29: DO-4709 (AVINASH DEVELOPERS PRIVATE LIMITED-CG)
  INSERT INTO otp_orders (
    order_no, quotation_no, timestamp, company_name, contact_person_name,
    contact_number, billing_address, shipping_address, payment_mode,
    payment_terms_days, reference_name, email, transport_mode, destination,
    po_number, quotation_copy_url, acceptance_copy_url, offer_show,
    conveyed_for_registration, total_order_qty, amount, gst_no, cre_name
  ) VALUES (
    'DO-4709', 'CRR-26-27-1720', '2026-08-12 08:47:13.618'::timestamptz, 'AVINASH DEVELOPERS PRIVATE LIMITED-CG', 'Aniket Tiwari Ji',
    '8319006551', '1ST FLOOR, MARUTI BUSINESS PARK, AVINASH HOUSE, G.E. ROAD, RAIPUR, Raipur, Chhattisgarh, 492001', '1ST FLOOR, MARUTI BUSINESS PARK, AVINASH HOUSE, G.E. ROAD, RAIPUR, Raipur, Chhattisgarh, 492001', 'full on credit',
    30, 'PRIYANKA VISHWAS', NULL, 'by hand-warehouse', 'Labhandi',
    'PORABL/00210/26-27', 'https://nfwtbrmqvsejwwvraanf.supabase.co/storage/v1/object/public/quotation_image/Quotation_CRR-26-27-1945.pdf', 'https://nfwtbrmqvsejwwvraanf.supabase.co/storage/v1/object/public/acceptance_file_upload/1788247268133-mtmy4u7vk5.pdf', 'no',
    'No', 155.0, 9941.5, '22AADCA4060E1ZD', 'NIKITA'
  )
  ON CONFLICT (order_no) DO UPDATE SET
    company_name = EXCLUDED.company_name,
    total_order_qty = EXCLUDED.total_order_qty,
    amount = EXCLUDED.amount,
    updated_at = NOW()
  RETURNING id INTO v_order_id;
  DELETE FROM otp_order_items WHERE order_id = v_order_id;
  INSERT INTO otp_order_items (order_id, item_no, item_name, quantity) VALUES
    (v_order_id, 1, 'FISCHER-ANCHOR-FWA 12X100', 100.0),
    (v_order_id, 2, 'FISCHER-ANCHOR-FWA 16X140', 50.0),
    (v_order_id, 3, 'FREEMANS-STEEL TAPE-30MTR', 2.0),
    (v_order_id, 4, 'FREEMANS-STEEL TAPE-5MTR', 3.0);

  -- Order #30: DO-4708 (AIM INFRASTRUCTURE AND DEVELOPERS)
  INSERT INTO otp_orders (
    order_no, quotation_no, timestamp, company_name, contact_person_name,
    contact_number, billing_address, shipping_address, payment_mode,
    payment_terms_days, reference_name, email, transport_mode, destination,
    po_number, quotation_copy_url, acceptance_copy_url, offer_show,
    conveyed_for_registration, total_order_qty, amount, gst_no, cre_name
  ) VALUES (
    'DO-4708', 'CRR-26-27-1918', '2026-08-29 11:34:25.682'::timestamptz, 'AIM INFRASTRUCTURE AND DEVELOPERS', 'Aniket Tiwari Ji',
    '8319006551', '1ST FLOOR, AVINASH HOUSE, MARUTI BUSINESS PARK, G. E. ROAD,
Raipur, Chhattisgarh, 492001', 'AVINASH CHITWAN :AVINASH CHITWAN, KACHNA ,NEAR
DHOTRE MARRIAGE HALL GST LOCATION- CHHATTISGARH
Contact Person :Mr. Umashankar Mishra
Contact No :+91-9691036822
Order No. : PORAIMK/00212/26-27', 'full on credit',
    30, 'NIKITA ROUT', NULL, 'by hand-warehouse', 'KACHNA',
    'PORAIMK/00212/26-27', 'https://nfwtbrmqvsejwwvraanf.supabase.co/storage/v1/object/public/quotation_image/Quotation_CRR-26-27-1944.pdf', 'https://nfwtbrmqvsejwwvraanf.supabase.co/storage/v1/object/public/acceptance_file_upload/1788246525569-nwq7wt8ayy.pdf', 'no',
    'No', 45.0, 14396.0, '22ABDFA7357E1ZR', 'NIKITA'
  )
  ON CONFLICT (order_no) DO UPDATE SET
    company_name = EXCLUDED.company_name,
    total_order_qty = EXCLUDED.total_order_qty,
    amount = EXCLUDED.amount,
    updated_at = NOW()
  RETURNING id INTO v_order_id;
  DELETE FROM otp_order_items WHERE order_id = v_order_id;
  INSERT INTO otp_order_items (order_id, item_no, item_name, quantity) VALUES
    (v_order_id, 1, 'FISCHER-ANCHOR-FWA 12X100', 25.0),
    (v_order_id, 2, 'FISCHER-ANCHOR-FWA 16X105', 20.0);

  -- Order #31: DO-4707 (JHAJHARIA NIRMAN LIMITED U.P. CHUNAR KHAIRAHI (S.A.))
  INSERT INTO otp_orders (
    order_no, quotation_no, timestamp, company_name, contact_person_name,
    contact_number, billing_address, shipping_address, payment_mode,
    payment_terms_days, reference_name, email, transport_mode, destination,
    po_number, quotation_copy_url, acceptance_copy_url, offer_show,
    conveyed_for_registration, total_order_qty, amount, gst_no, cre_name
  ) VALUES (
    'DO-4707', 'CRR-26-27-1791-03', '2026-08-18 12:00:14.745'::timestamptz, 'JHAJHARIA NIRMAN LIMITED U.P. CHUNAR KHAIRAHI (S.A.)', 'SATRAZ JI',
    '6200676712', '120 danwar, kunti w/o pooran sing, near railway station, Danwar Railway Station, Danwar, Bulandshahr, Uttar Pradesh, 203132', 'JHAJHARIA NIRMAN LIMITED, CAMP OFFICE ROB-19 DADRA, POLICE STATION RAJGARH NEAR RAJGARH BLOCK MIRZAPUR UP-231210 MO. - 6200676712 - SARTAJ JI Order No. : JNL/SEP/2026/HO-1547', 'full on credit',
    30, 'KHUSHI KHEMANI', NULL, 'by transport', 'MIRZAPUR UP',
    'JNL/SEP/2026/HO-1547', 'https://nfwtbrmqvsejwwvraanf.supabase.co/storage/v1/object/public/quotation_image/Quotation_CRR-26-27-1791-03.pdf', 'https://nfwtbrmqvsejwwvraanf.supabase.co/storage/v1/object/public/acceptance_file_upload/1788246374287-f6dohckjaq5.pdf', 'no',
    'No', 2.0, 164610.0, '09AABCJ9891J1ZU', 'GEETA'
  )
  ON CONFLICT (order_no) DO UPDATE SET
    company_name = EXCLUDED.company_name,
    total_order_qty = EXCLUDED.total_order_qty,
    amount = EXCLUDED.amount,
    updated_at = NOW()
  RETURNING id INTO v_order_id;
  DELETE FROM otp_order_items WHERE order_id = v_order_id;
  INSERT INTO otp_order_items (order_id, item_no, item_name, quantity) VALUES
    (v_order_id, 1, 'WACKER-INTERNAL VIBRATOR-IRFU 58-5MTR', 2.0);

  -- Order #32: DO-4706 (SUDHAMA NUT BOLT HOUSE)
  INSERT INTO otp_orders (
    order_no, quotation_no, timestamp, company_name, contact_person_name,
    contact_number, billing_address, shipping_address, payment_mode,
    payment_terms_days, reference_name, email, transport_mode, destination,
    po_number, quotation_copy_url, acceptance_copy_url, offer_show,
    conveyed_for_registration, total_order_qty, amount, gst_no, cre_name
  ) VALUES (
    'DO-4706', 'CRR-26-27-1818', '2026-08-20 08:26:19.977'::timestamptz, 'SUDHAMA NUT BOLT HOUSE', 'Krishna Ji',
    '8770646918', '0, 5, NEW BOMBAY MARKET, G.E.ROAD, RAIPUR, Raipur, Chhattisgarh, 492001', '0, 5, NEW BOMBAY MARKET, G.E.ROAD, RAIPUR, Raipur, Chhattisgarh, 492001', 'full on credit',
    30, 'KHUSHI KHEMANI', NULL, 'by hand-warehouse', 'Raipur',
    NULL, 'https://nfwtbrmqvsejwwvraanf.supabase.co/storage/v1/object/public/quotation_image/Quotation_CRR-26-27-1818.pdf', 'https://nfwtbrmqvsejwwvraanf.supabase.co/storage/v1/object/public/acceptance_file_upload/1788240663523-7ghscst61cb.pdf', 'no',
    'No', 5000.0, 37760.0, '22AEYPK1466L1Z0', 'GANGA'
  )
  ON CONFLICT (order_no) DO UPDATE SET
    company_name = EXCLUDED.company_name,
    total_order_qty = EXCLUDED.total_order_qty,
    amount = EXCLUDED.amount,
    updated_at = NOW()
  RETURNING id INTO v_order_id;
  DELETE FROM otp_order_items WHERE order_id = v_order_id;
  INSERT INTO otp_order_items (order_id, item_no, item_name, quantity) VALUES
    (v_order_id, 1, 'FISCHER-ANCHOR-EA M8 N ZP-DROP-IN-ANCHOR', 5000.0);

  -- Order #33: DO-4705 (SHREEJIKRUPA PROJECT LIMITED (OD))
  INSERT INTO otp_orders (
    order_no, quotation_no, timestamp, company_name, contact_person_name,
    contact_number, billing_address, shipping_address, payment_mode,
    payment_terms_days, reference_name, email, transport_mode, destination,
    po_number, quotation_copy_url, acceptance_copy_url, offer_show,
    conveyed_for_registration, total_order_qty, amount, gst_no, cre_name
  ) VALUES (
    'DO-4705', 'CRR-26-27-1939', '2026-08-31 13:14:01.98'::timestamptz, 'SHREEJIKRUPA PROJECT LIMITED (OD)', 'Mr. Topesh Ji',
    '7771006014', '1st floor, 201, Behera Sahi, Plot no. 697 Gayatri Kutir, Jan Aushadhi Kendra, Nayapalli, Bhubaneswar, Khordha, Odisha, 751012', 'Divisional Head. Cuttack Division, IDCO, Cuttack.Cuttack,Odisha.India.', 'full on credit',
    45, 'GEETA BHIWAGADE', NULL, 'by bus', 'PURI ODISHA',
    'SKPL1031/LPO/MAT/0015/26-27', 'https://nfwtbrmqvsejwwvraanf.supabase.co/storage/v1/object/public/quotation_image/Quotation_CRR-26-27-1939.pdf', 'https://nfwtbrmqvsejwwvraanf.supabase.co/storage/v1/object/public/acceptance_file_upload/1788184906562-vnbnaivg0bp.pdf', 'no',
    'No', 300.0, 13806.0, '21AALCS6689K1ZP', 'GEETA'
  )
  ON CONFLICT (order_no) DO UPDATE SET
    company_name = EXCLUDED.company_name,
    total_order_qty = EXCLUDED.total_order_qty,
    amount = EXCLUDED.amount,
    updated_at = NOW()
  RETURNING id INTO v_order_id;
  DELETE FROM otp_order_items WHERE order_id = v_order_id;
  INSERT INTO otp_order_items (order_id, item_no, item_name, quantity) VALUES
    (v_order_id, 1, 'FISCHER-ANCHOR-SXR 10X140 T', 300.0);

  -- Order #34: DO-4704 (SHRI SHIV INFRATECH)
  INSERT INTO otp_orders (
    order_no, quotation_no, timestamp, company_name, contact_person_name,
    contact_number, billing_address, shipping_address, payment_mode,
    payment_terms_days, reference_name, email, transport_mode, destination,
    po_number, quotation_copy_url, acceptance_copy_url, offer_show,
    conveyed_for_registration, total_order_qty, amount, gst_no, cre_name
  ) VALUES (
    'DO-4704', 'CRR-26-27-1935-01', '2026-08-31 11:48:28.795'::timestamptz, 'SHRI SHIV INFRATECH', 'Krish Singhal Ji',
    '7389284484', 'Seksaria Chambers Ganjpara, Seksaria House, Ward no.36, Satti Chaura Ganjpara, Ganjpara, Durg, Durg, Chhattisgarh, 491001', 'Seksaria Chambers Ganjpara, Seksaria House, Ward no.36, Satti Chaura Ganjpara, Ganjpara, Durg, Durg, Chhattisgarh, 491001', 'full on credit',
    7, 'KANCHAN AKHILESH', NULL, 'by transport', 'Durg',
    'SSI/PO/26-27/001', 'https://nfwtbrmqvsejwwvraanf.supabase.co/storage/v1/object/public/quotation_image/Quotation_CRR-26-27-1935-01.pdf', 'https://nfwtbrmqvsejwwvraanf.supabase.co/storage/v1/object/public/acceptance_file_upload/1788183014253-zrsiq07k3o.pdf', 'no',
    'No', 2070.0, 99474.0, '22AFQFS8439G1ZJ', 'NIKITA'
  )
  ON CONFLICT (order_no) DO UPDATE SET
    company_name = EXCLUDED.company_name,
    total_order_qty = EXCLUDED.total_order_qty,
    amount = EXCLUDED.amount,
    updated_at = NOW()
  RETURNING id INTO v_order_id;
  DELETE FROM otp_order_items WHERE order_id = v_order_id;
  INSERT INTO otp_order_items (order_id, item_no, item_name, quantity) VALUES
    (v_order_id, 1, 'ASIAN PAINTS ADMIXTURE - MAXIMO PLAST PC 100', 2070.0);

  -- Order #35: DO-4703 (CHAWLA INFRASTRUCTURE)
  INSERT INTO otp_orders (
    order_no, quotation_no, timestamp, company_name, contact_person_name,
    contact_number, billing_address, shipping_address, payment_mode,
    payment_terms_days, reference_name, email, transport_mode, destination,
    po_number, quotation_copy_url, acceptance_copy_url, offer_show,
    conveyed_for_registration, total_order_qty, amount, gst_no, cre_name
  ) VALUES (
    'DO-4703', 'CRR-26-27-1940', '2026-08-31 13:21:48.559'::timestamptz, 'CHAWLA INFRASTRUCTURE', 'NAVDEEP JI',
    '9893155000', '0, SKYPARK, INFRONT OF BHATIA NURSING HOME, RAJATALAB, Raipur, Chhattisgarh, 492001', '0, SKYPARK, INFRONT OF BHATIA NURSING HOME, RAJATALAB, Raipur, Chhattisgarh, 492001', 'fullyadvance',
    1, 'AMAY SWARNKAR', NULL, 'by hand maniquip store', 'raipur',
    NULL, 'https://nfwtbrmqvsejwwvraanf.supabase.co/storage/v1/object/public/quotation_image/Quotation_CRR-26-27-1940.pdf', 'https://nfwtbrmqvsejwwvraanf.supabase.co/storage/v1/object/public/acceptance_file_upload/1788182895600-th483dtefl.jpeg', 'no',
    'No', 500.0, 12390.0, '22AALFC8394E1ZC', 'PRIYA'
  )
  ON CONFLICT (order_no) DO UPDATE SET
    company_name = EXCLUDED.company_name,
    total_order_qty = EXCLUDED.total_order_qty,
    amount = EXCLUDED.amount,
    updated_at = NOW()
  RETURNING id INTO v_order_id;
  DELETE FROM otp_order_items WHERE order_id = v_order_id;
  INSERT INTO otp_order_items (order_id, item_no, item_name, quantity) VALUES
    (v_order_id, 1, 'FISCHER ANCHOR-SXR 8X80 WZ LS', 500.0);

  -- Order #36: DO-4702 (MYRIAD MINERALS INDIA PRIVATE LIMITED)
  INSERT INTO otp_orders (
    order_no, quotation_no, timestamp, company_name, contact_person_name,
    contact_number, billing_address, shipping_address, payment_mode,
    payment_terms_days, reference_name, email, transport_mode, destination,
    po_number, quotation_copy_url, acceptance_copy_url, offer_show,
    conveyed_for_registration, total_order_qty, amount, gst_no, cre_name
  ) VALUES (
    'DO-4702', 'CRR-26-27-1938', '2026-08-31 13:08:51.263'::timestamptz, 'MYRIAD MINERALS INDIA PRIVATE LIMITED', 'FIROZ JI',
    '7828440444', 'Shop No. TH/14A, Third Floor Shyam Plaza, Old Bus Stand, Pandri, Raipur, Raipur, Chhattisgarh, 492001', 'Shop No. TH/14A, Third Floor Shyam Plaza, Old Bus Stand, Pandri, Raipur, Raipur, Chhattisgarh, 492001', 'fullyadvance',
    1, 'AMAY SWARNKAR', NULL, 'by hand maniquip store', 'raipur',
    NULL, 'https://nfwtbrmqvsejwwvraanf.supabase.co/storage/v1/object/public/quotation_image/Quotation_CRR-26-27-1938.pdf', 'https://nfwtbrmqvsejwwvraanf.supabase.co/storage/v1/object/public/acceptance_file_upload/1788182044950-dfrxuqzb7wn.jpeg', 'no',
    'No', 500.0, 5605.0, '22AAECM6811A1Z5', 'NIKITA'
  )
  ON CONFLICT (order_no) DO UPDATE SET
    company_name = EXCLUDED.company_name,
    total_order_qty = EXCLUDED.total_order_qty,
    amount = EXCLUDED.amount,
    updated_at = NOW()
  RETURNING id INTO v_order_id;
  DELETE FROM otp_order_items WHERE order_id = v_order_id;
  INSERT INTO otp_order_items (order_id, item_no, item_name, quantity) VALUES
    (v_order_id, 1, 'FISCHER-ANCHOR-EA M10 N ZP-DROP-IN-ANCHOR', 500.0);

  -- Order #37: DO-4701 (4D Survey Instruments and Consultants)
  INSERT INTO otp_orders (
    order_no, quotation_no, timestamp, company_name, contact_person_name,
    contact_number, billing_address, shipping_address, payment_mode,
    payment_terms_days, reference_name, email, transport_mode, destination,
    po_number, quotation_copy_url, acceptance_copy_url, offer_show,
    conveyed_for_registration, total_order_qty, amount, gst_no, cre_name
  ) VALUES (
    'DO-4701', 'CRR-26-27-1932', '2026-08-31 10:54:48.104'::timestamptz, '4D Survey Instruments and Consultants', 'Raman Ji',
    '7339157647', '486, Burnar Salai 5th Street, Mugappair East, Chennai, Tiruvallur, Tamil Nadu, 600037', '4D SURVEY INSTRUMENTS AND CONSULTANTS MIG-335. 1st Floor. 3RD MAIN ROAD. MUGAPPAIR ERI SCHEME. MOGAPPAIR EAST CHENNAI-600037 (LANDMARK AMBEDKAR GROUND)', 'partial advance',
    1, 'KRITIKA GUPTA', NULL, 'by transport', 'MOGAPPAIR EAST CHENNAI-600037',
    NULL, 'https://nfwtbrmqvsejwwvraanf.supabase.co/storage/v1/object/public/quotation_image/Quotation_CRR-26-27-1932.pdf', 'https://nfwtbrmqvsejwwvraanf.supabase.co/storage/v1/object/public/acceptance_file_upload/1788177077834-qmhtt5au34m.pdf', 'no',
    'No', 2.0, 645932.0, '33FWAPR3805M1ZB', 'GANGA'
  )
  ON CONFLICT (order_no) DO UPDATE SET
    company_name = EXCLUDED.company_name,
    total_order_qty = EXCLUDED.total_order_qty,
    amount = EXCLUDED.amount,
    updated_at = NOW()
  RETURNING id INTO v_order_id;
  DELETE FROM otp_order_items WHERE order_id = v_order_id;
  INSERT INTO otp_order_items (order_id, item_no, item_name, quantity) VALUES
    (v_order_id, 1, 'SOKKIA-TOTAL STATION-IM 65', 2.0);

  -- Order #38: DO-4700 (ESHWAR ENTERPRISES)
  INSERT INTO otp_orders (
    order_no, quotation_no, timestamp, company_name, contact_person_name,
    contact_number, billing_address, shipping_address, payment_mode,
    payment_terms_days, reference_name, email, transport_mode, destination,
    po_number, quotation_copy_url, acceptance_copy_url, offer_show,
    conveyed_for_registration, total_order_qty, amount, gst_no, cre_name
  ) VALUES (
    'DO-4700', 'CRR-26-27-1893', '2026-08-26 09:33:15.645'::timestamptz, 'ESHWAR ENTERPRISES', 'Aayush Ji',
    '6264080577', '0, ESHWAR ENTERPRISES, STATION ROAD, OPPOSITE DESHBANDHU SCHOOL, Raipur, Chhattisgarh, 492001', '0, ESHWAR ENTERPRISES, STATION ROAD, OPPOSITE DESHBANDHU SCHOOL, Raipur, Chhattisgarh, 492001', 'pdc',
    1, 'HIRU RAM NISHAD', NULL, 'by hand-warehouse', 'Raipur',
    NULL, 'https://nfwtbrmqvsejwwvraanf.supabase.co/storage/v1/object/public/quotation_image/Quotation_CRR-26-27-1893.pdf', 'https://nfwtbrmqvsejwwvraanf.supabase.co/storage/v1/object/public/acceptance_file_upload/1788176663073-7wwxfojqe5f.pdf', 'no',
    'No', 20.0, 21476.0, '22ACNPR5986R1ZF', 'GANGA'
  )
  ON CONFLICT (order_no) DO UPDATE SET
    company_name = EXCLUDED.company_name,
    total_order_qty = EXCLUDED.total_order_qty,
    amount = EXCLUDED.amount,
    updated_at = NOW()
  RETURNING id INTO v_order_id;
  DELETE FROM otp_order_items WHERE order_id = v_order_id;
  INSERT INTO otp_order_items (order_id, item_no, item_name, quantity) VALUES
    (v_order_id, 1, 'FISCHER-CHEMICAL-FIS V PLUS 360 S-IN', 20.0);

  -- Order #39: DO-4699 (STARAX MINERALS INDIA PRIVATE LIMITED)
  INSERT INTO otp_orders (
    order_no, quotation_no, timestamp, company_name, contact_person_name,
    contact_number, billing_address, shipping_address, payment_mode,
    payment_terms_days, reference_name, email, transport_mode, destination,
    po_number, quotation_copy_url, acceptance_copy_url, offer_show,
    conveyed_for_registration, total_order_qty, amount, gst_no, cre_name
  ) VALUES (
    'DO-4699', 'NBD_CRR-26-27-568-02', '2026-08-21 07:41:28.783'::timestamptz, 'STARAX MINERALS INDIA PRIVATE LIMITED', 'SUNIL JI',
    '8815111250', 'KH NO. 244/1247/2, J S HEIGHTS, VILL. KHAPRI, DURG, Durg, Chhattisgarh, 491001', 'KH NO. 244/1247/2, J S HEIGHTS, VILL. KHAPRI, DURG, Durg, Chhattisgarh, 491001', 'fullyadvance',
    1, 'PRIYA SWARNKAR', NULL, 'by hand-warehouse', 'Durg, Chhattisgarh, 491001',
    NULL, 'https://nfwtbrmqvsejwwvraanf.supabase.co/storage/v1/object/public/quotation_image/Quotation_NBD_CRR-26-27-568-02.pdf', 'https://nfwtbrmqvsejwwvraanf.supabase.co/storage/v1/object/public/acceptance_file_upload/1788169049364-vt842tvrkc.pdf', 'yes',
    'No', 2.0, 11800.0, '22AAYCS4935P1ZF', 'PRIYA'
  )
  ON CONFLICT (order_no) DO UPDATE SET
    company_name = EXCLUDED.company_name,
    total_order_qty = EXCLUDED.total_order_qty,
    amount = EXCLUDED.amount,
    updated_at = NOW()
  RETURNING id INTO v_order_id;
  DELETE FROM otp_order_items WHERE order_id = v_order_id;
  INSERT INTO otp_order_items (order_id, item_no, item_name, quantity) VALUES
    (v_order_id, 1, 'CST-PRISM POLE WITH BUBBLE', 1.0),
    (v_order_id, 2, 'UN-MINI PRISM WITH ROD', 1.0);

  -- Order #40: DO-4698 (VCONSTRUCT)
  INSERT INTO otp_orders (
    order_no, quotation_no, timestamp, company_name, contact_person_name,
    contact_number, billing_address, shipping_address, payment_mode,
    payment_terms_days, reference_name, email, transport_mode, destination,
    po_number, quotation_copy_url, acceptance_copy_url, offer_show,
    conveyed_for_registration, total_order_qty, amount, gst_no, cre_name
  ) VALUES (
    'DO-4698', 'CRR-26-27-1912-01', '2026-08-29 07:26:16.475'::timestamptz, 'VCONSTRUCT', 'Chandan Ji',
    '9706219086', '1ST FLOOR, ROOMNO.14, BARUAH MARKET, T.R. PHOOKAN ROAD, FANCY BAZAR, Kamrup Metropolitan, Assam, 781001', '1ST FLOOR, ROOMNO.14, BARUAH MARKET, T.R. PHOOKAN ROAD, FANCY BAZAR, Kamrup Metropolitan, Assam, 781001', 'full on credit',
    1, 'PRIYA SWARNKAR', NULL, 'by hand-warehouse', 'Assam, 781001',
    NULL, 'https://nfwtbrmqvsejwwvraanf.supabase.co/storage/v1/object/public/quotation_image/Quotation_CRR-26-27-1912-01.pdf', 'https://nfwtbrmqvsejwwvraanf.supabase.co/storage/v1/object/public/acceptance_file_upload/1788162863348-mq72wvzi6el.pdf', 'no',
    'No', 13.0, 9177.8, '18AATFV7018G1ZN', 'PRIYA'
  )
  ON CONFLICT (order_no) DO UPDATE SET
    company_name = EXCLUDED.company_name,
    total_order_qty = EXCLUDED.total_order_qty,
    amount = EXCLUDED.amount,
    updated_at = NOW()
  RETURNING id INTO v_order_id;
  DELETE FROM otp_order_items WHERE order_id = v_order_id;
  INSERT INTO otp_order_items (order_id, item_no, item_name, quantity) VALUES
    (v_order_id, 1, 'RAPID MOISTURE METER-50%', 2.0),
    (v_order_id, 2, 'CALCIUM CARBIDE-500GM', 8.0),
    (v_order_id, 3, 'FREEMANS-STEEL TAPE-50MTR', 3.0);

  -- Order #41: DO-4697 (DEE VEE PROJECTS LIMITED - I SEC 25 NAYA RAIPUR)
  INSERT INTO otp_orders (
    order_no, quotation_no, timestamp, company_name, contact_person_name,
    contact_number, billing_address, shipping_address, payment_mode,
    payment_terms_days, reference_name, email, transport_mode, destination,
    po_number, quotation_copy_url, acceptance_copy_url, offer_show,
    conveyed_for_registration, total_order_qty, amount, gst_no, cre_name
  ) VALUES (
    'DO-4697', 'CRR-26-27-1922-02', '2026-08-29 12:58:21.639'::timestamptz, 'DEE VEE PROJECTS LIMITED - I SEC 25 NAYA RAIPUR', 'deepak ji',
    '9424969366', 'DEE VEE PROJECTS LIMITED, DEE VEE HOUSE, NEAR BABYLONE, VIP ROAD, MOULSHREE VIHAR, Raipur, Raipur, Chhattisgarh, 492006', 'SEC 25 NAYA RAIPUR', 'full on credit',
    30, 'NEERAJ SIR', NULL, 'by hand-warehouse', 'SEC 25 NAYA RAIPUR 492101',
    NULL, 'https://nfwtbrmqvsejwwvraanf.supabase.co/storage/v1/object/public/quotation_image/Quotation_CRR-26-27-1922-02.pdf', 'https://nfwtbrmqvsejwwvraanf.supabase.co/storage/v1/object/public/acceptance_file_upload/1788161744524-4ylxvz1oxkl.pdf', 'no',
    'No', 48.0, 12390.0, '22AAECD4619B4Z7', 'PRIYA'
  )
  ON CONFLICT (order_no) DO UPDATE SET
    company_name = EXCLUDED.company_name,
    total_order_qty = EXCLUDED.total_order_qty,
    amount = EXCLUDED.amount,
    updated_at = NOW()
  RETURNING id INTO v_order_id;
  DELETE FROM otp_order_items WHERE order_id = v_order_id;
  INSERT INTO otp_order_items (order_id, item_no, item_name, quantity) VALUES
    (v_order_id, 1, 'FISCHER-FBN II 16/25 16X145', 48.0);

  -- Order #42: DO-4696 (DEE VEE PROJECTS LIMITED (O.D.))
  INSERT INTO otp_orders (
    order_no, quotation_no, timestamp, company_name, contact_person_name,
    contact_number, billing_address, shipping_address, payment_mode,
    payment_terms_days, reference_name, email, transport_mode, destination,
    po_number, quotation_copy_url, acceptance_copy_url, offer_show,
    conveyed_for_registration, total_order_qty, amount, gst_no, cre_name
  ) VALUES (
    'DO-4696', 'CRR-26-27-1911-02', '2026-08-29 07:09:27.612'::timestamptz, 'DEE VEE PROJECTS LIMITED (O.D.)', 'Naresh Bansal Ji',
    '9518835427', 'Ward No. 05, Bada Pokhari Tala, Madhapur, Kendujhar, Kendujhar, Odisha, 758001', 'Ward No. 05, Bada Pokhari Tala, Madhapur, Kendujhar, Kendujhar, Odisha, 758001', 'full on credit',
    30, 'SARITA BAGHEL', NULL, 'by bus', 'KORAPUT ODISHA',
    'DVPL/KOR/26-27/272', 'https://nfwtbrmqvsejwwvraanf.supabase.co/storage/v1/object/public/quotation_image/Quotation_CRR-26-27-1911-02.pdf', 'https://nfwtbrmqvsejwwvraanf.supabase.co/storage/v1/object/public/acceptance_file_upload/1788161572963-3qjwrqa5s71.pdf', 'no',
    'No', 2.0, 2955.9, '21AAECD4619B1ZC', 'PRIYA'
  )
  ON CONFLICT (order_no) DO UPDATE SET
    company_name = EXCLUDED.company_name,
    total_order_qty = EXCLUDED.total_order_qty,
    amount = EXCLUDED.amount,
    updated_at = NOW()
  RETURNING id INTO v_order_id;
  DELETE FROM otp_order_items WHERE order_id = v_order_id;
  INSERT INTO otp_order_items (order_id, item_no, item_name, quantity) VALUES
    (v_order_id, 1, 'PH TESTING KIT-DIGITAL', 1.0),
    (v_order_id, 2, 'TDS METER', 1.0);

  -- Order #43: DO-4695 (M/S ANUPAM NIRMAN (P) LTD.)
  INSERT INTO otp_orders (
    order_no, quotation_no, timestamp, company_name, contact_person_name,
    contact_number, billing_address, shipping_address, payment_mode,
    payment_terms_days, reference_name, email, transport_mode, destination,
    po_number, quotation_copy_url, acceptance_copy_url, offer_show,
    conveyed_for_registration, total_order_qty, amount, gst_no, cre_name
  ) VALUES (
    'DO-4695', 'NBD_CRR-26-27-602', '2026-08-31 07:03:57.513'::timestamptz, 'M/S ANUPAM NIRMAN (P) LTD.', 'Ajit Ji',
    '9119920178', '7th Floor, Block-A, 7-C, Exotica Greens, RGB Road, Tarun Nagar, Guwahati, Kamrup Metropolitan, Assam, 781005', 'Silchar Assam-788001', 'full on credit',
    1, 'PRIYA SWARNKAR', NULL, 'by bus', 'Silchar Assam-788001',
    NULL, 'https://nfwtbrmqvsejwwvraanf.supabase.co/storage/v1/object/public/quotation_image/Quotation_NBD-26-27-602.pdf', 'https://nfwtbrmqvsejwwvraanf.supabase.co/storage/v1/object/public/acceptance_file_upload/1788160883578-k0nhz4j101k.pdf', 'no',
    'No', 2.0, 20968.6, '18AAICA4965B1ZP', 'PRIYA'
  )
  ON CONFLICT (order_no) DO UPDATE SET
    company_name = EXCLUDED.company_name,
    total_order_qty = EXCLUDED.total_order_qty,
    amount = EXCLUDED.amount,
    updated_at = NOW()
  RETURNING id INTO v_order_id;
  DELETE FROM otp_order_items WHERE order_id = v_order_id;
  INSERT INTO otp_order_items (order_id, item_no, item_name, quantity) VALUES
    (v_order_id, 1, 'SOKKIA-AUTOMATIC LEVEL-B40A-D5', 1.0),
    (v_order_id, 2, 'PACKAGING AND FORWARDING', 1.0);

  -- Order #44: DO-4694 (SUDHAMA NUT BOLT HOUSE)
  INSERT INTO otp_orders (
    order_no, quotation_no, timestamp, company_name, contact_person_name,
    contact_number, billing_address, shipping_address, payment_mode,
    payment_terms_days, reference_name, email, transport_mode, destination,
    po_number, quotation_copy_url, acceptance_copy_url, offer_show,
    conveyed_for_registration, total_order_qty, amount, gst_no, cre_name
  ) VALUES (
    'DO-4694', 'CRR-26-27-1926', '2026-08-31 07:08:43.34'::timestamptz, 'SUDHAMA NUT BOLT HOUSE', 'Krishna Ji',
    '8770646918', '0, 5, NEW BOMBAY MARKET, G.E.ROAD, RAIPUR, Raipur, Chhattisgarh, 492001', '0, 5, NEW BOMBAY MARKET, G.E.ROAD, RAIPUR, Raipur, Chhattisgarh, 492001', 'full on credit',
    30, 'KHUSHI KHEMANI', NULL, 'by hand-warehouse', 'Raipur',
    NULL, 'https://nfwtbrmqvsejwwvraanf.supabase.co/storage/v1/object/public/quotation_image/Quotation_CRR-26-27-1926.pdf', 'https://nfwtbrmqvsejwwvraanf.supabase.co/storage/v1/object/public/acceptance_file_upload/1788160498916-o7w8futsk0o.pdf', 'no',
    'No', 40.0, 40828.0, '22AEYPK1466L1Z0', 'GANGA'
  )
  ON CONFLICT (order_no) DO UPDATE SET
    company_name = EXCLUDED.company_name,
    total_order_qty = EXCLUDED.total_order_qty,
    amount = EXCLUDED.amount,
    updated_at = NOW()
  RETURNING id INTO v_order_id;
  DELETE FROM otp_order_items WHERE order_id = v_order_id;
  INSERT INTO otp_order_items (order_id, item_no, item_name, quantity) VALUES
    (v_order_id, 1, 'FISCHER-CHEMICAL-FIS V PLUS 360 S-IN', 40.0);

  -- Order #45: DO-4693 (CHEVROX CONSTRUCTIONS PRIVATE LIMITED-MH)
  INSERT INTO otp_orders (
    order_no, quotation_no, timestamp, company_name, contact_person_name,
    contact_number, billing_address, shipping_address, payment_mode,
    payment_terms_days, reference_name, email, transport_mode, destination,
    po_number, quotation_copy_url, acceptance_copy_url, offer_show,
    conveyed_for_registration, total_order_qty, amount, gst_no, cre_name
  ) VALUES (
    'DO-4693', 'NBD_CRR-26-27-585-03', '2026-08-25 13:00:44.281'::timestamptz, 'CHEVROX CONSTRUCTIONS PRIVATE LIMITED-MH', 'Pinak Ji',
    '9727767356', 'Ground floor, Shop No- 10, Survey Number- 225, Building No- G, Phase 3, Bhoomi Acres, Waghbil Godhbunder Road, Nearby Bhoomi circle, Kavesar, Hirananadani Estate, Thane, Thane, Maharashtra, 400615', 'CHEVROX CONSTRUCTIONS PVT. LTD. Welspun Enterprises Limited, C/o Chevrox Constructions Pvt Ltd, Bhandup Complex Entry Gate 5B Store, Bhandup Complex S Ward, Khindipada Road, Bhandup S Ward, Mumbai, -Maharashtra-400082 INDIA PO No : ΜΗΤΡΟ26/800289', 'full on credit',
    15, 'GEETA BHIWAGADE', NULL, 'by transport', 'MUMBAI',
    'PO No : ΜΗΤΡΟ26/800289', 'https://nfwtbrmqvsejwwvraanf.supabase.co/storage/v1/object/public/quotation_image/Quotation_NBD_CRR-26-27-585-03.pdf', 'https://nfwtbrmqvsejwwvraanf.supabase.co/storage/v1/object/public/acceptance_file_upload/1788156498839-tsyatqzi8gk.pdf', 'no',
    'No', 3.0, 222450.0, '27AAGCM7457A1ZH', 'GEETA'
  )
  ON CONFLICT (order_no) DO UPDATE SET
    company_name = EXCLUDED.company_name,
    total_order_qty = EXCLUDED.total_order_qty,
    amount = EXCLUDED.amount,
    updated_at = NOW()
  RETURNING id INTO v_order_id;
  DELETE FROM otp_order_items WHERE order_id = v_order_id;
  INSERT INTO otp_order_items (order_id, item_no, item_name, quantity) VALUES
    (v_order_id, 1, 'ManiQuip DOUBLE DRUM WALK BEHIND ROLLER - MQR 2500 UT', 1.0),
    (v_order_id, 2, 'HYDRAULIC OIL 68no', 1.0),
    (v_order_id, 3, 'PACKAGING AND FORWARDING', 1.0);

  -- Order #46: DO-4692 (VAISHNODEVI TRADERS)
  INSERT INTO otp_orders (
    order_no, quotation_no, timestamp, company_name, contact_person_name,
    contact_number, billing_address, shipping_address, payment_mode,
    payment_terms_days, reference_name, email, transport_mode, destination,
    po_number, quotation_copy_url, acceptance_copy_url, offer_show,
    conveyed_for_registration, total_order_qty, amount, gst_no, cre_name
  ) VALUES (
    'DO-4692', 'CRR-26-27-1923', '2026-08-29 13:05:46.667'::timestamptz, 'VAISHNODEVI TRADERS', 'MR. MAHA PATRA JI',
    '8249026516', 'Plot No-301 301/1516, LAXMISAGAR CHHAK, BHUBANESWAR, Khordha, Odisha, 751006', 'Plot No-301 301/1516, LAXMISAGAR CHHAK, BHUBANESWAR, Khordha, Odisha, 751006', 'fullyadvance',
    1, 'NEERAJ SIR', NULL, 'by transport', 'Khordha',
    NULL, 'https://nfwtbrmqvsejwwvraanf.supabase.co/storage/v1/object/public/quotation_image/Quotation_CRR-26-27-1923.pdf', 'https://nfwtbrmqvsejwwvraanf.supabase.co/storage/v1/object/public/acceptance_file_upload/1788154975545-excwkmgdop.pdf', 'no',
    'No', 1.0, 328040.0, '21AKRPM7476R1Z4', 'GANGA'
  )
  ON CONFLICT (order_no) DO UPDATE SET
    company_name = EXCLUDED.company_name,
    total_order_qty = EXCLUDED.total_order_qty,
    amount = EXCLUDED.amount,
    updated_at = NOW()
  RETURNING id INTO v_order_id;
  DELETE FROM otp_order_items WHERE order_id = v_order_id;
  INSERT INTO otp_order_items (order_id, item_no, item_name, quantity) VALUES
    (v_order_id, 1, 'SOKKIA-TOTAL STATION-IM 65', 1.0);

  -- Order #47: DO-4691 (VERMA WATERPROOFING)
  INSERT INTO otp_orders (
    order_no, quotation_no, timestamp, company_name, contact_person_name,
    contact_number, billing_address, shipping_address, payment_mode,
    payment_terms_days, reference_name, email, transport_mode, destination,
    po_number, quotation_copy_url, acceptance_copy_url, offer_show,
    conveyed_for_registration, total_order_qty, amount, gst_no, cre_name
  ) VALUES (
    'DO-4691', 'CRR-26-27-1917-01', '2026-08-29 11:22:13.724'::timestamptz, 'VERMA WATERPROOFING', 'Mr. Mukesh Ji',
    '8966003022', 'Raipur Chhattisgarh-492001', 'Raipur Chhattisgarh-492001', 'fullyadvance',
    1, 'PRIYANKA VISHWAS', NULL, 'by hand-warehouse', 'Raipur',
    NULL, 'https://nfwtbrmqvsejwwvraanf.supabase.co/storage/v1/object/public/quotation_image/Quotation_CRR-26-27-1917-01.pdf', 'https://nfwtbrmqvsejwwvraanf.supabase.co/storage/v1/object/public/acceptance_file_upload/1788153914145-psvzhcz1ayq.pdf', 'no',
    'No', 24.0, 3799.6, NULL, 'GANGA'
  )
  ON CONFLICT (order_no) DO UPDATE SET
    company_name = EXCLUDED.company_name,
    total_order_qty = EXCLUDED.total_order_qty,
    amount = EXCLUDED.amount,
    updated_at = NOW()
  RETURNING id INTO v_order_id;
  DELETE FROM otp_order_items WHERE order_id = v_order_id;
  INSERT INTO otp_order_items (order_id, item_no, item_name, quantity) VALUES
    (v_order_id, 1, 'FISCHER- G M12X1000 8.8 ZP THREADED ROD', 2.0),
    (v_order_id, 2, 'FISCHER- G M20X1000 8.8 ZP THREADED ROD', 2.0),
    (v_order_id, 3, 'NUT WASHER M12', 10.0),
    (v_order_id, 4, 'NUT WASHER M20', 10.0);

  -- Order #48: DO-4690 (JHAJHARIA NIRMAN LIMITED U.P. KHAIRAHI CHOPAN KTC (S.A.))
  INSERT INTO otp_orders (
    order_no, quotation_no, timestamp, company_name, contact_person_name,
    contact_number, billing_address, shipping_address, payment_mode,
    payment_terms_days, reference_name, email, transport_mode, destination,
    po_number, quotation_copy_url, acceptance_copy_url, offer_show,
    conveyed_for_registration, total_order_qty, amount, gst_no, cre_name
  ) VALUES (
    'DO-4690', 'CRR-26-27-1890-01', '2026-08-26 08:10:04.742'::timestamptz, 'JHAJHARIA NIRMAN LIMITED U.P. KHAIRAHI CHOPAN KTC (S.A.)', 'Satyajeet',
    '9934447928', '120 danwar, kunti w/o pooran sing, near railway station, Danwar Railway Station, Danwar, Bulandshahr, Uttar Pradesh, 203132', '120 danwar, kunti w/o pooran sing, near railway station, Danwar Railway Station, Danwar, Bulandshahr, Uttar Pradesh, 203132', 'full on credit',
    30, 'GEETA BHIWAGADE', NULL, 'by transport', 'BILASPUR',
    'JNL/AUG/2026/HO-1518', 'https://nfwtbrmqvsejwwvraanf.supabase.co/storage/v1/object/public/quotation_image/Quotation_CRR-26-27-1890-01.pdf', 'https://nfwtbrmqvsejwwvraanf.supabase.co/storage/v1/object/public/acceptance_file_upload/1788150755169-devlsz4gejq.pdf', 'no',
    'No', 1.0, 14750.0, '09AABCJ9891J1ZU', 'GEETA'
  )
  ON CONFLICT (order_no) DO UPDATE SET
    company_name = EXCLUDED.company_name,
    total_order_qty = EXCLUDED.total_order_qty,
    amount = EXCLUDED.amount,
    updated_at = NOW()
  RETURNING id INTO v_order_id;
  DELETE FROM otp_order_items WHERE order_id = v_order_id;
  INSERT INTO otp_order_items (order_id, item_no, item_name, quantity) VALUES
    (v_order_id, 1, 'DFT METER', 1.0);

  -- Order #49: DO-4689 (Y.B. Constructions Pvt. Ltd.)
  INSERT INTO otp_orders (
    order_no, quotation_no, timestamp, company_name, contact_person_name,
    contact_number, billing_address, shipping_address, payment_mode,
    payment_terms_days, reference_name, email, transport_mode, destination,
    po_number, quotation_copy_url, acceptance_copy_url, offer_show,
    conveyed_for_registration, total_order_qty, amount, gst_no, cre_name
  ) VALUES (
    'DO-4689', 'NBD_CRR-26-27-600-01', '2026-08-29 09:38:04.219'::timestamptz, 'Y.B. Constructions Pvt. Ltd.', NULL,
    '9124634104', '1st Floor, N4/157, Nayapalli, IRC Village, Bhubaneswar, Khordha, Odisha, 751012', '1st Floor, N4/157, Nayapalli, IRC Village, Bhubaneswar, Khordha, Odisha, 751012', 'fullyadvance',
    1, 'NIKITA ROUT', NULL, 'by bus', 'Rourkela orrisha',
    NULL, 'https://nfwtbrmqvsejwwvraanf.supabase.co/storage/v1/object/public/quotation_image/Quotation_NBD_CRR-26-27-600-01.pdf', 'https://nfwtbrmqvsejwwvraanf.supabase.co/storage/v1/object/public/acceptance_file_upload/1788001641856-3q0je7yi66c.pdf', 'no',
    'No', 2000.0, 11800.0, '21AAACY2140C1Z5', 'NIKITA'
  )
  ON CONFLICT (order_no) DO UPDATE SET
    company_name = EXCLUDED.company_name,
    total_order_qty = EXCLUDED.total_order_qty,
    amount = EXCLUDED.amount,
    updated_at = NOW()
  RETURNING id INTO v_order_id;
  DELETE FROM otp_order_items WHERE order_id = v_order_id;
  INSERT INTO otp_order_items (order_id, item_no, item_name, quantity) VALUES
    (v_order_id, 1, 'DOWEL BAR SLEEVES', 2000.0);

  -- Order #50: DO-4688 (BALIRAM SINGH HARDWARE)
  INSERT INTO otp_orders (
    order_no, quotation_no, timestamp, company_name, contact_person_name,
    contact_number, billing_address, shipping_address, payment_mode,
    payment_terms_days, reference_name, email, transport_mode, destination,
    po_number, quotation_copy_url, acceptance_copy_url, offer_show,
    conveyed_for_registration, total_order_qty, amount, gst_no, cre_name
  ) VALUES (
    'DO-4688', 'NBD-26-27-800', '2026-08-20 06:50:03.182'::timestamptz, 'BALIRAM SINGH HARDWARE', 'Mr. Bhushan Ji',
    '9300648138', 'HARDWARE LINE, SUPELA MARKET, SUPELA BHILAI, Durg, Chhattisgarh, 490023', 'HARDWARE LINE, SUPELA MARKET, SUPELA BHILAI, Durg, Chhattisgarh, 490023', 'fullyadvance',
    1, 'CHAHAT PANDEY', NULL, 'by transport', 'CHHATTISGARH',
    'NBD-26-27-800', 'https://nfwtbrmqvsejwwvraanf.supabase.co/storage/v1/object/public/quotation_image/Quotation_NBD-26-27-800.pdf', 'https://nfwtbrmqvsejwwvraanf.supabase.co/storage/v1/object/public/acceptance_file_upload/1787987515719-9wngc8pj5n.pdf', 'no',
    'No', 600.0, 4743.6, '22CKKPS9961C1ZU', 'CHAHAT'
  )
  ON CONFLICT (order_no) DO UPDATE SET
    company_name = EXCLUDED.company_name,
    total_order_qty = EXCLUDED.total_order_qty,
    amount = EXCLUDED.amount,
    updated_at = NOW()
  RETURNING id INTO v_order_id;
  DELETE FROM otp_order_items WHERE order_id = v_order_id;
  INSERT INTO otp_order_items (order_id, item_no, item_name, quantity) VALUES
    (v_order_id, 1, 'FISCHER-ANCHOR-EA M8 N ZP-DROP-IN-ANCHOR', 600.0);

  -- Order #51: DO-4687 (KISHORE MACHINERIES-CG)
  INSERT INTO otp_orders (
    order_no, quotation_no, timestamp, company_name, contact_person_name,
    contact_number, billing_address, shipping_address, payment_mode,
    payment_terms_days, reference_name, email, transport_mode, destination,
    po_number, quotation_copy_url, acceptance_copy_url, offer_show,
    conveyed_for_registration, total_order_qty, amount, gst_no, cre_name
  ) VALUES (
    'DO-4687', 'CRR-26-27-1746-01', '2026-08-13 09:50:41.239'::timestamptz, 'KISHORE MACHINERIES-CG', 'MR. DHARMESH DESAI JI',
    '9827143218', 'Shop No. 143 Part, Station Road, Infornt Of Deshbandhu School, Gandhi Para, Raipur, Raipur, Chhattisgarh, 492009', 'Shop No. 143 Part, Station Road, Infornt Of Deshbandhu School, Gandhi Para, Raipur, Raipur, Chhattisgarh, 492009', 'fullyadvance',
    1, 'CHAHAT PANDEY', NULL, 'by hand-warehouse', 'Raipur',
    NULL, 'https://nfwtbrmqvsejwwvraanf.supabase.co/storage/v1/object/public/quotation_image/Quotation_CRR-26-27-1746-01.pdf', 'https://nfwtbrmqvsejwwvraanf.supabase.co/storage/v1/object/public/acceptance_file_upload/1787984193174-mra8k1aom1t.pdf', 'no',
    'No', 10.0, 109014.3, '22ABBFK9022A1Z1', 'GANGA'
  )
  ON CONFLICT (order_no) DO UPDATE SET
    company_name = EXCLUDED.company_name,
    total_order_qty = EXCLUDED.total_order_qty,
    amount = EXCLUDED.amount,
    updated_at = NOW()
  RETURNING id INTO v_order_id;
  DELETE FROM otp_order_items WHERE order_id = v_order_id;
  INSERT INTO otp_order_items (order_id, item_no, item_name, quantity) VALUES
    (v_order_id, 1, 'SOKKIA-AUTOMATIC LEVEL-B40A-D5', 10.0);

  -- Order #52: DO-4686 (MITHLESH MISHRA)
  INSERT INTO otp_orders (
    order_no, quotation_no, timestamp, company_name, contact_person_name,
    contact_number, billing_address, shipping_address, payment_mode,
    payment_terms_days, reference_name, email, transport_mode, destination,
    po_number, quotation_copy_url, acceptance_copy_url, offer_show,
    conveyed_for_registration, total_order_qty, amount, gst_no, cre_name
  ) VALUES (
    'DO-4686', 'CRR-26-27-1799-05', '2026-08-19 05:32:45.68'::timestamptz, 'MITHLESH MISHRA', 'Bipendra Ji',
    '8269960274', 'PLOT NO.14, ZONE-1, NEW ADARSH NAGAR, DURG, Durg, Chhattisgarh, 491001', 'PLOT NO.14, ZONE-1, NEW ADARSH NAGAR, DURG, Durg, Chhattisgarh, 491001', 'full on credit',
    1, 'NEERAJ SIR', NULL, 'by transport', 'Durg, Chhattisgarh, 491001',
    NULL, 'https://nfwtbrmqvsejwwvraanf.supabase.co/storage/v1/object/public/quotation_image/Quotation_CRR-26-27-1799-05.pdf', 'https://nfwtbrmqvsejwwvraanf.supabase.co/storage/v1/object/public/acceptance_file_upload/1787982196134-wuccl2gia88.pdf', 'no',
    'No', 2.0, 103412.25, '22AIOPM8639D1Z3', 'PRIYA'
  )
  ON CONFLICT (order_no) DO UPDATE SET
    company_name = EXCLUDED.company_name,
    total_order_qty = EXCLUDED.total_order_qty,
    amount = EXCLUDED.amount,
    updated_at = NOW()
  RETURNING id INTO v_order_id;
  DELETE FROM otp_order_items WHERE order_id = v_order_id;
  INSERT INTO otp_order_items (order_id, item_no, item_name, quantity) VALUES
    (v_order_id, 1, 'ManiQuip-CHANNEL TYPE COMPRESSION TESTING MACHINE DIGITAL DISPLAY-2000kN', 1.0),
    (v_order_id, 2, 'PACKAGING AND FORWARDING', 1.0);

  -- Order #53: DO-4685 (ABHILASHA ENTERPRISES -OD)
  INSERT INTO otp_orders (
    order_no, quotation_no, timestamp, company_name, contact_person_name,
    contact_number, billing_address, shipping_address, payment_mode,
    payment_terms_days, reference_name, email, transport_mode, destination,
    po_number, quotation_copy_url, acceptance_copy_url, offer_show,
    conveyed_for_registration, total_order_qty, amount, gst_no, cre_name
  ) VALUES (
    'DO-4685', 'CRR-26-27-1872-02', '2026-08-25 07:24:03.462'::timestamptz, 'ABHILASHA ENTERPRISES -OD', 'Mayank Ji',
    '7272844243', '65/7117, Gopabandhu Nagar, Semiliguda, Semiligurha, Koraput, Odisha, 764036', '65/7117, Gopabandhu Nagar, Semiliguda, Semiligurha, Koraput, Odisha, 764036', 'full on credit',
    3, 'PRIYA SWARNKAR', NULL, 'by transport', 'Odisha, 764036',
    NULL, 'https://nfwtbrmqvsejwwvraanf.supabase.co/storage/v1/object/public/quotation_image/Quotation_CRR-26-27-1872-02.pdf', 'https://nfwtbrmqvsejwwvraanf.supabase.co/storage/v1/object/public/acceptance_file_upload/1787835640976-wnvuhree54p.pdf', 'no',
    'No', 1.0, 79567.4, '21AWJPS7676R1ZG', 'PRIYA'
  )
  ON CONFLICT (order_no) DO UPDATE SET
    company_name = EXCLUDED.company_name,
    total_order_qty = EXCLUDED.total_order_qty,
    amount = EXCLUDED.amount,
    updated_at = NOW()
  RETURNING id INTO v_order_id;
  DELETE FROM otp_order_items WHERE order_id = v_order_id;
  INSERT INTO otp_order_items (order_id, item_no, item_name, quantity) VALUES
    (v_order_id, 1, 'ManiQuip-CONCRETE CUTTER DIESEL -5HP', 1.0);

  -- Order #54: DO-4684 (BARBARIK INFRA AND ASSOCIATES)
  INSERT INTO otp_orders (
    order_no, quotation_no, timestamp, company_name, contact_person_name,
    contact_number, billing_address, shipping_address, payment_mode,
    payment_terms_days, reference_name, email, transport_mode, destination,
    po_number, quotation_copy_url, acceptance_copy_url, offer_show,
    conveyed_for_registration, total_order_qty, amount, gst_no, cre_name
  ) VALUES (
    'DO-4684', 'NBD-26-27-838', '2026-08-27 11:46:45.901'::timestamptz, 'BARBARIK INFRA AND ASSOCIATES', 'Prateek Ji',
    '8319293398', 'EWS-44, NEAR SANSKRITIK BHAWAN, VAISHALI NAGAR, BHILAI, Durg, Chhattisgarh, 490023', 'Bemetra Chhattisgarh - 491335', 'fullyadvance',
    1, 'KANCHAN AKHILESH', NULL, 'by transport', 'Bemetra',
    NULL, 'https://nfwtbrmqvsejwwvraanf.supabase.co/storage/v1/object/public/quotation_image/Quotation_NBD-26-27-838.pdf', 'https://nfwtbrmqvsejwwvraanf.supabase.co/storage/v1/object/public/acceptance_file_upload/1787833733185-0h4rvepb2ymn.pdf', 'no',
    'No', 16.0, 6180.75, '22CHPPP9175F1ZV', 'GANGA'
  )
  ON CONFLICT (order_no) DO UPDATE SET
    company_name = EXCLUDED.company_name,
    total_order_qty = EXCLUDED.total_order_qty,
    amount = EXCLUDED.amount,
    updated_at = NOW()
  RETURNING id INTO v_order_id;
  DELETE FROM otp_order_items WHERE order_id = v_order_id;
  INSERT INTO otp_order_items (order_id, item_no, item_name, quantity) VALUES
    (v_order_id, 1, 'EXPANSION JOINT SHEET-20 MM-4X2FT', 15.0),
    (v_order_id, 2, 'PACKAGING AND FORWARDING', 1.0);

  -- Order #55: DO-4683 (SRISHTI ESTATES)
  INSERT INTO otp_orders (
    order_no, quotation_no, timestamp, company_name, contact_person_name,
    contact_number, billing_address, shipping_address, payment_mode,
    payment_terms_days, reference_name, email, transport_mode, destination,
    po_number, quotation_copy_url, acceptance_copy_url, offer_show,
    conveyed_for_registration, total_order_qty, amount, gst_no, cre_name
  ) VALUES (
    'DO-4683', 'CRR-26-27-1891-01', '2026-08-26 08:21:35.314'::timestamptz, 'SRISHTI ESTATES', 'KISHAN JI',
    '9131270650', '07 "SHIVAM" 2nd Floor,Jalvihar Colony
Behind Marine Drive Garden, Raipur (C.G.) - 492001', 'Near Vy Hospital Maheshwari Bhawan
Boriyakala Raipur
Contact Person: MR. ANIL VERMA
Mobile: 91 81202 78400
PO No:- 355', 'full on credit',
    7, 'PRIYA SWARNKAR', NULL, 'by hand-warehouse', 'Boriyakala Raipur',
    '355', 'https://nfwtbrmqvsejwwvraanf.supabase.co/storage/v1/object/public/quotation_image/Quotation_CRR-26-27-1891-01.pdf', 'https://nfwtbrmqvsejwwvraanf.supabase.co/storage/v1/object/public/acceptance_file_upload/1787831370302-zdtrj98xgm.pdf', 'no',
    'No', 6.0, 5723.0, '22AAMCS6848M1ZP', 'PRIYA'
  )
  ON CONFLICT (order_no) DO UPDATE SET
    company_name = EXCLUDED.company_name,
    total_order_qty = EXCLUDED.total_order_qty,
    amount = EXCLUDED.amount,
    updated_at = NOW()
  RETURNING id INTO v_order_id;
  DELETE FROM otp_order_items WHERE order_id = v_order_id;
  INSERT INTO otp_order_items (order_id, item_no, item_name, quantity) VALUES
    (v_order_id, 1, 'FISCHER-CHEMICAL-FIS V PLUS 360 S-IN', 5.0),
    (v_order_id, 2, 'CONVEX MIRROR 36"', 1.0);

  -- Order #56: DO-4682 (BARBARIK INFRA AND ASSOCIATES)
  INSERT INTO otp_orders (
    order_no, quotation_no, timestamp, company_name, contact_person_name,
    contact_number, billing_address, shipping_address, payment_mode,
    payment_terms_days, reference_name, email, transport_mode, destination,
    po_number, quotation_copy_url, acceptance_copy_url, offer_show,
    conveyed_for_registration, total_order_qty, amount, gst_no, cre_name
  ) VALUES (
    'DO-4682', 'NBD-26-27-799-07', '2026-08-20 05:27:48.374'::timestamptz, 'BARBARIK INFRA AND ASSOCIATES', 'Prateek Ji',
    '8319293398', 'EWS-44, NEAR SANSKRITIK BHAWAN, VAISHALI NAGAR, BHILAI, Durg, Chhattisgarh, 490023', 'Kanker, Chhattisgarh, India - 494334', 'fullyadvance',
    1, 'KANCHAN AKHILESH', NULL, 'by transport', 'Kanker',
    NULL, 'https://drive.google.com/file/d/1FDvvePGG-JtfuAAgriL0-Cb4EofsZn5V/view?usp=sharing', 'https://drive.google.com/file/d/1FDvvePGG-JtfuAAgriL0-Cb4EofsZn5V/view?usp=sharing', 'no',
    'No', 6.0, 46500.0, '22CHPPP9175F1ZV', 'GANGA'
  )
  ON CONFLICT (order_no) DO UPDATE SET
    company_name = EXCLUDED.company_name,
    total_order_qty = EXCLUDED.total_order_qty,
    amount = EXCLUDED.amount,
    updated_at = NOW()
  RETURNING id INTO v_order_id;
  DELETE FROM otp_order_items WHERE order_id = v_order_id;
  INSERT INTO otp_order_items (order_id, item_no, item_name, quantity) VALUES
    (v_order_id, 1, 'ManiQuip-MQMC300 MINI CRANE 300KG', 1.0),
    (v_order_id, 2, 'BUCKET 5%', 2.0),
    (v_order_id, 3, 'ManiQuip-MQMC1000 MINI CRANE 1000KG LITE', 1.0),
    (v_order_id, 4, 'BUCKET LITE 5%', 1.0),
    (v_order_id, 5, 'PACKAGING AND FORWARDING', 1.0);

  -- Order #57: DO-4681 (VANKAL CABLES AND TRANSMISSION LIMITED)
  INSERT INTO otp_orders (
    order_no, quotation_no, timestamp, company_name, contact_person_name,
    contact_number, billing_address, shipping_address, payment_mode,
    payment_terms_days, reference_name, email, transport_mode, destination,
    po_number, quotation_copy_url, acceptance_copy_url, offer_show,
    conveyed_for_registration, total_order_qty, amount, gst_no, cre_name
  ) VALUES (
    'DO-4681', 'CRR-26-27-1848-01', '2026-08-22 12:20:28.366'::timestamptz, 'VANKAL CABLES AND TRANSMISSION LIMITED', 'Akash Shukla Ji',
    '8285494485 / 9109130489', 'Khasra No-2, P.H. No.-10, Main Road Tilda, Village- Tandwa, Tehsil and Block- Tilda, Tandawa, Raipur, Chhattisgarh, 493116', 'Khasra No-2, P.H. No.-10, Main Road Tilda, Village- Tandwa, Tehsil and Block- Tilda, Tandawa, Raipur, Chhattisgarh, 493116', 'fullyadvance',
    1, 'NIKITA ROUT', NULL, 'by hand-warehouse', 'Tilda',
    'CW/PO/26-27/0502', 'https://nfwtbrmqvsejwwvraanf.supabase.co/storage/v1/object/public/quotation_image/Quotation_CRR-26-27-1848-01.pdf', 'https://nfwtbrmqvsejwwvraanf.supabase.co/storage/v1/object/public/acceptance_file_upload/1787828988329-9f3apvdioo6.pdf', 'no',
    'No', 100.0, 20768.0, '22AAHCV0901D1Z0', 'NIKITA'
  )
  ON CONFLICT (order_no) DO UPDATE SET
    company_name = EXCLUDED.company_name,
    total_order_qty = EXCLUDED.total_order_qty,
    amount = EXCLUDED.amount,
    updated_at = NOW()
  RETURNING id INTO v_order_id;
  DELETE FROM otp_order_items WHERE order_id = v_order_id;
  INSERT INTO otp_order_items (order_id, item_no, item_name, quantity) VALUES
    (v_order_id, 1, 'FISCHER-FBN II 16/25 16X145', 100.0);

  -- Order #58: DO-4680 (HARDWARE STUDIO)
  INSERT INTO otp_orders (
    order_no, quotation_no, timestamp, company_name, contact_person_name,
    contact_number, billing_address, shipping_address, payment_mode,
    payment_terms_days, reference_name, email, transport_mode, destination,
    po_number, quotation_copy_url, acceptance_copy_url, offer_show,
    conveyed_for_registration, total_order_qty, amount, gst_no, cre_name
  ) VALUES (
    'DO-4680', 'CRR-26-27-1892', '2026-08-26 08:29:57.3'::timestamptz, 'HARDWARE STUDIO', 'ASHOK JI',
    '701427946', 'GROUND FLOOR, SHOP NO. 16, KUMAR BEN KARSAN BHAI CHEMBER, LAL CHOWK, DEVENDRA NAGAR RAIPUR, Raipur, Chhattisgarh, 492001', 'GROUND FLOOR, SHOP NO. 16, KUMAR BEN KARSAN BHAI CHEMBER, LAL CHOWK, DEVENDRA NAGAR RAIPUR, Raipur, Chhattisgarh, 492001', 'fullyadvance',
    1, 'AMAY SWARNKAR', NULL, 'by hand maniquip store', 'Raipur',
    NULL, 'https://nfwtbrmqvsejwwvraanf.supabase.co/storage/v1/object/public/quotation_image/Quotation_CRR-26-27-1892.pdf', 'https://nfwtbrmqvsejwwvraanf.supabase.co/storage/v1/object/public/acceptance_file_upload/1787828438504-5a4r5cwckz7.pdf', 'no',
    'No', 1.0, 1475.0, '22BKPPG9089P1Z8', 'GANGA'
  )
  ON CONFLICT (order_no) DO UPDATE SET
    company_name = EXCLUDED.company_name,
    total_order_qty = EXCLUDED.total_order_qty,
    amount = EXCLUDED.amount,
    updated_at = NOW()
  RETURNING id INTO v_order_id;
  DELETE FROM otp_order_items WHERE order_id = v_order_id;
  INSERT INTO otp_order_items (order_id, item_no, item_name, quantity) VALUES
    (v_order_id, 1, 'GUN 360ML HEAVY DUTY FISCHER TYPE', 1.0);

  -- Order #59: DO-4679 (ESHWAR ENTERPRISES)
  INSERT INTO otp_orders (
    order_no, quotation_no, timestamp, company_name, contact_person_name,
    contact_number, billing_address, shipping_address, payment_mode,
    payment_terms_days, reference_name, email, transport_mode, destination,
    po_number, quotation_copy_url, acceptance_copy_url, offer_show,
    conveyed_for_registration, total_order_qty, amount, gst_no, cre_name
  ) VALUES (
    'DO-4679', 'CRR-26-27-1820', '2026-08-20 13:14:28.2'::timestamptz, 'ESHWAR ENTERPRISES', 'Aayush Ji',
    '6264080577', '0, ESHWAR ENTERPRISES, STATION ROAD, OPPOSITE DESHBANDHU SCHOOL, Raipur, Chhattisgarh, 492001', '0, ESHWAR ENTERPRISES, STATION ROAD, OPPOSITE DESHBANDHU SCHOOL, Raipur, Chhattisgarh, 492001', 'pdc',
    1, 'HIRU RAM NISHAD', NULL, 'by hand maniquip store', 'Raipur',
    NULL, 'https://nfwtbrmqvsejwwvraanf.supabase.co/storage/v1/object/public/quotation_image/Quotation_CRR-26-27-1820.pdf', 'https://nfwtbrmqvsejwwvraanf.supabase.co/storage/v1/object/public/acceptance_file_upload/1787827728145-bq05b2mjjib.pdf', 'no',
    'No', 15.0, 16107.0, '22ACNPR5986R1ZF', 'GANGA'
  )
  ON CONFLICT (order_no) DO UPDATE SET
    company_name = EXCLUDED.company_name,
    total_order_qty = EXCLUDED.total_order_qty,
    amount = EXCLUDED.amount,
    updated_at = NOW()
  RETURNING id INTO v_order_id;
  DELETE FROM otp_order_items WHERE order_id = v_order_id;
  INSERT INTO otp_order_items (order_id, item_no, item_name, quantity) VALUES
    (v_order_id, 1, 'FISCHER-CHEMICAL-FIS V PLUS 360 S-IN', 15.0);

  -- Order #60: DO-4678 (SHREE SAI POWERTOOLS AND HARDWARE)
  INSERT INTO otp_orders (
    order_no, quotation_no, timestamp, company_name, contact_person_name,
    contact_number, billing_address, shipping_address, payment_mode,
    payment_terms_days, reference_name, email, transport_mode, destination,
    po_number, quotation_copy_url, acceptance_copy_url, offer_show,
    conveyed_for_registration, total_order_qty, amount, gst_no, cre_name
  ) VALUES (
    'DO-4678', 'CRR-26-27-1901', '2026-08-27 09:59:32.637'::timestamptz, 'SHREE SAI POWERTOOLS AND HARDWARE', 'PIYUSH AGRAWAL JI',
    '8823061655', 'IN FRONT CHANDRAKAR CHATRAWAS, Mahadev Ghat Road, Maitri Nagar, Raipur, Raipur, Chhattisgarh, 492013', 'IN FRONT CHANDRAKAR CHATRAWAS, Mahadev Ghat Road, Maitri Nagar, Raipur, Raipur, Chhattisgarh, 492013', 'fullyadvance',
    1, 'AMAY SWARNKAR', NULL, 'by hand maniquip store', 'raipur',
    NULL, 'https://nfwtbrmqvsejwwvraanf.supabase.co/storage/v1/object/public/quotation_image/Quotation_CRR-26-27-1901.pdf', 'https://nfwtbrmqvsejwwvraanf.supabase.co/storage/v1/object/public/acceptance_file_upload/1787827700411-4uj84cz9myn.jpeg', 'no',
    'No', 20.0, 21004.0, '22ALRPA8932F1Z6', 'NIKITA'
  )
  ON CONFLICT (order_no) DO UPDATE SET
    company_name = EXCLUDED.company_name,
    total_order_qty = EXCLUDED.total_order_qty,
    amount = EXCLUDED.amount,
    updated_at = NOW()
  RETURNING id INTO v_order_id;
  DELETE FROM otp_order_items WHERE order_id = v_order_id;
  INSERT INTO otp_order_items (order_id, item_no, item_name, quantity) VALUES
    (v_order_id, 1, 'FISCHER-CHEMICAL-FIS V PLUS 360 S-IN', 20.0);

  -- Order #61: DO-4677 (GREY INFRA PRIVATE LIMITED)
  INSERT INTO otp_orders (
    order_no, quotation_no, timestamp, company_name, contact_person_name,
    contact_number, billing_address, shipping_address, payment_mode,
    payment_terms_days, reference_name, email, transport_mode, destination,
    po_number, quotation_copy_url, acceptance_copy_url, offer_show,
    conveyed_for_registration, total_order_qty, amount, gst_no, cre_name
  ) VALUES (
    'DO-4677', 'CRR-26-27-1855-02', '2026-08-24 08:36:09.086'::timestamptz, 'GREY INFRA PRIVATE LIMITED', 'Sandip Singh Ji',
    '9568845717', 'GROUND AND FIRST, 14-A, 0, Bhosa Road, NEAR ISHWAR NAGAR, BHOSA, Yavatmal, Yavatmal, Maharashtra, 445002', 'Beed Maharashtra, India - 431122', 'full on credit',
    7, 'PRANAV VINAYAKRAO BHOGAWAR', NULL, 'by bus', 'Nagpur, MH',
    NULL, 'https://nfwtbrmqvsejwwvraanf.supabase.co/storage/v1/object/public/quotation_image/Quotation_CRR-26-27-1855-02.pdf', 'https://nfwtbrmqvsejwwvraanf.supabase.co/storage/v1/object/public/acceptance_file_upload/1787825594759-d23sk6p7ah.pdf', 'no',
    'No', 2.0, 1274.4, '27AALCG6848E1Z9', 'NIKITA'
  )
  ON CONFLICT (order_no) DO UPDATE SET
    company_name = EXCLUDED.company_name,
    total_order_qty = EXCLUDED.total_order_qty,
    amount = EXCLUDED.amount,
    updated_at = NOW()
  RETURNING id INTO v_order_id;
  DELETE FROM otp_order_items WHERE order_id = v_order_id;
  INSERT INTO otp_order_items (order_id, item_no, item_name, quantity) VALUES
    (v_order_id, 1, 'WIRE BASKET', 1.0),
    (v_order_id, 2, 'PLASTIC MEASURING CYLINDER-100ML', 1.0);

  -- Order #62: DO-4676 (SUDHAMA NUT BOLT HOUSE)
  INSERT INTO otp_orders (
    order_no, quotation_no, timestamp, company_name, contact_person_name,
    contact_number, billing_address, shipping_address, payment_mode,
    payment_terms_days, reference_name, email, transport_mode, destination,
    po_number, quotation_copy_url, acceptance_copy_url, offer_show,
    conveyed_for_registration, total_order_qty, amount, gst_no, cre_name
  ) VALUES (
    'DO-4676', 'CRR-26-27-1854', '2026-08-24 08:10:49.796'::timestamptz, 'SUDHAMA NUT BOLT HOUSE', 'Krishna Ji',
    '8770646918', '0, 5, NEW BOMBAY MARKET, G.E.ROAD, RAIPUR, Raipur, Chhattisgarh, 492001', '0, 5, NEW BOMBAY MARKET, G.E.ROAD, RAIPUR, Raipur, Chhattisgarh, 492001', 'full on credit',
    30, 'KHUSHI KHEMANI', NULL, 'by hand-warehouse', 'Raipur',
    NULL, 'https://nfwtbrmqvsejwwvraanf.supabase.co/storage/v1/object/public/quotation_image/Quotation_CRR-26-27-1854.pdf', 'https://nfwtbrmqvsejwwvraanf.supabase.co/storage/v1/object/public/acceptance_file_upload/1787820636904-k408lpygzbk.pdf', 'no',
    'No', 1500.0, 16372.5, '22AEYPK1466L1Z0', 'GANGA'
  )
  ON CONFLICT (order_no) DO UPDATE SET
    company_name = EXCLUDED.company_name,
    total_order_qty = EXCLUDED.total_order_qty,
    amount = EXCLUDED.amount,
    updated_at = NOW()
  RETURNING id INTO v_order_id;
  DELETE FROM otp_order_items WHERE order_id = v_order_id;
  INSERT INTO otp_order_items (order_id, item_no, item_name, quantity) VALUES
    (v_order_id, 1, 'FISCHER-ANCHOR-EA M10 N ZP-DROP-IN-ANCHOR', 1500.0);

  -- Order #63: DO-4675 (AVINASH DEVELOPERS PRIVATE LIMITED)
  INSERT INTO otp_orders (
    order_no, quotation_no, timestamp, company_name, contact_person_name,
    contact_number, billing_address, shipping_address, payment_mode,
    payment_terms_days, reference_name, email, transport_mode, destination,
    po_number, quotation_copy_url, acceptance_copy_url, offer_show,
    conveyed_for_registration, total_order_qty, amount, gst_no, cre_name
  ) VALUES (
    'DO-4675', 'CRR-26-27-1814-01', '2026-08-20 05:54:50.637'::timestamptz, 'AVINASH DEVELOPERS PRIVATE LIMITED', 'Jitendra Ji',
    '9358390514', '1ST FLOOR, MARUTI BUSINESS PARK, AVINASH HOUSE, G.E. ROAD, RAIPUR, Raipur, Chhattisgarh, 492001', '1ST FLOOR, MARUTI BUSINESS PARK, AVINASH HOUSE, G.E. ROAD, RAIPUR, Raipur, Chhattisgarh, 492001', 'full on credit',
    30, 'PRIYANKA VISHWAS', NULL, 'by hand-warehouse', 'RAIPUR CHHATTISGARH-492001',
    'AEMPOINDENT/00081/26-27', 'https://nfwtbrmqvsejwwvraanf.supabase.co/storage/v1/object/public/quotation_image/Quotation_CRR-26-27-1814-01.pdf', 'https://nfwtbrmqvsejwwvraanf.supabase.co/storage/v1/object/public/acceptance_file_upload/1787817494241-ikq3yw8tf4c.pdf', 'no',
    'No', 10.0, 15930.0, '22AADCA4060E1ZD', 'NIKITA'
  )
  ON CONFLICT (order_no) DO UPDATE SET
    company_name = EXCLUDED.company_name,
    total_order_qty = EXCLUDED.total_order_qty,
    amount = EXCLUDED.amount,
    updated_at = NOW()
  RETURNING id INTO v_order_id;
  DELETE FROM otp_order_items WHERE order_id = v_order_id;
  INSERT INTO otp_order_items (order_id, item_no, item_name, quantity) VALUES
    (v_order_id, 1, 'FISCHER-CHEMICAL-INJECTION MORTAR FIS EM PLUS 585 S', 10.0);

  -- Order #64: DO-4674 (ANSH ENGINEERING)
  INSERT INTO otp_orders (
    order_no, quotation_no, timestamp, company_name, contact_person_name,
    contact_number, billing_address, shipping_address, payment_mode,
    payment_terms_days, reference_name, email, transport_mode, destination,
    po_number, quotation_copy_url, acceptance_copy_url, offer_show,
    conveyed_for_registration, total_order_qty, amount, gst_no, cre_name
  ) VALUES (
    'DO-4674', 'CRR-26-27-1873-01', '2026-08-25 08:12:03.629'::timestamptz, 'ANSH ENGINEERING', 'Purushottam Ji',
    '8889568295', 'WARD NO - 2, ASHOK NAGAR, Raipur, Raipur, Chhattisgarh, 492001', 'WARD NO - 2, ASHOK NAGAR, Raipur, Raipur, Chhattisgarh, 492001', 'pdc',
    1, 'PRIYA SWARNKAR', NULL, 'by hand-warehouse', 'Raipur',
    NULL, 'https://nfwtbrmqvsejwwvraanf.supabase.co/storage/v1/object/public/quotation_image/Quotation_CRR-26-27-1873-01.pdf', 'https://nfwtbrmqvsejwwvraanf.supabase.co/storage/v1/object/public/acceptance_file_upload/1787814482472-srwzas5meid.pdf', 'no',
    'No', 16.0, 8142.0, '22AJVPU6510F1Z0', 'GANGA'
  )
  ON CONFLICT (order_no) DO UPDATE SET
    company_name = EXCLUDED.company_name,
    total_order_qty = EXCLUDED.total_order_qty,
    amount = EXCLUDED.amount,
    updated_at = NOW()
  RETURNING id INTO v_order_id;
  DELETE FROM otp_order_items WHERE order_id = v_order_id;
  INSERT INTO otp_order_items (order_id, item_no, item_name, quantity) VALUES
    (v_order_id, 1, 'FISCHER-50288/RGM 16X250 THREADED ROD', 16.0);

  -- Order #65: DO-4673 (CHEVROX CONSTRUCTIONS PRIVATE LIMITED- OD)
  INSERT INTO otp_orders (
    order_no, quotation_no, timestamp, company_name, contact_person_name,
    contact_number, billing_address, shipping_address, payment_mode,
    payment_terms_days, reference_name, email, transport_mode, destination,
    po_number, quotation_copy_url, acceptance_copy_url, offer_show,
    conveyed_for_registration, total_order_qty, amount, gst_no, cre_name
  ) VALUES (
    'DO-4673', 'NBD_CRR-26-27-584-01', '2026-08-25 12:55:22.16'::timestamptz, 'CHEVROX CONSTRUCTIONS PRIVATE LIMITED- OD', 'Pinak Ji',
    '9727767356', 'C/56, Palaspalli Colony Road, Heifer International Odisha Office, Palashpalli, Bhubaneswar, Khordha, Odisha, 751020', 'C/56, Palaspalli Colony Road, Heifer International Odisha Office, Palashpalli, Bhubaneswar, Khordha, Odisha, 751020', 'full on credit',
    7, 'GEETA BHIWAGADE', NULL, 'by transport', 'KABIR NAGAR',
    'PO No : ODIPO26/501007', 'https://nfwtbrmqvsejwwvraanf.supabase.co/storage/v1/object/public/quotation_image/Quotation_NBD_CRR-26-27-584-01.pdf', 'https://nfwtbrmqvsejwwvraanf.supabase.co/storage/v1/object/public/acceptance_file_upload/1787748666853-rncr37v30t.pdf', 'yes',
    'No', 3.0, 222430.0, '21AAGCM7457A1ZT', 'GEETA'
  )
  ON CONFLICT (order_no) DO UPDATE SET
    company_name = EXCLUDED.company_name,
    total_order_qty = EXCLUDED.total_order_qty,
    amount = EXCLUDED.amount,
    updated_at = NOW()
  RETURNING id INTO v_order_id;
  DELETE FROM otp_order_items WHERE order_id = v_order_id;
  INSERT INTO otp_order_items (order_id, item_no, item_name, quantity) VALUES
    (v_order_id, 1, 'ManiQuip DOUBLE DRUM WALK BEHIND ROLLER - MQR 2500 UT', 1.0),
    (v_order_id, 2, 'HYDRAULIC OIL 68no', 1.0),
    (v_order_id, 3, 'PACKAGING AND FORWARDING', 1.0);

  -- Order #66: DO-4672 (RATNA ENGINEERING AND RCC WORKS - 10933)
  INSERT INTO otp_orders (
    order_no, quotation_no, timestamp, company_name, contact_person_name,
    contact_number, billing_address, shipping_address, payment_mode,
    payment_terms_days, reference_name, email, transport_mode, destination,
    po_number, quotation_copy_url, acceptance_copy_url, offer_show,
    conveyed_for_registration, total_order_qty, amount, gst_no, cre_name
  ) VALUES (
    'DO-4672', 'CRR-26-27-1894', '2026-08-26 11:43:36.981'::timestamptz, 'RATNA ENGINEERING AND RCC WORKS - 10933', 'Mr. Abhishek Ji',
    '9669796000', 'SHOP NO 19, PRAKASH BHAWN, INFRONT OF KANKALI TALAB, KANKALI PARA, RAIPUR, Raipur, Chhattisgarh, 492001', 'SHOP NO 19, PRAKASH BHAWN, INFRONT OF KANKALI TALAB, KANKALI PARA, RAIPUR, Raipur, Chhattisgarh, 492001', 'full on credit',
    15, 'SARITA BAGHEL', NULL, 'by hand-warehouse', 'Raipur',
    NULL, 'https://nfwtbrmqvsejwwvraanf.supabase.co/storage/v1/object/public/quotation_image/Quotation_CRR-26-27-1894.pdf', 'https://nfwtbrmqvsejwwvraanf.supabase.co/storage/v1/object/public/acceptance_file_upload/1787746032578-emlyc0ko2ik.pdf', 'no',
    'No', 10.0, 11092.0, '22CAFPS2872B1ZY', 'GANGA'
  )
  ON CONFLICT (order_no) DO UPDATE SET
    company_name = EXCLUDED.company_name,
    total_order_qty = EXCLUDED.total_order_qty,
    amount = EXCLUDED.amount,
    updated_at = NOW()
  RETURNING id INTO v_order_id;
  DELETE FROM otp_order_items WHERE order_id = v_order_id;
  INSERT INTO otp_order_items (order_id, item_no, item_name, quantity) VALUES
    (v_order_id, 1, 'FISCHER- G M20X1000 8.8 ZP THREADED ROD', 10.0);

  -- Order #67: DO-4671 (PUNJAB IRON STORES)
  INSERT INTO otp_orders (
    order_no, quotation_no, timestamp, company_name, contact_person_name,
    contact_number, billing_address, shipping_address, payment_mode,
    payment_terms_days, reference_name, email, transport_mode, destination,
    po_number, quotation_copy_url, acceptance_copy_url, offer_show,
    conveyed_for_registration, total_order_qty, amount, gst_no, cre_name
  ) VALUES (
    'DO-4671', 'CRR-26-27-1819-01', '2026-08-20 12:51:55.062'::timestamptz, 'PUNJAB IRON STORES', 'Mr. Ritesh Ji',
    '9179180443', 'GOL BAZAR, BILASPUR, BILASPUR, Bilaspur, Chhattisgarh, 495001', 'GOL BAZAR, BILASPUR, BILASPUR, Bilaspur, Chhattisgarh, 495001', 'full on credit',
    15, 'KHUSHI KHEMANI', NULL, 'by transport', 'Bilaspur',
    NULL, 'https://nfwtbrmqvsejwwvraanf.supabase.co/storage/v1/object/public/quotation_image/Quotation_CRR-26-27-1819-01.pdf', 'https://nfwtbrmqvsejwwvraanf.supabase.co/storage/v1/object/public/acceptance_file_upload/1787745381811-pcag9hmucp.pdf', 'no',
    'No', 1625.0, 82482.0, '22AEZPJ4665D1ZA', 'GANGA'
  )
  ON CONFLICT (order_no) DO UPDATE SET
    company_name = EXCLUDED.company_name,
    total_order_qty = EXCLUDED.total_order_qty,
    amount = EXCLUDED.amount,
    updated_at = NOW()
  RETURNING id INTO v_order_id;
  DELETE FROM otp_order_items WHERE order_id = v_order_id;
  INSERT INTO otp_order_items (order_id, item_no, item_name, quantity) VALUES
    (v_order_id, 1, 'FISCHER-ANCHOR-SXR 10X100 T', 300.0),
    (v_order_id, 2, 'FISCHER-ANCHOR-SXR 10X120 T', 500.0),
    (v_order_id, 3, 'FISCHER-ANCHOR-FWA 12X100', 125.0),
    (v_order_id, 4, 'FISCHER-ANCHOR-FWA 12X150', 150.0),
    (v_order_id, 5, 'FISCHER-ANCHOR-RGM 16X190 THREADED ROD', 50.0),
    (v_order_id, 6, 'FISCHER-ANCHOR-EA M12 N ZP-DROP-IN-ANCHOR', 500.0);

  -- Order #68: DO-4670 (SARVAMANGALA BUILDERS-MP)
  INSERT INTO otp_orders (
    order_no, quotation_no, timestamp, company_name, contact_person_name,
    contact_number, billing_address, shipping_address, payment_mode,
    payment_terms_days, reference_name, email, transport_mode, destination,
    po_number, quotation_copy_url, acceptance_copy_url, offer_show,
    conveyed_for_registration, total_order_qty, amount, gst_no, cre_name
  ) VALUES (
    'DO-4670', 'CRR-26-27-1886-01', '2026-08-26 06:25:44.615'::timestamptz, 'SARVAMANGALA BUILDERS-MP', 'Ajay Ji',
    '7999678467', 'BLOCK B-1, FLAT NO. 402, PLASH PARISAR-3, AB by pass road, NEAR OMAXE HILLS, Indore, Indore, Madhya Pradesh, 452020', 'BLOCK B-1, FLAT NO. 402, PLASH PARISAR-3, AB by pass road, NEAR OMAXE HILLS, Indore, Indore, Madhya Pradesh, 452020', 'full on credit',
    30, 'PRIYA SWARNKAR', NULL, 'by transport', 'REWA (MP) 486001',
    'SW/SMC-191/AUG/2026', 'https://nfwtbrmqvsejwwvraanf.supabase.co/storage/v1/object/public/quotation_image/Quotation_CRR-26-27-1886-01.pdf', 'https://nfwtbrmqvsejwwvraanf.supabase.co/storage/v1/object/public/acceptance_file_upload/1787743067631-8nznbxa74gg.pdf', 'no',
    'No', 1500.0, 22951.0, '23ABLFS2781G1Z1', 'PRIYA'
  )
  ON CONFLICT (order_no) DO UPDATE SET
    company_name = EXCLUDED.company_name,
    total_order_qty = EXCLUDED.total_order_qty,
    amount = EXCLUDED.amount,
    updated_at = NOW()
  RETURNING id INTO v_order_id;
  DELETE FROM otp_order_items WHERE order_id = v_order_id;
  INSERT INTO otp_order_items (order_id, item_no, item_name, quantity) VALUES
    (v_order_id, 1, 'FISCHER-ANCHOR-EA M10 N ZP-DROP-IN-ANCHOR', 1000.0),
    (v_order_id, 2, 'FISCHER-ANCHOR-EA M12 N ZP-DROP-IN-ANCHOR', 500.0);

  -- Order #69: DO-4669 (Fortune Resources & Properties LLP)
  INSERT INTO otp_orders (
    order_no, quotation_no, timestamp, company_name, contact_person_name,
    contact_number, billing_address, shipping_address, payment_mode,
    payment_terms_days, reference_name, email, transport_mode, destination,
    po_number, quotation_copy_url, acceptance_copy_url, offer_show,
    conveyed_for_registration, total_order_qty, amount, gst_no, cre_name
  ) VALUES (
    'DO-4669', 'CRR-26-27-1878-01', '2026-08-25 12:23:37.005'::timestamptz, 'Fortune Resources & Properties LLP', 'Yakesh Ji',
    '9907972033', 'Rama High Street Shop No.- G-26 & 27, Near MGM Eye Hospital Vidhan Sabha Road, Ama Seoni, Raipur, Raipur, Chhattisgarh, 492005', 'Rama High Street Shop No.- G-26 & 27, Near MGM Eye Hospital Vidhan Sabha Road, Ama Seoni, Raipur, Raipur, Chhattisgarh, 492005', 'full on credit',
    30, 'NIKITA ROUT', NULL, 'by hand-warehouse', 'Raipur',
    'RWGPOIND/00922/26-27', 'https://nfwtbrmqvsejwwvraanf.supabase.co/storage/v1/object/public/quotation_image/Quotation_CRR-26-27-1878-01.pdf', 'https://nfwtbrmqvsejwwvraanf.supabase.co/storage/v1/object/public/acceptance_file_upload/1787734705020-jbottrzzgza.jpeg', 'no',
    'No', 325.0, 22066.0, '22AAHFF3097R1ZW', 'NIKITA'
  )
  ON CONFLICT (order_no) DO UPDATE SET
    company_name = EXCLUDED.company_name,
    total_order_qty = EXCLUDED.total_order_qty,
    amount = EXCLUDED.amount,
    updated_at = NOW()
  RETURNING id INTO v_order_id;
  DELETE FROM otp_order_items WHERE order_id = v_order_id;
  INSERT INTO otp_order_items (order_id, item_no, item_name, quantity) VALUES
    (v_order_id, 1, 'FISCHER-ANCHOR-FWA 12X120', 300.0),
    (v_order_id, 2, 'FISCHER-ANCHOR-FWA 12X100', 25.0);

  -- Order #70: DO-4668 (CHHATTISGARH MINERALS)
  INSERT INTO otp_orders (
    order_no, quotation_no, timestamp, company_name, contact_person_name,
    contact_number, billing_address, shipping_address, payment_mode,
    payment_terms_days, reference_name, email, transport_mode, destination,
    po_number, quotation_copy_url, acceptance_copy_url, offer_show,
    conveyed_for_registration, total_order_qty, amount, gst_no, cre_name
  ) VALUES (
    'DO-4668', 'NBD-26-27-829', '2026-08-26 08:17:00.191'::timestamptz, 'CHHATTISGARH MINERALS', 'TRIPAT PAL SINGH JI',
    '9977107700', 'VILLAGE DHANUSULI, KH. NO. 883, CHHATTISGARH MINERALS, TEH. ARANG, MANDIR HASAUD, New Raipur, Raipur, Chhattisgarh, 492101', 'VILLAGE DHANUSULI, KH. NO. 883, CHHATTISGARH MINERALS, TEH. ARANG, MANDIR HASAUD, New Raipur, Raipur, Chhattisgarh, 492101', 'fullyadvance',
    1, 'AMAY SWARNKAR', NULL, 'by hand maniquip store', 'raipur',
    NULL, 'https://nfwtbrmqvsejwwvraanf.supabase.co/storage/v1/object/public/quotation_image/Quotation_NBD-26-27-829.pdf', 'https://nfwtbrmqvsejwwvraanf.supabase.co/storage/v1/object/public/acceptance_file_upload/1787734027059-ktasecb7pup.jpeg', 'no',
    'No', 1.0, 1475.0, '22AJNPS2923E1ZB', 'GANGA'
  )
  ON CONFLICT (order_no) DO UPDATE SET
    company_name = EXCLUDED.company_name,
    total_order_qty = EXCLUDED.total_order_qty,
    amount = EXCLUDED.amount,
    updated_at = NOW()
  RETURNING id INTO v_order_id;
  DELETE FROM otp_order_items WHERE order_id = v_order_id;
  INSERT INTO otp_order_items (order_id, item_no, item_name, quantity) VALUES
    (v_order_id, 1, 'GUN 360ML HEAVY DUTY FISCHER TYPE', 1.0);

  -- Order #71: DO-4667 (POWER GROW SYSTEM (CG))
  INSERT INTO otp_orders (
    order_no, quotation_no, timestamp, company_name, contact_person_name,
    contact_number, billing_address, shipping_address, payment_mode,
    payment_terms_days, reference_name, email, transport_mode, destination,
    po_number, quotation_copy_url, acceptance_copy_url, offer_show,
    conveyed_for_registration, total_order_qty, amount, gst_no, cre_name
  ) VALUES (
    'DO-4667', 'CRR-26-27-1845-02', '2026-08-22 11:55:35.773'::timestamptz, 'POWER GROW SYSTEM (CG)', 'SURYA PRAKASH VERMA JI',
    '7974551773', 'Khasra No 316, Power Grow System, Post Gudheli Tehsil Berla, Gram Panchayat Kandarka, Kandarka, Kandarka, Bemetara, Chhattisgarh, 490036', 'Khasra No 316, Power Grow System, Post Gudheli Tehsil Berla, Gram Panchayat Kandarka, Kandarka, Kandarka, Bemetara, Chhattisgarh, 490036', 'pi against advance',
    1, 'GEETA BHIWAGADE', NULL, 'by transport', 'Bemetara, Chhattisgarh, 490036',
    NULL, 'https://nfwtbrmqvsejwwvraanf.supabase.co/storage/v1/object/public/quotation_image/Quotation_CRR-26-27-1845-02.pdf', 'https://nfwtbrmqvsejwwvraanf.supabase.co/storage/v1/object/public/acceptance_file_upload/1787724651374-2zurcyz18sx.pdf', 'no',
    'No', 40.0, 25417.0, '22AJGPP7758P2ZE', 'PRIYA'
  )
  ON CONFLICT (order_no) DO UPDATE SET
    company_name = EXCLUDED.company_name,
    total_order_qty = EXCLUDED.total_order_qty,
    amount = EXCLUDED.amount,
    updated_at = NOW()
  RETURNING id INTO v_order_id;
  DELETE FROM otp_order_items WHERE order_id = v_order_id;
  INSERT INTO otp_order_items (order_id, item_no, item_name, quantity) VALUES
    (v_order_id, 1, 'HILSON-SHOES-U4-07NO', 15.0),
    (v_order_id, 2, 'HILSON-SHOES-U4-08NO', 14.0),
    (v_order_id, 3, 'HILSON-SHOES-U4-09NO', 7.0),
    (v_order_id, 4, 'HILSON-SHOES-U4-10NO', 2.0),
    (v_order_id, 5, 'BOSCH-ANGLE GRINDER-GWS 750-100', 2.0);

  -- Order #72: DO-4666 (RAIPUR BOTTLING CO. PROP. RAIPUR BOTTLING PRIVATE LIMITED)
  INSERT INTO otp_orders (
    order_no, quotation_no, timestamp, company_name, contact_person_name,
    contact_number, billing_address, shipping_address, payment_mode,
    payment_terms_days, reference_name, email, transport_mode, destination,
    po_number, quotation_copy_url, acceptance_copy_url, offer_show,
    conveyed_for_registration, total_order_qty, amount, gst_no, cre_name
  ) VALUES (
    'DO-4666', 'CRR-26-27-1882', '2026-08-25 13:11:45.893'::timestamptz, 'RAIPUR BOTTLING CO. PROP. RAIPUR BOTTLING PRIVATE LIMITED', 'Rajesh Kushwaha Ji',
    '7869100320', 'VILLAGE BAHANAKADI, THANA MANDIR HASAUD, RAIPUR, Raipur, Chhattisgarh, 492101', 'RBPL bahnakhadi, Raipur', 'full on credit',
    3, 'NIKITA ROUT', NULL, 'by hand-warehouse', 'bahnakhadi',
    'AP/AUG/25-26/124', 'https://nfwtbrmqvsejwwvraanf.supabase.co/storage/v1/object/public/quotation_image/Quotation_CRR-26-27-1882.pdf', 'https://nfwtbrmqvsejwwvraanf.supabase.co/storage/v1/object/public/acceptance_file_upload/1787721897332-b0mmhtjqxbq.pdf', 'no',
    'No', 10.0, 24351.36, '22AAKCR0791E1ZJ', 'NIKITA'
  )
  ON CONFLICT (order_no) DO UPDATE SET
    company_name = EXCLUDED.company_name,
    total_order_qty = EXCLUDED.total_order_qty,
    amount = EXCLUDED.amount,
    updated_at = NOW()
  RETURNING id INTO v_order_id;
  DELETE FROM otp_order_items WHERE order_id = v_order_id;
  INSERT INTO otp_order_items (order_id, item_no, item_name, quantity) VALUES
    (v_order_id, 1, 'SLUMP CONE WITH TEMPING ROD', 1.0),
    (v_order_id, 2, 'CUBE MOULD ISI-150X150X150MM', 9.0);

  -- Order #73: DO-4665 (SONA BEVERAGES PRIVATE LIMITED)
  INSERT INTO otp_orders (
    order_no, quotation_no, timestamp, company_name, contact_person_name,
    contact_number, billing_address, shipping_address, payment_mode,
    payment_terms_days, reference_name, email, transport_mode, destination,
    po_number, quotation_copy_url, acceptance_copy_url, offer_show,
    conveyed_for_registration, total_order_qty, amount, gst_no, cre_name
  ) VALUES (
    'DO-4665', 'CRR-26-27-1883', '2026-08-25 13:18:41.132'::timestamptz, 'SONA BEVERAGES PRIVATE LIMITED', 'Rajesh Kushwaha Ji',
    '7869100320', '35/75, PUNJABI COLONY, KATORA TALAB, Raipur, Chhattisgarh, 492001', 'RASMADA, DURG, PO AP/26-27/126', 'full on credit',
    3, 'NIKITA ROUT', NULL, 'by hand-warehouse', 'RASMADA',
    'AP/26-27/126', 'https://nfwtbrmqvsejwwvraanf.supabase.co/storage/v1/object/public/quotation_image/Quotation_CRR-26-27-1883.pdf', 'https://nfwtbrmqvsejwwvraanf.supabase.co/storage/v1/object/public/acceptance_file_upload/1787721711098-8tqwa4hmf9h.pdf', 'no',
    'No', 1.0, 2460.89, '22AALCS2193L1Z2', 'NIKITA'
  )
  ON CONFLICT (order_no) DO UPDATE SET
    company_name = EXCLUDED.company_name,
    total_order_qty = EXCLUDED.total_order_qty,
    amount = EXCLUDED.amount,
    updated_at = NOW()
  RETURNING id INTO v_order_id;
  DELETE FROM otp_order_items WHERE order_id = v_order_id;
  INSERT INTO otp_order_items (order_id, item_no, item_name, quantity) VALUES
    (v_order_id, 1, 'SLUMP CONE WITH TEMPING ROD', 1.0);

  -- Order #74: DO-4664 (AUGUST PROJECTS)
  INSERT INTO otp_orders (
    order_no, quotation_no, timestamp, company_name, contact_person_name,
    contact_number, billing_address, shipping_address, payment_mode,
    payment_terms_days, reference_name, email, transport_mode, destination,
    po_number, quotation_copy_url, acceptance_copy_url, offer_show,
    conveyed_for_registration, total_order_qty, amount, gst_no, cre_name
  ) VALUES (
    'DO-4664', 'CRR-26-27-1857-02', '2026-08-24 09:37:03.195'::timestamptz, 'AUGUST PROJECTS', 'Rajesh Kushwaha Ji',
    '7869100320', '35/75, KATORA TALAB, RAIPUR, Raipur, Chhattisgarh, 492001', '35/75, KATORA TALAB, RAIPUR, Raipur, Chhattisgarh, 492001', 'full on credit',
    3, 'KHUSHI KHEMANI', NULL, 'by hand-warehouse', 'LABHANDI',
    'AP/26-27/125', 'https://nfwtbrmqvsejwwvraanf.supabase.co/storage/v1/object/public/quotation_image/Quotation_CRR-26-27-1857-02.pdf', 'https://nfwtbrmqvsejwwvraanf.supabase.co/storage/v1/object/public/acceptance_file_upload/1787721474547-vbhpv65ejrh.pdf', 'no',
    'No', 14.0, 17054.54, '22ABMFA9490P1ZP', 'NIKITA'
  )
  ON CONFLICT (order_no) DO UPDATE SET
    company_name = EXCLUDED.company_name,
    total_order_qty = EXCLUDED.total_order_qty,
    amount = EXCLUDED.amount,
    updated_at = NOW()
  RETURNING id INTO v_order_id;
  DELETE FROM otp_order_items WHERE order_id = v_order_id;
  INSERT INTO otp_order_items (order_id, item_no, item_name, quantity) VALUES
    (v_order_id, 1, 'SLUMP CONE WITH TEMPING ROD', 2.0),
    (v_order_id, 2, 'CUBE MOULD ISI-150X150X150MM', 12.0);

  -- Order #75: DO-4663 (PIDICON MECHANICAL WINNER)
  INSERT INTO otp_orders (
    order_no, quotation_no, timestamp, company_name, contact_person_name,
    contact_number, billing_address, shipping_address, payment_mode,
    payment_terms_days, reference_name, email, transport_mode, destination,
    po_number, quotation_copy_url, acceptance_copy_url, offer_show,
    conveyed_for_registration, total_order_qty, amount, gst_no, cre_name
  ) VALUES (
    'DO-4663', 'CRR-26-27-1881', '2026-08-25 12:42:23.661'::timestamptz, 'PIDICON MECHANICAL WINNER', 'DIPANKAR JI',
    '9732794584', 'BUILDING NO - 78, PREMISES - PARNASREE PALLY, ROAD - DWIJEN MUKHERJEE ROAD, CITY - KOLKATA, Kolkata, West Bengal, 700060', 'Raipur Chhattisgarh - 492001', 'fullyadvance',
    1, 'NIKITA ROUT', NULL, 'by hand maniquip store', 'Raipur',
    NULL, 'https://nfwtbrmqvsejwwvraanf.supabase.co/storage/v1/object/public/quotation_image/Quotation_CRR-26-27-1881.pdf', 'https://nfwtbrmqvsejwwvraanf.supabase.co/storage/v1/object/public/acceptance_file_upload/1787663265045-blodjd3o88.pdf', 'no',
    'No', 50.0, 2065.0, '19BZUPD8095E1ZQ', 'NIKITA'
  )
  ON CONFLICT (order_no) DO UPDATE SET
    company_name = EXCLUDED.company_name,
    total_order_qty = EXCLUDED.total_order_qty,
    amount = EXCLUDED.amount,
    updated_at = NOW()
  RETURNING id INTO v_order_id;
  DELETE FROM otp_order_items WHERE order_id = v_order_id;
  INSERT INTO otp_order_items (order_id, item_no, item_name, quantity) VALUES
    (v_order_id, 1, 'FISCHER-ANCHOR-FWA 10X95', 50.0);

  -- Order #76: DO-4662 (CREATIVE EARTHCON)
  INSERT INTO otp_orders (
    order_no, quotation_no, timestamp, company_name, contact_person_name,
    contact_number, billing_address, shipping_address, payment_mode,
    payment_terms_days, reference_name, email, transport_mode, destination,
    po_number, quotation_copy_url, acceptance_copy_url, offer_show,
    conveyed_for_registration, total_order_qty, amount, gst_no, cre_name
  ) VALUES (
    'DO-4662', 'NBD_CRR-26-27-543-02', '2026-08-17 06:30:10.38'::timestamptz, 'CREATIVE EARTHCON', 'RAJU JI',
    '7974830320', '103 B-BLOCK, SAI PARISAR, SHRIKANT VERMA MARG, BILASPUR, Bilaspur, Chhattisgarh, 495001', '103 B-BLOCK, SAI PARISAR, SHRIKANT VERMA MARG, BILASPUR, Bilaspur, Chhattisgarh, 495001', 'fullyadvance',
    1, 'NIKITA ROUT', NULL, 'by transport', 'BILASPUR',
    NULL, 'https://nfwtbrmqvsejwwvraanf.supabase.co/storage/v1/object/public/quotation_image/Quotation_NBD_CRR-26-27-543-02.pdf', 'https://nfwtbrmqvsejwwvraanf.supabase.co/storage/v1/object/public/acceptance_file_upload/1787663137759-yrazdf3y9l.pdf', 'no',
    'No', 3.0, 153400.0, '22ADZPT7841A1Z8', 'NIKITA'
  )
  ON CONFLICT (order_no) DO UPDATE SET
    company_name = EXCLUDED.company_name,
    total_order_qty = EXCLUDED.total_order_qty,
    amount = EXCLUDED.amount,
    updated_at = NOW()
  RETURNING id INTO v_order_id;
  DELETE FROM otp_order_items WHERE order_id = v_order_id;
  INSERT INTO otp_order_items (order_id, item_no, item_name, quantity) VALUES
    (v_order_id, 1, 'CTM-MANUAL-HAND OPERATED-2000KN', 1.0),
    (v_order_id, 2, 'ManiQuip-CHANNEL TYPE COMPRESSION TESTING MACHINE DIGITAL DISPLAY-2000kN', 1.0),
    (v_order_id, 3, 'PACKAGING AND FORWARDING', 1.0);

  -- Order #77: DO-4661 (ART STUDIO)
  INSERT INTO otp_orders (
    order_no, quotation_no, timestamp, company_name, contact_person_name,
    contact_number, billing_address, shipping_address, payment_mode,
    payment_terms_days, reference_name, email, transport_mode, destination,
    po_number, quotation_copy_url, acceptance_copy_url, offer_show,
    conveyed_for_registration, total_order_qty, amount, gst_no, cre_name
  ) VALUES (
    'DO-4661', 'CRR-26-27-1880', '2026-08-25 12:37:32.18'::timestamptz, 'ART STUDIO', 'SANJAY SINGH JI',
    '9826129944', 'Raipur Chhattisgarh -492001', 'Raipur Chhattisgarh -492001', 'fullyadvance',
    1, 'AMAY SWARNKAR', NULL, 'by hand maniquip store', 'raipur',
    NULL, 'https://nfwtbrmqvsejwwvraanf.supabase.co/storage/v1/object/public/quotation_image/Quotation_CRR-26-27-1880.pdf', 'https://nfwtbrmqvsejwwvraanf.supabase.co/storage/v1/object/public/acceptance_file_upload/1787662418077-ag38otcocve.jpg', 'no',
    'No', 307.0, 23652.9, NULL, 'GANGA'
  )
  ON CONFLICT (order_no) DO UPDATE SET
    company_name = EXCLUDED.company_name,
    total_order_qty = EXCLUDED.total_order_qty,
    amount = EXCLUDED.amount,
    updated_at = NOW()
  RETURNING id INTO v_order_id;
  DELETE FROM otp_order_items WHERE order_id = v_order_id;
  INSERT INTO otp_order_items (order_id, item_no, item_name, quantity) VALUES
    (v_order_id, 1, 'FISCHER-ANCHOR- SXR 10X160 T', 150.0),
    (v_order_id, 2, 'FISCHER-ANCHOR-SXR 10X180 T', 150.0),
    (v_order_id, 3, 'HANDGLOVES-COTTON-WHITE', 4.0),
    (v_order_id, 4, 'BOSCH-SDSplus hammer drill bit -1 10 X260', 3.0);

  -- Order #78: DO-4660 (M/S.SUMIT HARDWARE (OD))
  INSERT INTO otp_orders (
    order_no, quotation_no, timestamp, company_name, contact_person_name,
    contact_number, billing_address, shipping_address, payment_mode,
    payment_terms_days, reference_name, email, transport_mode, destination,
    po_number, quotation_copy_url, acceptance_copy_url, offer_show,
    conveyed_for_registration, total_order_qty, amount, gst_no, cre_name
  ) VALUES (
    'DO-4660', 'CRR-26-27-1865-01', '2026-08-24 12:41:27.528'::timestamptz, 'M/S.SUMIT HARDWARE (OD)', 'Amit Ji',
    '9937073305', 'AT- CLUBPARA, CLUBPARA, CLUBPARA, Balangir, Odisha, 767001', 'AT- CLUBPARA, CLUBPARA, CLUBPARA, Balangir, Odisha, 767001', 'full on credit',
    3, 'GEETA BHIWAGADE', NULL, 'by transport', 'Balangir',
    NULL, 'https://nfwtbrmqvsejwwvraanf.supabase.co/storage/v1/object/public/quotation_image/Quotation_CRR-26-27-1865-01.pdf', 'https://nfwtbrmqvsejwwvraanf.supabase.co/storage/v1/object/public/acceptance_file_upload/1787660175369-p8tvhfhidze.pdf', 'no',
    'No', 5000.0, 43660.0, '21ABZPA1949E1ZS', 'GANGA'
  )
  ON CONFLICT (order_no) DO UPDATE SET
    company_name = EXCLUDED.company_name,
    total_order_qty = EXCLUDED.total_order_qty,
    amount = EXCLUDED.amount,
    updated_at = NOW()
  RETURNING id INTO v_order_id;
  DELETE FROM otp_order_items WHERE order_id = v_order_id;
  INSERT INTO otp_order_items (order_id, item_no, item_name, quantity) VALUES
    (v_order_id, 1, 'FISCHER-ANCHOR-EA M10 N ZP-DROP-IN-ANCHOR', 5000.0);

  -- Order #79: DO-4659 (AQUAPLAST INFRAPROJECTS PRIVATE LIMITED-CG)
  INSERT INTO otp_orders (
    order_no, quotation_no, timestamp, company_name, contact_person_name,
    contact_number, billing_address, shipping_address, payment_mode,
    payment_terms_days, reference_name, email, transport_mode, destination,
    po_number, quotation_copy_url, acceptance_copy_url, offer_show,
    conveyed_for_registration, total_order_qty, amount, gst_no, cre_name
  ) VALUES (
    'DO-4659', 'CRR-26-27-1775-01', '2026-08-17 12:18:28.814'::timestamptz, 'AQUAPLAST INFRAPROJECTS PRIVATE LIMITED-CG', 'Ravindra Ji',
    '7828901011', 'Office Nos. 613-616, Magneto Mall, Waard No 28, Maharishi Valmiki Ward, N. H. 6, Magneto Mall Labhandi, Labhandi, Raipur, Raipur, Chhattisgarh, 492001', 'Comercial, Naya-raipur , Raipur, Chhattisgarh, India - 492013', 'fullyadvance',
    1, 'GEETA BHIWAGADE', NULL, 'by transport', 'BALODABAZAR',
    'CRR-26-27-1775-01', 'https://nfwtbrmqvsejwwvraanf.supabase.co/storage/v1/object/public/quotation_image/Quotation_CRR-26-27-1775-01.pdf', 'https://nfwtbrmqvsejwwvraanf.supabase.co/storage/v1/object/public/acceptance_file_upload/1787660016461-0pw9wrqsutqp.pdf', 'no',
    'No', 7.0, 8799.85, '22AAZCA9891R1ZB', 'GEETA'
  )
  ON CONFLICT (order_no) DO UPDATE SET
    company_name = EXCLUDED.company_name,
    total_order_qty = EXCLUDED.total_order_qty,
    amount = EXCLUDED.amount,
    updated_at = NOW()
  RETURNING id INTO v_order_id;
  DELETE FROM otp_order_items WHERE order_id = v_order_id;
  INSERT INTO otp_order_items (order_id, item_no, item_name, quantity) VALUES
    (v_order_id, 1, 'SLUMP CONE WITH TEMPING ROD', 1.0),
    (v_order_id, 2, 'CUBE MOULD-150X150X150MM', 6.0);

  -- Order #80: DO-4658 (S P COLDSTORAGE- DEBTORS)
  INSERT INTO otp_orders (
    order_no, quotation_no, timestamp, company_name, contact_person_name,
    contact_number, billing_address, shipping_address, payment_mode,
    payment_terms_days, reference_name, email, transport_mode, destination,
    po_number, quotation_copy_url, acceptance_copy_url, offer_show,
    conveyed_for_registration, total_order_qty, amount, gst_no, cre_name
  ) VALUES (
    'DO-4658', 'CRR-26-27-1876', '2026-08-25 10:31:50.338'::timestamptz, 'S P COLDSTORAGE- DEBTORS', 'Atul Ji',
    '9826170854', 'NEAR RAILWAY CROSSING, WRS COLONY, KHAMTARI, Raipur, Chhattisgarh, 492008', 'NEAR RAILWAY CROSSING, WRS COLONY, KHAMTARI, Raipur, Chhattisgarh, 492008', 'full on credit',
    15, 'PRIYA SWARNKAR', NULL, 'by hand-warehouse', 'Raipur, Chhattisgarh, 492008',
    NULL, 'https://nfwtbrmqvsejwwvraanf.supabase.co/storage/v1/object/public/quotation_image/Quotation_CRR-26-27-1876.pdf', 'https://nfwtbrmqvsejwwvraanf.supabase.co/storage/v1/object/public/acceptance_file_upload/1787655784657-br647s8j0mr.pdf', 'no',
    'No', 100.0, 1888.0, '22AAZFS1208F1Z9', 'PRIYA'
  )
  ON CONFLICT (order_no) DO UPDATE SET
    company_name = EXCLUDED.company_name,
    total_order_qty = EXCLUDED.total_order_qty,
    amount = EXCLUDED.amount,
    updated_at = NOW()
  RETURNING id INTO v_order_id;
  DELETE FROM otp_order_items WHERE order_id = v_order_id;
  INSERT INTO otp_order_items (order_id, item_no, item_name, quantity) VALUES
    (v_order_id, 1, 'BOSCH-CUTTING WHEEL 4"', 100.0);

  -- Order #81: DO-4657 (RATHI ASSOCIATES)
  INSERT INTO otp_orders (
    order_no, quotation_no, timestamp, company_name, contact_person_name,
    contact_number, billing_address, shipping_address, payment_mode,
    payment_terms_days, reference_name, email, transport_mode, destination,
    po_number, quotation_copy_url, acceptance_copy_url, offer_show,
    conveyed_for_registration, total_order_qty, amount, gst_no, cre_name
  ) VALUES (
    'DO-4657', 'CRR-26-27-1875', '2026-08-25 09:43:41.485'::timestamptz, 'RATHI ASSOCIATES', 'RAJNISH JI',
    '8871471008', 'GF, 20, LAKHE SCHOOL COMPLEX, GANDHI CHOWK, CHHOTAPARA, Raipur, Chhattisgarh, 492001', 'GF, 20, LAKHE SCHOOL COMPLEX, GANDHI CHOWK, CHHOTAPARA, Raipur, Chhattisgarh, 492001', 'fullyadvance',
    1, 'AMAY SWARNKAR', NULL, 'by hand maniquip store', 'raipur',
    NULL, 'https://nfwtbrmqvsejwwvraanf.supabase.co/storage/v1/object/public/quotation_image/Quotation_CRR-26-27-1875.pdf', 'https://nfwtbrmqvsejwwvraanf.supabase.co/storage/v1/object/public/acceptance_file_upload/1787654818453-8m2l2e7wga2.jpeg', 'no',
    'No', 2.0, 2348.2, '22ACNPR3970K1Z5', 'GANGA'
  )
  ON CONFLICT (order_no) DO UPDATE SET
    company_name = EXCLUDED.company_name,
    total_order_qty = EXCLUDED.total_order_qty,
    amount = EXCLUDED.amount,
    updated_at = NOW()
  RETURNING id INTO v_order_id;
  DELETE FROM otp_order_items WHERE order_id = v_order_id;
  INSERT INTO otp_order_items (order_id, item_no, item_name, quantity) VALUES
    (v_order_id, 1, 'FISCHER-CHEMICAL-FIS V PLUS 360 S-IN', 2.0);

  -- Order #82: DO-4656 (M/S. AVERT ENERGY INDIA PRIVATE LIMITED)
  INSERT INTO otp_orders (
    order_no, quotation_no, timestamp, company_name, contact_person_name,
    contact_number, billing_address, shipping_address, payment_mode,
    payment_terms_days, reference_name, email, transport_mode, destination,
    po_number, quotation_copy_url, acceptance_copy_url, offer_show,
    conveyed_for_registration, total_order_qty, amount, gst_no, cre_name
  ) VALUES (
    'DO-4656', 'NBD-26-27-824', '2026-08-25 09:49:38.089'::timestamptz, 'M/S. AVERT ENERGY INDIA PRIVATE LIMITED', 'PARASH JI',
    '8357995615', 'Plot No. 16, AVERT ENERGY INDIA PRIVATE LIMITED, Sector-22, ATAL NAGAR, NAYA RAIPUR, TUTA, Raipur, Raipur, Chhattisgarh, 492015', 'Plot No. 16, AVERT ENERGY INDIA PRIVATE LIMITED, Sector-22, ATAL NAGAR, NAYA RAIPUR, TUTA, Raipur, Raipur, Chhattisgarh, 492015', 'fullyadvance',
    1, 'AMAY SWARNKAR', NULL, 'by hand maniquip store', 'raipur',
    NULL, 'https://nfwtbrmqvsejwwvraanf.supabase.co/storage/v1/object/public/quotation_image/Quotation_NBD-26-27-824.pdf', 'https://nfwtbrmqvsejwwvraanf.supabase.co/storage/v1/object/public/acceptance_file_upload/1787652428930-3844gosc1hr.jpg', 'no',
    'No', 1.0, 2537.0, '22AANCA8044Q1Z6', 'GANGA'
  )
  ON CONFLICT (order_no) DO UPDATE SET
    company_name = EXCLUDED.company_name,
    total_order_qty = EXCLUDED.total_order_qty,
    amount = EXCLUDED.amount,
    updated_at = NOW()
  RETURNING id INTO v_order_id;
  DELETE FROM otp_order_items WHERE order_id = v_order_id;
  INSERT INTO otp_order_items (order_id, item_no, item_name, quantity) VALUES
    (v_order_id, 1, 'BOSCH-HEAT GUN-GHG 180', 1.0);

  -- Order #83: DO-4655 (M/S RAVYA ENTERPRISES)
  INSERT INTO otp_orders (
    order_no, quotation_no, timestamp, company_name, contact_person_name,
    contact_number, billing_address, shipping_address, payment_mode,
    payment_terms_days, reference_name, email, transport_mode, destination,
    po_number, quotation_copy_url, acceptance_copy_url, offer_show,
    conveyed_for_registration, total_order_qty, amount, gst_no, cre_name
  ) VALUES (
    'DO-4655', 'CRR-26-27-1874', '2026-08-25 09:36:03.312'::timestamptz, 'M/S RAVYA ENTERPRISES', 'JAGDISH JI',
    '7694988888', 'H-8,, INDIRA AWAS, WARD NO. 23,, TRIMURTI NAGAR,, RAIPUR, Raipur, Chhattisgarh, 492001', 'H-8,, INDIRA AWAS, WARD NO. 23,, TRIMURTI NAGAR,, RAIPUR, Raipur, Chhattisgarh, 492001', 'fullyadvance',
    1, 'AMAY SWARNKAR', NULL, 'by hand maniquip store', 'raipur',
    NULL, 'https://nfwtbrmqvsejwwvraanf.supabase.co/storage/v1/object/public/quotation_image/Quotation_CRR-26-27-1874.pdf', 'https://nfwtbrmqvsejwwvraanf.supabase.co/storage/v1/object/public/acceptance_file_upload/1787651433732-we9ljpcpylk.jpeg', 'no',
    'No', 3.0, 7021.0, '22AKDPP6224G1ZG', 'NIKITA'
  )
  ON CONFLICT (order_no) DO UPDATE SET
    company_name = EXCLUDED.company_name,
    total_order_qty = EXCLUDED.total_order_qty,
    amount = EXCLUDED.amount,
    updated_at = NOW()
  RETURNING id INTO v_order_id;
  DELETE FROM otp_order_items WHERE order_id = v_order_id;
  INSERT INTO otp_order_items (order_id, item_no, item_name, quantity) VALUES
    (v_order_id, 1, 'GUN 360ML HEAVY DUTY FISCHER TYPE', 1.0),
    (v_order_id, 2, 'FISCHER-CHEMICAL-FIS EM PLUS 390 S-544154', 2.0);

  -- Order #84: DO-4654 (N K CONSTRUCTION - 10416)
  INSERT INTO otp_orders (
    order_no, quotation_no, timestamp, company_name, contact_person_name,
    contact_number, billing_address, shipping_address, payment_mode,
    payment_terms_days, reference_name, email, transport_mode, destination,
    po_number, quotation_copy_url, acceptance_copy_url, offer_show,
    conveyed_for_registration, total_order_qty, amount, gst_no, cre_name
  ) VALUES (
    'DO-4654', 'CRR-26-27-1871-01', '2026-08-25 07:14:51.262'::timestamptz, 'N K CONSTRUCTION - 10416', 'Anup Ji',
    '9340638874', 'MPBH, COLONY BORSI, DURG, Durg, Chhattisgarh, 491001', 'MPBH, COLONY BORSI, DURG, Durg, Chhattisgarh, 491001', 'full on credit',
    15, 'SARITA BAGHEL', NULL, 'door delivery', 'Bhilai, Chhattisgarh 490006',
    NULL, 'https://nfwtbrmqvsejwwvraanf.supabase.co/storage/v1/object/public/quotation_image/Quotation_CRR-26-27-1871-01.pdf', 'https://nfwtbrmqvsejwwvraanf.supabase.co/storage/v1/object/public/acceptance_file_upload/1787650218732-va57qu3ehxd.pdf', 'no',
    'No', 50.0, 99356.0, '22ACHPA1385K1ZV', 'PRIYA'
  )
  ON CONFLICT (order_no) DO UPDATE SET
    company_name = EXCLUDED.company_name,
    total_order_qty = EXCLUDED.total_order_qty,
    amount = EXCLUDED.amount,
    updated_at = NOW()
  RETURNING id INTO v_order_id;
  DELETE FROM otp_order_items WHERE order_id = v_order_id;
  INSERT INTO otp_order_items (order_id, item_no, item_name, quantity) VALUES
    (v_order_id, 1, 'SUPREME-DURA FILL-EXPANSION JOINTS-1.4X2MTR-PINK BOARD-25MM', 50.0);

  -- Order #85: DO-4653 (OMEGA INFRA ENGINEERS)
  INSERT INTO otp_orders (
    order_no, quotation_no, timestamp, company_name, contact_person_name,
    contact_number, billing_address, shipping_address, payment_mode,
    payment_terms_days, reference_name, email, transport_mode, destination,
    po_number, quotation_copy_url, acceptance_copy_url, offer_show,
    conveyed_for_registration, total_order_qty, amount, gst_no, cre_name
  ) VALUES (
    'DO-4653', 'NBD-26-27-624-03', '2026-07-23 02:34:46.907'::timestamptz, 'OMEGA INFRA ENGINEERS', 'AVNEET JI',
    '9650705763', 'Raigarh Ntpc Lara-496440', 'Raigarh Ntpc Lara-496440', 'fullyadvance',
    1, 'GANGA DHRITLAHARE', NULL, 'by transport', 'RAIGARH',
    NULL, 'https://nfwtbrmqvsejwwvraanf.supabase.co/storage/v1/object/public/quotation_image/Quotation_NBD-26-27-624-03.pdf', 'https://nfwtbrmqvsejwwvraanf.supabase.co/storage/v1/object/public/acceptance_file_upload/1787641600897-rosdjqqxc5p.pdf', 'no',
    'No', 2.0, 55342.0, NULL, 'GANGA'
  )
  ON CONFLICT (order_no) DO UPDATE SET
    company_name = EXCLUDED.company_name,
    total_order_qty = EXCLUDED.total_order_qty,
    amount = EXCLUDED.amount,
    updated_at = NOW()
  RETURNING id INTO v_order_id;
  DELETE FROM otp_order_items WHERE order_id = v_order_id;
  INSERT INTO otp_order_items (order_id, item_no, item_name, quantity) VALUES
    (v_order_id, 1, 'SETL-DIGITAL THEODOLITE-2SEC-ACCURACY', 1.0),
    (v_order_id, 2, 'PACKAGING AND FORWARDING', 1.0);

  -- Order #86: DO-4652 (Larsen and Toubro Limited-Infrastructure Vertical)
  INSERT INTO otp_orders (
    order_no, quotation_no, timestamp, company_name, contact_person_name,
    contact_number, billing_address, shipping_address, payment_mode,
    payment_terms_days, reference_name, email, transport_mode, destination,
    po_number, quotation_copy_url, acceptance_copy_url, offer_show,
    conveyed_for_registration, total_order_qty, amount, gst_no, cre_name
  ) VALUES (
    'DO-4652', 'CRR-26-27-1868-01', '2026-08-25 05:45:45.239'::timestamptz, 'Larsen and Toubro Limited-Infrastructure Vertical', 'Gaurav Ji',
    '8918938022', '1st and 2nd Floor, House No 5, L and T Ltd, Milanpur By Lane, Industrial Estate Bamuni Maidan, Kamrup, Assam, 781021', '9138 - MSBP1 C/o Vishwakarma Steel Fabrication, 1st floor, Hajo Road Amingaon Guwahati Kamrup Kamrup Assam India - 781031.', 'full on credit',
    30, 'NIKITA ROUT', NULL, 'by transport', 'Kamrup',
    'LE/LE25M771/POD/26/000212', 'https://nfwtbrmqvsejwwvraanf.supabase.co/storage/v1/object/public/quotation_image/Quotation_CRR-26-27-1868-01.pdf', 'https://nfwtbrmqvsejwwvraanf.supabase.co/storage/v1/object/public/acceptance_file_upload/1787641544583-55t85e12jgt.pdf', 'no',
    'No', 6.0, 29146.0, '18AAACL0140P3ZG', 'NIKITA'
  )
  ON CONFLICT (order_no) DO UPDATE SET
    company_name = EXCLUDED.company_name,
    total_order_qty = EXCLUDED.total_order_qty,
    amount = EXCLUDED.amount,
    updated_at = NOW()
  RETURNING id INTO v_order_id;
  DELETE FROM otp_order_items WHERE order_id = v_order_id;
  INSERT INTO otp_order_items (order_id, item_no, item_name, quantity) VALUES
    (v_order_id, 1, 'FIBRE STAFF-5MTR', 3.0),
    (v_order_id, 2, 'CST-ALUMINIUM TRIPOD-DOUBLE LOCK- 60-ALCIT20-B-NL', 3.0);

  -- Order #87: DO-4651 (MAA ANNPURNA ENGINEERING)
  INSERT INTO otp_orders (
    order_no, quotation_no, timestamp, company_name, contact_person_name,
    contact_number, billing_address, shipping_address, payment_mode,
    payment_terms_days, reference_name, email, transport_mode, destination,
    po_number, quotation_copy_url, acceptance_copy_url, offer_show,
    conveyed_for_registration, total_order_qty, amount, gst_no, cre_name
  ) VALUES (
    'DO-4651', 'CRR-26-27-1864', '2026-08-24 11:58:58.223'::timestamptz, 'MAA ANNPURNA ENGINEERING', 'Mr. Sharma Ji',
    '9039514343', 'Shop No. 13, Jai Stambh Complex, RAIGARH, Raigarh, Chhattisgarh, 496001', 'Shop No. 13, Jai Stambh Complex, RAIGARH, Raigarh, Chhattisgarh, 496001', 'fullyadvance',
    1, 'GEETA BHIWAGADE', NULL, 'by hand-warehouse', 'Raigarh',
    NULL, 'https://nfwtbrmqvsejwwvraanf.supabase.co/storage/v1/object/public/quotation_image/Quotation_CRR-26-27-1864.pdf', 'https://nfwtbrmqvsejwwvraanf.supabase.co/storage/v1/object/public/acceptance_file_upload/1787638573520-08ubun95yc9u.pdf', 'no',
    'No', 72.0, 6301.2, '22MVXPS8378D1ZI', 'GANGA'
  )
  ON CONFLICT (order_no) DO UPDATE SET
    company_name = EXCLUDED.company_name,
    total_order_qty = EXCLUDED.total_order_qty,
    amount = EXCLUDED.amount,
    updated_at = NOW()
  RETURNING id INTO v_order_id;
  DELETE FROM otp_order_items WHERE order_id = v_order_id;
  INSERT INTO otp_order_items (order_id, item_no, item_name, quantity) VALUES
    (v_order_id, 1, 'FISCHER- G M12X1000 8.8 ZP THREADED ROD', 12.0),
    (v_order_id, 2, 'NUT WASHER M12', 60.0);

  -- Order #88: DO-4650 (RAJAT EQUIPMENTS PRIVATE LIMITED)
  INSERT INTO otp_orders (
    order_no, quotation_no, timestamp, company_name, contact_person_name,
    contact_number, billing_address, shipping_address, payment_mode,
    payment_terms_days, reference_name, email, transport_mode, destination,
    po_number, quotation_copy_url, acceptance_copy_url, offer_show,
    conveyed_for_registration, total_order_qty, amount, gst_no, cre_name
  ) VALUES (
    'DO-4650', 'CRR-26-27-1856', '2026-08-24 09:27:55.199'::timestamptz, 'RAJAT EQUIPMENTS PRIVATE LIMITED', 'P.B. Soni Ji',
    '9826624800', 'PLOT NO.33, NEAR YATAYAT THANA, BHANPURI INDUSTRIAL AREA, BHANPURI, Raipur, Chhattisgarh, 493221', 'PLOT NO.33, NEAR YATAYAT THANA, BHANPURI INDUSTRIAL AREA, BHANPURI, Raipur, Chhattisgarh, 493221', 'pi against advance',
    1, 'NIKITA ROUT', NULL, 'by hand-warehouse', 'RAIPUR CHHATTISGARH-492001',
    'REPL/PO/CNDIV/1116/26-27', 'https://nfwtbrmqvsejwwvraanf.supabase.co/storage/v1/object/public/quotation_image/Quotation_CRR-26-27-1856.pdf', 'https://nfwtbrmqvsejwwvraanf.supabase.co/storage/v1/object/public/acceptance_file_upload/1787635547893-eve6pi97sya.pdf', 'no',
    'No', 3.0, 2743.5, '22AADCR5472P2ZY', 'NIKITA'
  )
  ON CONFLICT (order_no) DO UPDATE SET
    company_name = EXCLUDED.company_name,
    total_order_qty = EXCLUDED.total_order_qty,
    amount = EXCLUDED.amount,
    updated_at = NOW()
  RETURNING id INTO v_order_id;
  DELETE FROM otp_order_items WHERE order_id = v_order_id;
  INSERT INTO otp_order_items (order_id, item_no, item_name, quantity) VALUES
    (v_order_id, 1, 'BOSCH-75MM KNOTTED WIRE CUP BRUSH', 3.0);

  -- Order #89: DO-4649 (SWADESH METALLICS PRIVATE LIMITED-CG)
  INSERT INTO otp_orders (
    order_no, quotation_no, timestamp, company_name, contact_person_name,
    contact_number, billing_address, shipping_address, payment_mode,
    payment_terms_days, reference_name, email, transport_mode, destination,
    po_number, quotation_copy_url, acceptance_copy_url, offer_show,
    conveyed_for_registration, total_order_qty, amount, gst_no, cre_name
  ) VALUES (
    'DO-4649', 'CRR-26-27-1846-01', '2026-08-22 12:09:53.997'::timestamptz, 'SWADESH METALLICS PRIVATE LIMITED-CG', 'Gopal Rathore Ji',
    '7000764855', '5th Floor, 503-508, Avinash One, Labhandi Road, Magneto Mall, Raipur, Raipur, Chhattisgarh, 492006', '5th Floor, 503-508, Avinash One, Labhandi Road, Magneto Mall, Raipur, Raipur, Chhattisgarh, 492006', 'full on credit',
    30, 'NIKITA ROUT', NULL, 'by hand-warehouse', 'Raipur',
    'P1268-00016', 'https://nfwtbrmqvsejwwvraanf.supabase.co/storage/v1/object/public/quotation_image/Quotation_CRR-26-27-1846-01.pdf', 'https://nfwtbrmqvsejwwvraanf.supabase.co/storage/v1/object/public/acceptance_file_upload/1787635343228-cxn4kh6nu3r.pdf', 'no',
    'No', 100.0, 14750.0, '22ABECS3717Q1Z1', 'NIKITA'
  )
  ON CONFLICT (order_no) DO UPDATE SET
    company_name = EXCLUDED.company_name,
    total_order_qty = EXCLUDED.total_order_qty,
    amount = EXCLUDED.amount,
    updated_at = NOW()
  RETURNING id INTO v_order_id;
  DELETE FROM otp_order_items WHERE order_id = v_order_id;
  INSERT INTO otp_order_items (order_id, item_no, item_name, quantity) VALUES
    (v_order_id, 1, 'FISCHER-ANCHOR-FWA 16X140', 100.0);

  -- Order #90: DO-4648 (SHIVSHAKTI ENTERPRISES)
  INSERT INTO otp_orders (
    order_no, quotation_no, timestamp, company_name, contact_person_name,
    contact_number, billing_address, shipping_address, payment_mode,
    payment_terms_days, reference_name, email, transport_mode, destination,
    po_number, quotation_copy_url, acceptance_copy_url, offer_show,
    conveyed_for_registration, total_order_qty, amount, gst_no, cre_name
  ) VALUES (
    'DO-4648', 'CRR-26-27-1866', '2026-08-24 12:53:58.146'::timestamptz, 'SHIVSHAKTI ENTERPRISES', 'SPARSH JI',
    '7879709799', '01, NEAR SARASWATI RAILWAY STATION, RAM NAGAR ROAD, Kota Road, Kommerce House, Gogaon, Raipur, Raipur, Chhattisgarh, 492001', '01, NEAR SARASWATI RAILWAY STATION, RAM NAGAR ROAD, Kota Road, Kommerce House, Gogaon, Raipur, Raipur, Chhattisgarh, 492001', 'fullyadvance',
    1, 'AMAY SWARNKAR', NULL, 'by hand maniquip store', 'raipur',
    NULL, 'https://nfwtbrmqvsejwwvraanf.supabase.co/storage/v1/object/public/quotation_image/Quotation_CRR-26-27-1866.pdf', 'https://nfwtbrmqvsejwwvraanf.supabase.co/storage/v1/object/public/acceptance_file_upload/1787578980785-g9bu10cgumb.jpeg', 'no',
    'No', 20.0, 21476.0, '22BBNPA0995H1ZR', 'GANGA'
  )
  ON CONFLICT (order_no) DO UPDATE SET
    company_name = EXCLUDED.company_name,
    total_order_qty = EXCLUDED.total_order_qty,
    amount = EXCLUDED.amount,
    updated_at = NOW()
  RETURNING id INTO v_order_id;
  DELETE FROM otp_order_items WHERE order_id = v_order_id;
  INSERT INTO otp_order_items (order_id, item_no, item_name, quantity) VALUES
    (v_order_id, 1, 'FISCHER-CHEMICAL-FIS V PLUS 360 S-IN', 20.0);

  -- Order #91: DO-4647 (MAA SHARDA CONSTRUCTIONS)
  INSERT INTO otp_orders (
    order_no, quotation_no, timestamp, company_name, contact_person_name,
    contact_number, billing_address, shipping_address, payment_mode,
    payment_terms_days, reference_name, email, transport_mode, destination,
    po_number, quotation_copy_url, acceptance_copy_url, offer_show,
    conveyed_for_registration, total_order_qty, amount, gst_no, cre_name
  ) VALUES (
    'DO-4647', 'CRR-26-27-1859', '2026-08-24 10:00:37.899'::timestamptz, 'MAA SHARDA CONSTRUCTIONS', 'Dimpu Ji',
    '9792139853', 'H. no 28, Ashoka Life Style, Dharampura 3, Bastar, Chhattisgarh, 494001', 'Jagdalpur Chhattisgarh - 494001', 'full on credit',
    1, 'PRIYA SWARNKAR', NULL, 'by bus', 'Jagdalpur Chhattisgarh - 494001',
    NULL, 'https://nfwtbrmqvsejwwvraanf.supabase.co/storage/v1/object/public/quotation_image/Quotation_CRR-26-27-1859.pdf', 'https://nfwtbrmqvsejwwvraanf.supabase.co/storage/v1/object/public/acceptance_file_upload/1787570715715-lsftom5d839.pdf', 'no',
    'No', 2.0, 1652.0, '22AAUFM0463H2Z8', 'PRIYA'
  )
  ON CONFLICT (order_no) DO UPDATE SET
    company_name = EXCLUDED.company_name,
    total_order_qty = EXCLUDED.total_order_qty,
    amount = EXCLUDED.amount,
    updated_at = NOW()
  RETURNING id INTO v_order_id;
  DELETE FROM otp_order_items WHERE order_id = v_order_id;
  INSERT INTO otp_order_items (order_id, item_no, item_name, quantity) VALUES
    (v_order_id, 1, 'GUN 360ML HEAVY DUTY FISCHER TYPE', 1.0),
    (v_order_id, 2, 'FREIGHT', 1.0);

  -- Order #92: DO-4646 (SHRI JALARAM HARDWARE - 10876)
  INSERT INTO otp_orders (
    order_no, quotation_no, timestamp, company_name, contact_person_name,
    contact_number, billing_address, shipping_address, payment_mode,
    payment_terms_days, reference_name, email, transport_mode, destination,
    po_number, quotation_copy_url, acceptance_copy_url, offer_show,
    conveyed_for_registration, total_order_qty, amount, gst_no, cre_name
  ) VALUES (
    'DO-4646', 'CRR-26-27-1860', '2026-08-24 10:58:59.672'::timestamptz, 'SHRI JALARAM HARDWARE - 10876', 'Patel Ji',
    '9111999789', 'STATION ROAD, POLSAY PARA DURG, DURG, Durg, Chhattisgarh, 491001', 'STATION ROAD, POLSAY PARA DURG, DURG, Durg, Chhattisgarh, 491001', 'fullyadvance',
    1, 'PRIYANKA VISHWAS', NULL, 'by hand-warehouse', 'Raipur',
    NULL, 'https://nfwtbrmqvsejwwvraanf.supabase.co/storage/v1/object/public/quotation_image/Quotation_CRR-26-27-1860.pdf', 'https://nfwtbrmqvsejwwvraanf.supabase.co/storage/v1/object/public/acceptance_file_upload/1787569773295-xz6njad7tlf.pdf', 'no',
    'No', 200.0, 1534.0, '22AUQPP4629J1Z7', 'GANGA'
  )
  ON CONFLICT (order_no) DO UPDATE SET
    company_name = EXCLUDED.company_name,
    total_order_qty = EXCLUDED.total_order_qty,
    amount = EXCLUDED.amount,
    updated_at = NOW()
  RETURNING id INTO v_order_id;
  DELETE FROM otp_order_items WHERE order_id = v_order_id;
  INSERT INTO otp_order_items (order_id, item_no, item_name, quantity) VALUES
    (v_order_id, 1, 'FISCHER-ANCHOR-EA M8 N ZP-DROP-IN-ANCHOR', 200.0);

  -- Order #93: DO-4645 (DEE VEE PROJECTS LIMITED-II)
  INSERT INTO otp_orders (
    order_no, quotation_no, timestamp, company_name, contact_person_name,
    contact_number, billing_address, shipping_address, payment_mode,
    payment_terms_days, reference_name, email, transport_mode, destination,
    po_number, quotation_copy_url, acceptance_copy_url, offer_show,
    conveyed_for_registration, total_order_qty, amount, gst_no, cre_name
  ) VALUES (
    'DO-4645', 'CRR-26-27-1635-02', '2026-08-05 05:18:48.627'::timestamptz, 'DEE VEE PROJECTS LIMITED-II', 'PRATEEK AGARWAL JI',
    '930049999', '1, 0, VIKAS COMPLEX, P H ROAD, KORBA, Korba, Chhattisgarh, 495677', 'SEC-24 AAYOG BHAWAN NAYA RAIPUR', 'full on credit',
    30, 'NEERAJ SIR', NULL, 'by hand-warehouse', 'Sec-24, Nava Raipur, CG',
    'DVPLICAB/RPR/2026-21 149', 'https://nfwtbrmqvsejwwvraanf.supabase.co/storage/v1/object/public/quotation_image/Quotation_CRR-26-27-1635-02.pdf', 'https://nfwtbrmqvsejwwvraanf.supabase.co/storage/v1/object/public/acceptance_file_upload/1787566522362-uwzmtlo2py.pdf', 'yes',
    'No', 3.0, 291460.0, '22AAECD4619B2Z9', 'PRIYA'
  )
  ON CONFLICT (order_no) DO UPDATE SET
    company_name = EXCLUDED.company_name,
    total_order_qty = EXCLUDED.total_order_qty,
    amount = EXCLUDED.amount,
    updated_at = NOW()
  RETURNING id INTO v_order_id;
  DELETE FROM otp_order_items WHERE order_id = v_order_id;
  INSERT INTO otp_order_items (order_id, item_no, item_name, quantity) VALUES
    (v_order_id, 1, 'ManiQuip-MQMC500 MINI CRANE 500KG', 1.0),
    (v_order_id, 2, 'BUCKET 5%', 2.0);

  -- Order #94: DO-4644 (KEYSTONE INFRA BUILDCON PRIVATE LIMITED- CG)
  INSERT INTO otp_orders (
    order_no, quotation_no, timestamp, company_name, contact_person_name,
    contact_number, billing_address, shipping_address, payment_mode,
    payment_terms_days, reference_name, email, transport_mode, destination,
    po_number, quotation_copy_url, acceptance_copy_url, offer_show,
    conveyed_for_registration, total_order_qty, amount, gst_no, cre_name
  ) VALUES (
    'DO-4644', 'CRR-26-27-1853-01', '2026-08-24 08:07:55.721'::timestamptz, 'KEYSTONE INFRA BUILDCON PRIVATE LIMITED- CG', 'VIPIN PANDEY JI',
    '7389188355', '2ND FLOOR, 158, SHIV ASHISH TOWER, SHYAM MANDIR ROAD, INFRONT OF GODAVARI SEVA SADAN SAMATA COLONY, Raipur, Raipur, Chhattisgarh, 492001', '2ND FLOOR, 158, SHIV ASHISH TOWER, SHYAM MANDIR ROAD, INFRONT OF GODAVARI SEVA SADAN SAMATA COLONY, Raipur, Raipur, Chhattisgarh, 492001', 'full on credit',
    30, 'PRIYA SWARNKAR', NULL, 'by hand-warehouse', 'MAHASAMUND',
    'KSIB/AUG-2026-27/MCM-381', 'https://nfwtbrmqvsejwwvraanf.supabase.co/storage/v1/object/public/quotation_image/Quotation_CRR-26-27-1853-01.pdf', 'https://nfwtbrmqvsejwwvraanf.supabase.co/storage/v1/object/public/acceptance_file_upload/1787565965210-29jyrdd1978.pdf', 'no',
    'No', 350.0, 3923.5, '22AALCK1526B1Z4', 'PRIYA'
  )
  ON CONFLICT (order_no) DO UPDATE SET
    company_name = EXCLUDED.company_name,
    total_order_qty = EXCLUDED.total_order_qty,
    amount = EXCLUDED.amount,
    updated_at = NOW()
  RETURNING id INTO v_order_id;
  DELETE FROM otp_order_items WHERE order_id = v_order_id;
  INSERT INTO otp_order_items (order_id, item_no, item_name, quantity) VALUES
    (v_order_id, 1, 'FISCHER-ANCHOR-EA M10 N ZP-DROP-IN-ANCHOR', 350.0);

  -- Order #95: DO-4643 (PUNJAB IRON STORES)
  INSERT INTO otp_orders (
    order_no, quotation_no, timestamp, company_name, contact_person_name,
    contact_number, billing_address, shipping_address, payment_mode,
    payment_terms_days, reference_name, email, transport_mode, destination,
    po_number, quotation_copy_url, acceptance_copy_url, offer_show,
    conveyed_for_registration, total_order_qty, amount, gst_no, cre_name
  ) VALUES (
    'DO-4643', 'CRR-26-27-1858', '2026-08-24 09:43:55.496'::timestamptz, 'PUNJAB IRON STORES', 'Mr. Ritesh Ji',
    '9179180443', 'GOL BAZAR, BILASPUR, BILASPUR, Bilaspur, Chhattisgarh, 495001', 'GOL BAZAR, BILASPUR, BILASPUR, Bilaspur, Chhattisgarh, 495001', 'full on credit',
    15, 'KHUSHI KHEMANI', NULL, 'by transport', 'Bilaspur',
    NULL, 'https://nfwtbrmqvsejwwvraanf.supabase.co/storage/v1/object/public/quotation_image/Quotation_CRR-26-27-1858.pdf', 'https://nfwtbrmqvsejwwvraanf.supabase.co/storage/v1/object/public/acceptance_file_upload/1787565815636-in38nnpg2gd.pdf', 'no',
    'No', 87.0, 29594.4, '22AEZPJ4665D1ZA', 'GANGA'
  )
  ON CONFLICT (order_no) DO UPDATE SET
    company_name = EXCLUDED.company_name,
    total_order_qty = EXCLUDED.total_order_qty,
    amount = EXCLUDED.amount,
    updated_at = NOW()
  RETURNING id INTO v_order_id;
  DELETE FROM otp_order_items WHERE order_id = v_order_id;
  INSERT INTO otp_order_items (order_id, item_no, item_name, quantity) VALUES
    (v_order_id, 1, 'FISCHER RG M16X165 5.8 ZP ANCHOR ROD', 84.0),
    (v_order_id, 2, 'FISCHER-CHEMICAL-INJECTION MORTAR FIS EM PLUS 585 S', 3.0);

  -- Order #96: DO-4642 (JALARAM BAPA INFRABUILD LLP-CG)
  INSERT INTO otp_orders (
    order_no, quotation_no, timestamp, company_name, contact_person_name,
    contact_number, billing_address, shipping_address, payment_mode,
    payment_terms_days, reference_name, email, transport_mode, destination,
    po_number, quotation_copy_url, acceptance_copy_url, offer_show,
    conveyed_for_registration, total_order_qty, amount, gst_no, cre_name
  ) VALUES (
    'DO-4642', 'CRR-26-27-1778-01', '2026-08-18 04:51:17.781'::timestamptz, 'JALARAM BAPA INFRABUILD LLP-CG', 'Gajendra Ji',
    '9516547687', 'NBK-101-C1-09, INDIRA TIMBER MARKET, BHANPURI, RAIPUR, Raipur,
Chhattisgarh, 492001', 'JALARAM BAPA INFRABUILD LLP,
CBD Sec-21,Nava Raipur, Ata! Nagar, Raipur Chhattisgarh -492018
PO. NO.: JBIL/PO/CG/26-27/57
Mr. Gajendra Patel Mob- 9827949316', 'full on credit',
    30, 'PRIYA SWARNKAR', NULL, 'by hand-warehouse', 'Raipur Chhattisgarh -492018',
    'JBIL/PO/CG/26-27/57', 'https://nfwtbrmqvsejwwvraanf.supabase.co/storage/v1/object/public/quotation_image/Quotation_CRR-26-27-1778-01.pdf', 'https://nfwtbrmqvsejwwvraanf.supabase.co/storage/v1/object/public/acceptance_file_upload/1787565142748-exva68r43j.pdf', 'yes',
    'No', 2.0, 8973.9, '22AAOFJ3245L1Z7', 'PRIYA'
  )
  ON CONFLICT (order_no) DO UPDATE SET
    company_name = EXCLUDED.company_name,
    total_order_qty = EXCLUDED.total_order_qty,
    amount = EXCLUDED.amount,
    updated_at = NOW()
  RETURNING id INTO v_order_id;
  DELETE FROM otp_order_items WHERE order_id = v_order_id;
  INSERT INTO otp_order_items (order_id, item_no, item_name, quantity) VALUES
    (v_order_id, 1, 'TEMPING ROD-SLUMP CONE', 1.0),
    (v_order_id, 2, 'WATER BATH-20LTR', 1.0);

  -- Order #97: DO-4641 (NKS Earth Build Ltd)
  INSERT INTO otp_orders (
    order_no, quotation_no, timestamp, company_name, contact_person_name,
    contact_number, billing_address, shipping_address, payment_mode,
    payment_terms_days, reference_name, email, transport_mode, destination,
    po_number, quotation_copy_url, acceptance_copy_url, offer_show,
    conveyed_for_registration, total_order_qty, amount, gst_no, cre_name
  ) VALUES (
    'DO-4641', 'NBD-26-27-787-10', '2026-08-18 08:12:33.86'::timestamptz, 'NKS Earth Build Ltd', 'Amar Majhi Ji',
    '7853040001', 'Bhubaneswar Odisha - 751001', 'JSW Site Paradeep Odisha - 754142', 'fullyadvance',
    1, 'RANJAN KUMAR PRUSTY', NULL, 'by hand-warehouse', 'Paradeep',
    'PROJECT_WO_NKSEBL_2026-27_006', 'https://nfwtbrmqvsejwwvraanf.supabase.co/storage/v1/object/public/quotation_image/Quotation_NBD-26-27-787-10.pdf', 'https://nfwtbrmqvsejwwvraanf.supabase.co/storage/v1/object/public/acceptance_file_upload/1787556127846-94pdalralh9.pdf', 'no',
    'No', 11.0, 438058.48, NULL, 'GANGA'
  )
  ON CONFLICT (order_no) DO UPDATE SET
    company_name = EXCLUDED.company_name,
    total_order_qty = EXCLUDED.total_order_qty,
    amount = EXCLUDED.amount,
    updated_at = NOW()
  RETURNING id INTO v_order_id;
  DELETE FROM otp_order_items WHERE order_id = v_order_id;
  INSERT INTO otp_order_items (order_id, item_no, item_name, quantity) VALUES
    (v_order_id, 1, 'ManiQuip-BAR BENDING MACHINE MQB-55 UT', 1.0),
    (v_order_id, 2, 'ManiQuip-BAR CUTTING MACHINE MQC-55 UT', 1.0),
    (v_order_id, 3, 'MACHINE GEAR-OIL-90NO', 1.0),
    (v_order_id, 4, 'WACKER-HMS MOTOR-M2500/230 EU', 2.0),
    (v_order_id, 5, 'ManiQuip Electric Vibrator 3HP 3Phase', 2.0),
    (v_order_id, 6, 'ManiQuip Diesel Vibartor Greaves Lombardini Engine 5520 With Side Handle (5HP)', 1.0),
    (v_order_id, 7, 'ManiQuip Needle 6Mtr Long 40MM', 1.0),
    (v_order_id, 8, 'ManiQuip Needle 6Mtr Long 60MM', 1.0),
    (v_order_id, 9, 'PACKAGING AND FORWARDING', 1.0);

  -- Order #98: DO-4640 (SHRADDHA CONSTRUCTION COMPANY)
  INSERT INTO otp_orders (
    order_no, quotation_no, timestamp, company_name, contact_person_name,
    contact_number, billing_address, shipping_address, payment_mode,
    payment_terms_days, reference_name, email, transport_mode, destination,
    po_number, quotation_copy_url, acceptance_copy_url, offer_show,
    conveyed_for_registration, total_order_qty, amount, gst_no, cre_name
  ) VALUES (
    'DO-4640', 'NBD-26-27-812', '2026-08-24 04:48:01.135'::timestamptz, 'SHRADDHA CONSTRUCTION COMPANY', 'Tiwari ji',
    '7205914479', 'R-7, VINOBA NAGAR, BILASPUR, Bilaspur, Chhattisgarh, 495001', 'R-7, VINOBA NAGAR, BILASPUR, Bilaspur, Chhattisgarh, 495001', 'fullyadvance',
    1, 'HIRU RAM NISHAD', NULL, 'by hand-warehouse', 'Raipur',
    NULL, 'https://nfwtbrmqvsejwwvraanf.supabase.co/storage/v1/object/public/quotation_image/Quotation_NBD-26-27-812.pdf', 'https://nfwtbrmqvsejwwvraanf.supabase.co/storage/v1/object/public/acceptance_file_upload/1787555840083-tjwkn56dgys.pdf', 'no',
    'No', 5.0, 5605.0, '22AAXFS4943B1Z3', 'GANGA'
  )
  ON CONFLICT (order_no) DO UPDATE SET
    company_name = EXCLUDED.company_name,
    total_order_qty = EXCLUDED.total_order_qty,
    amount = EXCLUDED.amount,
    updated_at = NOW()
  RETURNING id INTO v_order_id;
  DELETE FROM otp_order_items WHERE order_id = v_order_id;
  INSERT INTO otp_order_items (order_id, item_no, item_name, quantity) VALUES
    (v_order_id, 1, 'CUBE MOULD-150X150X150MM', 5.0);

  -- Order #99: DO-4639 (SUDHAMA NUT BOLT HOUSE)
  INSERT INTO otp_orders (
    order_no, quotation_no, timestamp, company_name, contact_person_name,
    contact_number, billing_address, shipping_address, payment_mode,
    payment_terms_days, reference_name, email, transport_mode, destination,
    po_number, quotation_copy_url, acceptance_copy_url, offer_show,
    conveyed_for_registration, total_order_qty, amount, gst_no, cre_name
  ) VALUES (
    'DO-4639', 'CRR-26-27-1850', '2026-08-24 05:51:27.123'::timestamptz, 'SUDHAMA NUT BOLT HOUSE', 'Krishna Ji',
    '8770646918', '0, 5, NEW BOMBAY MARKET, G.E.ROAD, RAIPUR, Raipur, Chhattisgarh, 492001', '0, 5, NEW BOMBAY MARKET, G.E.ROAD, RAIPUR, Raipur, Chhattisgarh, 492001', 'full on credit',
    30, 'KHUSHI KHEMANI', NULL, 'by hand-warehouse', 'Raipur',
    NULL, 'https://nfwtbrmqvsejwwvraanf.supabase.co/storage/v1/object/public/quotation_image/Quotation_CRR-26-27-1850.pdf', 'https://nfwtbrmqvsejwwvraanf.supabase.co/storage/v1/object/public/acceptance_file_upload/1787551270217-7izskmrxxh2.pdf', 'no',
    'No', 100.0, 102070.0, '22AEYPK1466L1Z0', 'GANGA'
  )
  ON CONFLICT (order_no) DO UPDATE SET
    company_name = EXCLUDED.company_name,
    total_order_qty = EXCLUDED.total_order_qty,
    amount = EXCLUDED.amount,
    updated_at = NOW()
  RETURNING id INTO v_order_id;
  DELETE FROM otp_order_items WHERE order_id = v_order_id;
  INSERT INTO otp_order_items (order_id, item_no, item_name, quantity) VALUES
    (v_order_id, 1, 'FISCHER-CHEMICAL-FIS V PLUS 360 S-IN', 100.0);

  -- Order #100: DO-4638 (SHREE YAMUNAJI TRADERS - 10573)
  INSERT INTO otp_orders (
    order_no, quotation_no, timestamp, company_name, contact_person_name,
    contact_number, billing_address, shipping_address, payment_mode,
    payment_terms_days, reference_name, email, transport_mode, destination,
    po_number, quotation_copy_url, acceptance_copy_url, offer_show,
    conveyed_for_registration, total_order_qty, amount, gst_no, cre_name
  ) VALUES (
    'DO-4638', 'CRR-26-27-1849', '2026-08-24 05:26:58.117'::timestamptz, 'SHREE YAMUNAJI TRADERS - 10573', 'Mr. Bhavesh Ji',
    '9826612334', 'SHUBHAM VIHAR, OM ZONE COLONY, SHREE JALARAM KRIPA, MUNGELI ROAD, BILASPUR, Bilaspur, Chhattisgarh, 495001', 'SHUBHAM VIHAR, OM ZONE COLONY, SHREE JALARAM KRIPA, MUNGELI ROAD, BILASPUR, Bilaspur, Chhattisgarh, 495001', 'full on credit',
    15, 'PRIYANKA VISHWAS', NULL, 'by transport', 'Bilaspur',
    NULL, 'https://nfwtbrmqvsejwwvraanf.supabase.co/storage/v1/object/public/quotation_image/Quotation_CRR-26-27-1849.pdf', 'https://nfwtbrmqvsejwwvraanf.supabase.co/storage/v1/object/public/acceptance_file_upload/1787550277283-wqdoeh3rk39.pdf', 'no',
    'No', 30.0, 2537.0, '22AJLPM0008N2ZB', 'GANGA'
  )
  ON CONFLICT (order_no) DO UPDATE SET
    company_name = EXCLUDED.company_name,
    total_order_qty = EXCLUDED.total_order_qty,
    amount = EXCLUDED.amount,
    updated_at = NOW()
  RETURNING id INTO v_order_id;
  DELETE FROM otp_order_items WHERE order_id = v_order_id;
  INSERT INTO otp_order_items (order_id, item_no, item_name, quantity) VALUES
    (v_order_id, 1, 'FISCHER- G M12X1000 8.8 ZP THREADED ROD', 5.0),
    (v_order_id, 2, 'NUT WASHER M12', 25.0);

  RAISE NOTICE 'Successfully inserted 100 orders into Stage 1 (Order Acceptable)!';
END $$;

-- Verify imported orders in Stage 1
SELECT 
  o.order_no,
  o.company_name,
  o.total_order_qty,
  o.amount,
  o.cre_name,
  oa.planned_date AS stage1_planned_date
FROM otp_orders o
LEFT JOIN otp_order_acceptable oa ON oa.order_id = o.id
ORDER BY o.timestamp DESC;