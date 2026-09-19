// ==============================================================================
// otp-utils.ts
// Formatters and converters between Supabase Views and UI Table models
// ==============================================================================

export function formatDateTime(dateVal: any): string {
  if (!dateVal) return ""
  try {
    const d = new Date(dateVal)
    if (isNaN(d.getTime())) return String(dateVal)
    const day = String(d.getDate()).padStart(2, "0")
    const month = String(d.getMonth() + 1).padStart(2, "0")
    const year = d.getFullYear()
    const hours = String(d.getHours()).padStart(2, "0")
    const minutes = String(d.getMinutes()).padStart(2, "0")
    return `${day}/${month}/${year} ${hours}:${minutes}`
  } catch {
    return String(dateVal)
  }
}

export function formatDateOnly(dateVal: any): string {
  if (!dateVal) return ""
  try {
    const d = new Date(dateVal)
    if (isNaN(d.getTime())) return String(dateVal)
    const day = String(d.getDate()).padStart(2, "0")
    const month = String(d.getMonth() + 1).padStart(2, "0")
    const year = d.getFullYear()
    return `${day}/${month}/${year}`
  } catch {
    return String(dateVal)
  }
}

// Maps a row from /api/otp-supabase/order-acceptable (Stage 1, against the
// new otp_orders / otp_orders_acceptable tables) into the same UI field
// names order_acceptable.tsx's pendingColumns/historyColumns already expect.
// A "pending" row is a plain otp_orders row; a "history" row is an
// otp_orders_acceptable row with the parent order nested under `order`
// (from `.select("*, order:otp_orders(*)")`). Handles both shapes.
export function mapOrderAcceptableRowToUI(row: any): any {
  if (!row) return {}

  const acceptance = row.order ? row : null // set only on history rows
  const order = row.order || row // the otp_orders fields, either nested or top-level

  const items = order.items || []
  const itemFields: Record<string, any> = {}
  items.forEach((it: any, idx: number) => {
    const n = idx + 1
    itemFields[`itemName${n}`] = it?.item_name || ""
    itemFields[`quantity${n}`] = it?.quantity || ""
  })

  return {
    id: order.id,
    orderId: order.id,
    orderNo: order.order_no || "",
    quotationNo: order.quotation_number || "",
    timestamp: formatDateTime(order.created_at),
    companyName: order.company_name || "",
    contactPersonName: order.contact_person || "",
    contactNumber: order.phone_number || "",
    billingAddress: order.billing_address || "",
    shippingAddress: order.shipping_address || "",
    paymentMode: order.payment_mode || "",
    paymentTerms: order.payment_terms_days || 0,
    email: order.email || "",
    transportMode: order.transport_mode || "",
    destination: order.destination || "",
    poNumber: order.po_number || "",
    acceptanceCopy: order.acceptance_file_upload || "",
    amount: order.amount_with_tax || 0,
    gstNo: order.gst_number || "",

    // Stage 1 (Order Acceptable)
    isOrderAcceptable: acceptance?.is_order_acceptable || "",
    orderAcceptanceChecklist: acceptance?.acceptance_checklist || "",
    remarks: acceptance?.remark || "",
    remark: acceptance?.remark || "",
    processedBy: acceptance?.processed_by || "",
    oaPlanned: order.order_acceptable_planned,
    ciPlanned: acceptance?.check_inventory_planned,

    rawItems: items,
    ...itemFields,
  }
}

// Maps a Pending row from /api/otp-supabase/proforma-invoice (an
// otp_orders_acceptable row, joined to its parent otp_orders) into the UI
// field names proforma-invoice/page.tsx expects. Only reached when
// otp_orders.payment_mode = 'pi against advance' — see order-acceptable/route.ts.
export function mapProformaInvoicePendingRowToUI(row: any): any {
  if (!row) return {}

  const order = row.order || {}
  const items = order.items || []

  return {
    id: order.id,
    orderId: order.id,
    orderNo: order.order_no || "",
    quotationNo: order.quotation_number || "",
    timestamp: formatDateTime(order.created_at),
    companyName: order.company_name || "",
    contactPersonName: order.contact_person || "",
    contactNumber: order.phone_number || "",
    paymentMode: order.payment_mode || "",
    amount: order.amount_with_tax || 0,
    rawItems: items,
  }
}

// Maps a History row from /api/otp-supabase/proforma-invoice (an
// otp_proforma_invoice row, joined to its parent otp_orders) into the UI
// field names proforma-invoice/page.tsx expects.
export function mapProformaInvoiceHistoryRowToUI(row: any): any {
  if (!row) return {}

  const order = row.order || {}
  const items = order.items || []

  return {
    id: row.id,
    orderId: order.id || row.order_id,
    orderNo: order.order_no || "",
    quotationNo: order.quotation_number || "",
    timestamp: formatDateTime(row.created_at),
    companyName: order.company_name || "",
    contactPersonName: order.contact_person || "",
    contactNumber: order.phone_number || "",
    paymentMode: order.payment_mode || "",
    amount: order.amount_with_tax || 0,

    piNumber: row.pi_number || "",
    piAmount: row.pi_amount ?? "",
    piUploadUrl: row.pi_upload_url || "",
    remark: row.remark || "",
    createdBy: row.created_by || "",

    rawItems: items,
  }
}

// Maps a row from /api/otp-supabase/check-inventory (Stage 2, against
// otp_orders / otp_orders_acceptable / otp_check_inventory) into the same UI
// field names check-inventory/page.tsx's pendingColumns/historyColumns
// already expect. Both the pending and history branches of that API return
// the same { order, acceptance, inventory } shape, so this mapper doesn't
// need to guess which endpoint a row came from.
export function mapCheckInventoryRowToUI(row: any): any {
  if (!row) return {}

  const order = row.order || {}
  const acceptance = row.acceptance || null // Stage 1 outcome, if it exists
  const inventory = row.inventory || null // Stage 2 outcome, only on history rows

  const rawItems = order.items || []
  const itemFields: Record<string, any> = {}
  rawItems.forEach((it: any, idx: number) => {
    const n = idx + 1
    itemFields[`itemName${n}`] = it?.item_name || ""
    itemFields[`quantity${n}`] = it?.quantity || ""
  })

  return {
    id: order.id,
    orderId: order.id,
    orderNo: order.order_no || "",
    quotationNo: order.quotation_number || "",
    timestamp: formatDateTime(order.created_at),
    creName: order.crm_name || "",
    companyName: order.company_name || "",
    contactPersonName: order.contact_person || "",
    contactNumber: order.phone_number || "",
    billingAddress: order.billing_address || "",
    shippingAddress: order.shipping_address || "",
    paymentMode: order.payment_mode || "",
    paymentTerms: order.payment_terms_days || 0,
    email: order.email || "",
    transportMode: order.transport_mode || "",
    destination: order.destination || "",
    poNumber: order.po_number || "",
    quotationCopy: order.quotation_copy || "",
    acceptanceCopy: order.acceptance_file_upload || "",
    amount: order.amount_with_tax || 0,

    // Stage 1 (Order Acceptable) outcome — already-completed context, shown
    // on this stage's tables too since a Check Inventory row can't exist
    // without having passed Stage 1 first.
    isOrderAcceptable: acceptance?.is_order_acceptable || "",
    orderAcceptanceChecklist: acceptance?.acceptance_checklist || "",
    remarks: acceptance?.remark || "",

    // Stage 2 (Check Inventory)
    availabilityStatus: inventory?.availability_status || "",
    inventoryStatus: inventory?.availability_status || "",
    inventoryRemarks: inventory?.remark || "",
    customerWantsMaterialAs: inventory?.customer_wants_material_as || "",
    warehouseLocation: inventory?.warehouse_location || "",
    lineItemNumber: inventory?.line_item_number ?? "",
    totalQty: inventory?.total_qty ?? "",
    materialReceivedLeadTime: inventory?.material_received_lead_time ?? "",
    createdBy: inventory?.created_by || "",
    processedDate: inventory?.actual_date,

    // items in {name, qty} shape (not {item_name, quantity}) so the existing
    // "Items Not Available" prefill logic in check-inventory/page.tsx (which
    // reads item.name/item.qty) keeps working unchanged.
    items: rawItems.map((it: any) => ({ name: it.item_name, qty: it.quantity })),
    rawItems,
    ...itemFields,
  }
}

// Maps a row from /api/otp-supabase/pre-invoice (against otp_pre_invoice_queue,
// joined to its parent otp_orders) into the UI field names pre-invoice/page.tsx
// expects. One otp_orders row can produce more than one queue row over time
// (one per wave — Check Inventory's available qty, later Material Received's
// partial receipts), so orderNo/companyName come from the row's own `order`,
// not assumed unique per order.
export function mapPreInvoiceRowToUI(row: any): any {
  if (!row) return {}

  const order = row.order || {}

  return {
    id: row.id,
    queueId: row.id,
    orderId: order.id || row.order_id,
    orderNo: order.order_no || "",
    quotationNo: row.quotation_number || order.quotation_number || "",
    timestamp: formatDateTime(row.created_at),
    companyName: order.company_name || "",
    contactPersonName: order.contact_person || "",
    contactNumber: order.phone_number || "",
    email: order.email || "",
    sourceStage: row.source_stage || "",
    items: (row.items || []).map((it: any) => ({ name: it.item_name, qty: it.qty, itemCode: it.item_code, installation: it.installation })),
    rawItems: row.items || [],
    // Pending: falls back to the live otp_orders.payment_mode (pre-select
    // default). History: row.payment_mode is the snapshot saved at
    // Pre-Invoice-submit time, which wins once it's set.
    paymentMode: row.payment_mode || order.payment_mode || "",

    createdBy: row.created_by || "",
    invoicedAt: formatDateTime(row.invoiced_at),
    status: row.status || "",

    calibrationRequired: row.calibration_required === true ? "YES" : row.calibration_required === false ? "NO" : "",
    calibrationType: row.calibration_type || "",
    transportId: row.transport_id || "",
    gstNumber: row.gst_number || "",
    vehicleNumber: row.vehicle_number || "",
    dispatchLocation: row.dispatch_location || "",
    directDispatchDetails: row.direct_dispatch_details || "",
    paymentAttachmentUrl: row.payment_attachment_url || "",
    srnAttachmentUrl: row.srn_attachment_url || "",
    remarks: row.remarks || "",
  }
}

// Maps a Pending row from /api/otp-supabase/make-invoice (an
// otp_pre_invoice_queue row, joined to its parent otp_orders) into the UI
// field names make-invoice/page.tsx expects.
export function mapMakeInvoicePendingRowToUI(row: any): any {
  if (!row) return {}

  const order = row.order || {}

  return {
    id: row.id,
    queueId: row.id,
    orderId: order.id || row.order_id,
    orderNo: order.order_no || "",
    quotationNo: row.quotation_number || order.quotation_number || "",
    timestamp: formatDateTime(row.invoiced_at || row.created_at),
    companyName: order.company_name || "",
    contactPersonName: order.contact_person || "",
    contactNumber: order.phone_number || "",
    sourceStage: row.source_stage || "",
    items: (row.items || []).map((it: any) => ({ name: it.item_name, qty: it.qty, itemCode: it.item_code, installation: it.installation })),
    rawItems: row.items || [],
  }
}

// Maps a History row from /api/otp-supabase/make-invoice (an
// otp_make_invoice row, joined to its parent otp_orders +
// otp_pre_invoice_queue) into the UI field names make-invoice/page.tsx
// expects.
export function mapMakeInvoiceHistoryRowToUI(row: any): any {
  if (!row) return {}

  const order = row.order || {}
  const queue = row.queue || {}

  return {
    id: row.id,
    orderId: order.id || row.order_id,
    orderNo: order.order_no || "",
    quotationNo: queue.quotation_number || order.quotation_number || "",
    timestamp: formatDateTime(row.created_at),
    companyName: order.company_name || "",
    contactPersonName: order.contact_person || "",
    contactNumber: order.phone_number || "",

    invoiceNumber: row.invoice_number || "",
    invoiceDate: row.invoice_date || "",
    invoiceUploadUrl: row.invoice_upload_url || "",
    ewayBillNumber: row.eway_bill_number || "",
    ewayBillUploadUrl: row.eway_bill_upload_url || "",
    totalBillAmount: row.total_bill_amount ?? "",
    remarks: row.remarks || "",
    createdBy: row.created_by || "",

    items: (row.items || []).map((it: any) => ({ name: it.item_name, qty: it.qty, itemCode: it.item_code, installation: it.installation })),
    rawItems: row.items || [],
  }
}

// Maps a Pending row from /api/otp-supabase/calibration (an
// otp_make_invoice row, joined to its parent otp_orders) into the UI field
// names calibration/page.tsx expects.
export function mapCalibrationPendingRowToUI(row: any): any {
  if (!row) return {}

  const order = row.order || {}

  return {
    id: row.id,
    makeInvoiceId: row.id,
    orderId: order.id || row.order_id,
    orderNo: order.order_no || "",
    quotationNo: order.quotation_number || "",
    timestamp: formatDateTime(row.created_at),
    companyName: order.company_name || "",
    contactPersonName: order.contact_person || "",
    contactNumber: order.phone_number || "",
    invoiceNumber: row.invoice_number || "",
    items: (row.items || []).map((it: any) => ({ name: it.item_name, qty: it.qty, itemCode: it.item_code })),
    rawItems: row.items || [],
  }
}

// Maps a History row from /api/otp-supabase/calibration (an
// otp_calibration_certificate row, joined to its parent otp_orders +
// otp_make_invoice) into the UI field names calibration/page.tsx expects.
export function mapCalibrationHistoryRowToUI(row: any): any {
  if (!row) return {}

  const order = row.order || {}
  const makeInvoice = row.makeInvoice || {}

  return {
    id: row.id,
    orderId: order.id || row.order_id,
    orderNo: order.order_no || "",
    quotationNo: order.quotation_number || "",
    timestamp: formatDateTime(row.created_at),
    companyName: order.company_name || "",
    contactPersonName: order.contact_person || "",
    contactNumber: order.phone_number || "",
    invoiceNumber: makeInvoice.invoice_number || "",

    certificateNumber: row.certificate_number || "",
    certificateType: row.certificate_type || "",
    certificateUploadUrl: row.certificate_upload_url || "",
    remarks: row.remarks || "",
    createdBy: row.created_by || "",

    items: (makeInvoice.items || []).map((it: any) => ({ name: it.item_name, qty: it.qty, itemCode: it.item_code })),
    rawItems: makeInvoice.items || [],
  }
}

// Maps a row from /api/otp-supabase/material-received (against
// otp_material_shortage, joined to its parent otp_orders) into the UI field
// names material-received/page.tsx expects. One row per short item — see
// Database/17_check_inventory_scan_flow.sql.
// Pending Material Received rows are grouped by order (see
// app/api/otp-supabase/material-received/route.ts GET) — one card per
// order, carrying every currently outstanding otp_material_shortage row
// so they can all be scanned together, same as Check Inventory's own
// order-level scan flow.
export function mapMaterialReceivedPendingRowToUI(row: any): any {
  if (!row) return {}

  const order = row.order || {}
  const shortageItems = row.shortageItems || []

  return {
    id: order.id,
    orderId: order.id,
    orderNo: order.order_no || "",
    quotationNo: order.quotation_number || "",
    timestamp: formatDateTime(order.created_at),
    creName: order.crm_name || "",
    companyName: order.company_name || "",
    contactPersonName: order.contact_person || "",
    contactNumber: order.phone_number || "",

    // Reference table in the scan dialog + Item List dialog both read
    // this shape: {item_name, quantity} per outstanding shortage item.
    rawItems: shortageItems.map((it: any) => ({
      item_name: it.item_name,
      item_code: it.item_code,
      quantity: it.indented_qty,
    })),
    shortageRows: shortageItems,
  }
}

// History rows stay item-level — each otp_material_shortage row already
// processed is its own record of one receiving attempt (found vs. still
// short at that point), not rolled up per order.
export function mapMaterialReceivedHistoryRowToUI(row: any): any {
  if (!row) return {}

  const order = row.order || {}

  return {
    id: row.id,
    shortageId: row.id,
    orderId: order.id || row.order_id,
    orderNo: order.order_no || "",
    quotationNo: order.quotation_number || "",
    timestamp: formatDateTime(row.created_at),
    companyName: order.company_name || "",
    contactPersonName: order.contact_person || "",
    contactNumber: order.phone_number || "",

    itemCode: row.item_code || "",
    itemName: row.item_name || "",
    indentedQty: Number(row.indented_qty) || 0,
    receivedQty: Number(row.received_qty) || 0,
    remainingQty: Number(row.remaining_qty) || 0,
    pfmsIndentNo: row.pfms_indent_no || "",
    warehouseLocation: row.warehouse_location || "",
    remark: row.remark || "",
    status: row.status || "",
    updatedAt: formatDateTime(row.updated_at),
  }
}

export function mapOrderRowToUI(row: any): any {
  if (!row) return {}

  const items = row.items || []
  const itemFields: Record<string, any> = {}
  for (let i = 1; i <= 10; i++) {
    const it = items.find((x: any) => x.item_no === i)
    itemFields[`itemName${i}`] = it?.item_name || ""
    itemFields[`quantity${i}`] = it?.quantity || ""
  }

  return {
    id: row.id,
    orderId: row.id,
    orderNo: row.order_no || "",
    quotationNo: row.quotation_no || "",
    timestamp: formatDateTime(row.timestamp),
    companyName: row.company_name || "",
    contactPersonName: row.contact_person_name || "",
    contactNumber: row.contact_number || "",
    billingAddress: row.billing_address || "",
    shippingAddress: row.shipping_address || "",
    paymentMode: row.payment_mode || "",
    paymentTerms: row.payment_terms_days || 0,
    referenceName: row.reference_name || "",
    email: row.email || "",
    transportMode: row.transport_mode || "",
    destination: row.destination || "",
    freightType: "",
    poNumber: row.po_number || "",
    quotationCopy: row.quotation_copy_url || "",
    acceptanceCopy: row.acceptance_copy_url || "",
    offerShow: row.offer_show || "",
    conveyedForRegistration: row.conveyed_for_registration || "",
    totalOrderQty: row.total_order_qty || 0,
    amount: row.amount || 0,
    gstNo: row.gst_no || "",
    creName: row.cre_name || "",
    totalDispatch: row.total_dispatched_qty || 0,
    quantityDelivered: row.total_delivered_qty || 0,
    orderCancel: row.total_cancelled_qty || 0,
    pendingDeliveryQty: row.pending_delivery_qty || 0,
    pendingDispatchQty: row.pending_dispatch_qty || 0,
    materialReturn: "",
    status: row.oa_actual ? "processed" : "pending",
    deliveryStatus: row.delivery_status || "Pending",
    dispatchStatus: row.dispatch_status || "Pending",
    dispatchCompleteDate: formatDateOnly(row.dispatch_complete_date),
    deliveryCompleteDate: formatDateOnly(row.delivery_complete_date),
    
    // Stage 1 (Order Acceptable)
    isOrderAcceptable: row.is_order_acceptable || "",
    orderAcceptanceChecklist: row.acceptance_checklist || "",
    remarks: row.oa_remark || row.ci_remarks || "",
    remark: row.oa_remark || "",
    oaPlanned: row.oa_planned,
    oaActual: row.oa_actual,
    oaDelay: row.oa_delay || 0,

    // Stage 2 (Check Inventory)
    availabilityStatus: row.availability_status || "",
    inventoryRemarks: row.ci_remarks || "",
    availabilityRemarks: row.ci_remarks || "",
    ciRemarks: row.ci_remarks || "",
    customerWantsMaterial: row.customer_wants_material_as || "",
    warehouseLocation: row.ci_warehouse_location || "",
    createIndent: row.create_indent_if_not_avail ? "Yes" : "No",
    lineItemNumber: row.ci_line_item_number || "",
    totalQty: row.ci_total_qty || 0,
    materialReceivedLeadTime: row.material_received_lead_time || "",
    createdBy: row.ci_created_by || row.oa_created_by || "",
    ciPlanned: row.ci_planned,
    ciActual: row.ci_actual,
    ciDelay: row.ci_delay || 0,

    // Stage 3 (Material Received)
    receivedDate: formatDateOnly(row.mr_received_date),
    mrPlanned: row.mr_planned,
    mrActual: row.mr_actual,
    mrDelay: row.mr_delay || 0,

    // Stage 4 (Senior Approval)
    approvalName: row.approval_name || "",
    approvedBy: row.approval_name || "",
    approvalDate: formatDateOnly(row.sa_actual),
    revenue: row.revenue || 0,
    saPlanned: row.sa_planned,
    saActual: row.sa_actual,
    saDelay: row.sa_delay || 0,

    rawItems: items,
    ...itemFields,
  }
}

export function mapDispatchRowToUI(row: any): any {
  if (!row) return {}

  const items = row.dispatch_items || []
  const itemFields: Record<string, any> = {}
  for (let i = 1; i <= 15; i++) {
    const it = items.find((x: any) => x.item_no === i)
    itemFields[`itemName${i}`] = it?.item_name || ""
    itemFields[`quantity${i}`] = it?.quantity || ""
  }

  return {
    id: row.id,
    dispatchId: row.id,
    dispatchNo: row.dispatch_no || "",
    dSrNumber: row.dispatch_no || "",
    dSrNo: row.dispatch_no || "",
    dsrNo: row.dispatch_no || "",
    dsrNumber: row.dispatch_no || "",
    orderId: row.order_id || "",
    orderNo: row.order_no || "",
    timestamp: formatDateTime(row.timestamp),
    quotationNo: row.quotation_no || "",
    companyName: row.company_name || "",
    company: row.company_name || "",
    contactPersonName: row.contact_person_name || "",
    contactNumber: row.contact_number || "",
    billingAddress: row.billing_address || "",
    shippingAddress: row.shipping_address || "",
    paymentMode: row.payment_mode || "",
    paymentTerms: row.payment_terms_days || 0,
    transportMode: row.transport_mode || "",
    destination: row.destination || "",
    qty: row.total_dispatch_qty || 0,
    totalQty: row.total_dispatch_qty || 0,
    totalDispatchQty: row.total_dispatch_qty || 0,
    totalBillAmount: row.mi_total_bill_amount || row.total_bill_amount || 0,
    amount: row.mi_total_bill_amount || row.total_bill_amount || 0,
    approvedName: row.approved_name || "",
    calibrationCertificateRequired: row.calibration_required || "NO",
    calibrationRequired: row.calibration_required || "NO",
    calibrationType: row.certificate_category || "",
    certificateCategory: row.certificate_category || "",
    installationRequired: row.installation_required || "",
    transporterId: row.transporter_id || "",
    vehicleNo: row.vehicle_no || "",
    srnNumber: row.srn_number || "",
    srnNumberAttachment: row.srn_number_attachment_url || "",
    attachment: row.attachment_url || "",
    gstNo: row.gst_no || "",
    dispatchStatus: row.dispatch_status || "Pending",
    status: row.dispatch_status || "Pending",
    dispatchLocation: row.dispatch_location || "",
    directDispatch: row.direct_dispatch || false,
    calibrationResponsible: row.calibration_responsible || "",
    creName: row.cre_name || "",

    // Stage 5 (Make Invoice)
    invoiceNumber: row.invoice_number || "",
    invoiceUpload: row.invoice_upload_url || "",
    ewayBillUpload: row.eway_bill_upload_url || "",
    billDate: formatDateOnly(row.mi_bill_date || row.bill_date),
    totalQtyHistory: row.mi_total_qty || row.total_qty || row.total_dispatch_qty || 0,
    miPlanned: row.mi_planned,
    miActual: row.mi_actual,
    miDelay: row.mi_delay || 0,

    // Stage 6 (Warehouse)
    beforePhoto: row.before_photo_url || "",
    beforePhotoUpload: row.before_photo_url || "",
    afterPhoto: row.after_photo_url || "",
    afterPhotoUpload: row.after_photo_url || "",
    biltyUpload: row.bilty_upload_url || "",
    transporterName: row.transporter_name || "",
    transporterContact: row.transporter_contact || "",
    biltyNumber: row.bilty_docket_no || "",
    transporterBiltyNo: row.bilty_docket_no || "",
    totalCharges: row.freight_charge || 0,
    freightCharge: row.freight_charge || 0,
    warehouseRemarks: row.warehouse_remarks || "",
    whPlanned: row.wh_planned,
    whActual: row.wh_actual,
    whDelay: row.wh_delay || 0,

    // Stage 7 (Driver / Material Receiving)
    materialReceivingStatus: row.material_receiving_status || "",
    sitePersonName: row.site_person_name || "",
    sitePersonContact: row.site_person_contact || "",
    mrcvPlanned: row.mrcv_planned,
    mrcvActual: row.mrcv_actual,
    mrcvDelay: row.mrcv_delay || 0,

    // Stage 8 (Calibration)
    labCalibrationCertificate: row.lab_cert_url || "",
    stCalibrationCertificate: row.st_cert_url || "",
    labCalibrationDate: formatDateOnly(row.lab_cert_date),
    stCalibrationDate: formatDateOnly(row.st_cert_date),
    labCalibrationPeriod: row.lab_cert_period || "",
    stCalibrationPeriod: row.st_cert_period || "",
    labDueDate: formatDateOnly(row.lab_due_date),
    stDueDate: formatDateOnly(row.st_due_date),
    calPlanned: row.cal_planned,
    calActual: row.cal_actual,
    calDelay: row.cal_delay || 0,

    // Stage 9 (Update Delivery Note)
    uploadDN: row.upload_dn_url || "",
    totalDeliveredQty: row.total_delivered_qty || 0,
    udPlanned: row.ud_planned,
    udActual: row.ud_actual,
    udDelay: row.ud_delay || 0,

    rawDispatchItems: items,
    ...itemFields,
  }
}
