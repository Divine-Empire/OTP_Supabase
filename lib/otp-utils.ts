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
    crmName: order.crm_name || "",
    accessories: (order.items_accessories || []).map((a: any) => `${a.item_name} x${a.quantity}`).join(", "),
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
    gstNo: order.gst_number || "",
    totalOrderQty: order.total_qty || 0,

    // Stage 1 (Order Acceptable)
    isOrderAcceptable: acceptance?.is_order_acceptable || "",
    orderAcceptanceChecklist: acceptance?.acceptance_checklist || "",
    remarks: acceptance?.remark || "",
    remark: acceptance?.remark || "",
    processedBy: acceptance?.processed_by || "",
    oaPlanned: order.order_acceptable_planned,
    ciPlanned: acceptance?.check_inventory_planned,
    planned: formatDateTime(order.order_acceptable_planned),
    actual: acceptance ? formatDateTime(row.created_at) : "",

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
    crmName: order.crm_name || "",
    accessories: (order.items_accessories || []).map((a: any) => `${a.item_name} x${a.quantity}`).join(", "),
    contactPersonName: order.contact_person || "",
    contactNumber: order.phone_number || "",
    paymentMode: order.payment_mode || "",
    billingAddress: order.billing_address || "",
    shippingAddress: order.shipping_address || "",
    paymentTerms: order.payment_terms_days || 0,
    transportMode: order.transport_mode || "",
    destination: order.destination || "",
    poNumber: order.po_number || "",
    quotationCopy: order.quotation_copy || "",
    acceptanceCopy: order.acceptance_file_upload || "",
    totalOrderQty: order.total_qty || 0,
    amount: order.amount_with_tax || 0,
    planned: formatDateTime(row.proforma_invoice_planned),
    rawItems: items,
  }
}

// Maps a row from /api/otp-supabase/proforma-invoice?status=payment-against-pi
// (an otp_proforma_invoice row with payment_against_pi still null, joined
// to its parent otp_orders) into the UI field names proforma-invoice/page.tsx
// expects for that tab.
export function mapProformaInvoicePaymentAgainstPiRowToUI(row: any): any {
  if (!row) return {}

  const order = row.order || {}
  const items = order.items || []

  return {
    id: row.id,
    proformaInvoiceId: row.id,
    orderId: order.id || row.order_id,
    orderNo: order.order_no || "",
    quotationNo: order.quotation_number || "",
    timestamp: formatDateTime(row.created_at),
    companyName: order.company_name || "",
    crmName: order.crm_name || "",
    accessories: (order.items_accessories || []).map((a: any) => `${a.item_name} x${a.quantity}`).join(", "),
    contactPersonName: order.contact_person || "",
    contactNumber: order.phone_number || "",
    paymentMode: order.payment_mode || "",
    billingAddress: order.billing_address || "",
    shippingAddress: order.shipping_address || "",
    paymentTerms: order.payment_terms_days || 0,
    transportMode: order.transport_mode || "",
    destination: order.destination || "",
    poNumber: order.po_number || "",
    quotationCopy: order.quotation_copy || "",
    acceptanceCopy: order.acceptance_file_upload || "",
    totalOrderQty: order.total_qty || 0,
    amount: order.amount_with_tax || 0,

    piNumber: row.pi_number || "",
    piAmount: row.pi_amount ?? "",
    piUploadUrl: row.pi_upload_url || "",
    remark: row.remark || "",
    createdBy: row.created_by || "",
    planned: formatDateTime(order.acceptable?.proforma_invoice_planned),

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
    crmName: order.crm_name || "",
    accessories: (order.items_accessories || []).map((a: any) => `${a.item_name} x${a.quantity}`).join(", "),
    contactPersonName: order.contact_person || "",
    contactNumber: order.phone_number || "",
    paymentMode: order.payment_mode || "",
    billingAddress: order.billing_address || "",
    shippingAddress: order.shipping_address || "",
    paymentTerms: order.payment_terms_days || 0,
    transportMode: order.transport_mode || "",
    destination: order.destination || "",
    poNumber: order.po_number || "",
    quotationCopy: order.quotation_copy || "",
    acceptanceCopy: order.acceptance_file_upload || "",
    totalOrderQty: order.total_qty || 0,
    amount: order.amount_with_tax || 0,

    piNumber: row.pi_number || "",
    piAmount: row.pi_amount ?? "",
    piUploadUrl: row.pi_upload_url || "",
    remark: row.remark || "",
    createdBy: row.created_by || "",
    paymentReceived: row.payment_against_pi || "",
    paymentRemark: row.payment_against_pi_remark || "",
    planned: formatDateTime(order.acceptable?.proforma_invoice_planned),
    // updated_at, not created_at — that's when Payment Against PI was
    // actually confirmed (the row is inserted at PI-submit time but only
    // updated, via payment-against-pi/route.ts, once this stage completes).
    actual: formatDateTime(row.updated_at),

    rawItems: items,
  }
}

// Maps a Pending row from /api/otp-supabase/delivery-note (an
// otp_orders_acceptable row, joined to its parent otp_orders) into the UI
// field names delivery-note/page.tsx expects.
export function mapDeliveryNotePendingRowToUI(row: any): any {
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
    crmName: order.crm_name || "",
    accessories: (order.items_accessories || []).map((a: any) => `${a.item_name} x${a.quantity}`).join(", "),
    contactPersonName: order.contact_person || "",
    contactNumber: order.phone_number || "",
    billingAddress: order.billing_address || "",
    shippingAddress: order.shipping_address || "",
    paymentMode: order.payment_mode || "",
    paymentTerms: order.payment_terms_days || 0,
    transportMode: order.transport_mode || "",
    destination: order.destination || "",
    poNumber: order.po_number || "",
    quotationCopy: order.quotation_copy || "",
    acceptanceCopy: order.acceptance_file_upload || "",
    totalOrderQty: order.total_qty || 0,
    amount: order.amount_with_tax || 0,
    calibrationRequired: order.calibration_required === true ? "YES" : order.calibration_required === false ? "NO" : "",
    calibrationType: order.calibration_type || "",
    DeliveryNoteForInvoiceRequired: order.debit_note_for_invoice_required === true ? "YES" : order.debit_note_for_invoice_required === false ? "NO" : "",
    transportId: order.transport_id || "",
    gstNumber: order.gst_number || "",
    vehicleNumber: order.vehicle_number || "",
    dispatchLocation: order.dispatch_location || "",
    directDispatchDetails: order.direct_dispatch_details || "",
    paymentAttachmentUrl: order.payment_attachment_url || "",
    srnAttachmentUrl: order.srn_attachment_url || "",
    remarks: order.remarks || "",
    planned: formatDateTime(row.debit_note_planned),
    rawItems: items,
  }
}

// Maps a History row from /api/otp-supabase/delivery-note (an
// otp_debit_note row, joined to its parent otp_orders) into the UI field
// names delivery-note/page.tsx expects.
export function mapDeliveryNoteHistoryRowToUI(row: any): any {
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
    crmName: order.crm_name || "",
    accessories: (order.items_accessories || []).map((a: any) => `${a.item_name} x${a.quantity}`).join(", "),
    contactPersonName: order.contact_person || "",
    contactNumber: order.phone_number || "",
    billingAddress: order.billing_address || "",
    shippingAddress: order.shipping_address || "",
    paymentMode: order.payment_mode || "",
    paymentTerms: order.payment_terms_days || 0,
    transportMode: order.transport_mode || "",
    destination: order.destination || "",
    poNumber: order.po_number || "",
    quotationCopy: order.quotation_copy || "",
    acceptanceCopy: order.acceptance_file_upload || "",
    totalOrderQty: order.total_qty || 0,
    amount: order.amount_with_tax || 0,
    calibrationRequired: order.calibration_required === true ? "YES" : order.calibration_required === false ? "NO" : "",
    calibrationType: order.calibration_type || "",
    DeliveryNoteForInvoiceRequired: order.debit_note_for_invoice_required === true ? "YES" : order.debit_note_for_invoice_required === false ? "NO" : "",
    transportId: order.transport_id || "",
    gstNumber: order.gst_number || "",
    vehicleNumber: order.vehicle_number || "",
    dispatchLocation: order.dispatch_location || "",
    directDispatchDetails: order.direct_dispatch_details || "",
    paymentAttachmentUrl: order.payment_attachment_url || "",
    srnAttachmentUrl: order.srn_attachment_url || "",
    remarks: order.remarks || "",

    dnNumber: row.dn_number || "",
    dnAttachmentUrl: row.dn_attachment_url || "",
    createdBy: row.created_by || "",
    planned: formatDateTime(order.acceptable?.debit_note_planned),
    actual: formatDateTime(row.created_at),

    rawItems: items,
  }
}

// Maps a row from /api/otp-supabase/packing-list (Stage 2, against
// otp_orders / otp_orders_acceptable / otp_check_inventory) into the same UI
// field names packing-list/page.tsx's pendingColumns/historyColumns
// already expect. Both the pending and history branches of that API return
// the same { order, acceptance, inventory } shape, so this mapper doesn't
// need to guess which endpoint a row came from.
export function mapCheckInventoryRowToUI(row: any): any {
  if (!row) return {}

  const order = row.order || {}
  const acceptance = row.acceptance || null // Stage 1 outcome, if it exists
  const inventory = row.inventory || null // Stage 2 outcome, only on history rows
  const scanType: "new" | "repeat" | "updated" = row.scanType || "new"

  // "repeat"/"updated" pending rows compare against a specific item subset
  // (the outstanding shortage ledger, or just the quotation-drift delta),
  // not the order's full item list — everything else on the order was
  // already resolved in an earlier wave. Both shapes carry the same
  // {item_name, item_code, shortage_qty, shortageLedgerId?} fields — see
  // packing-list/route.ts's GET.
  const rawItems =
    scanType === "repeat" || scanType === "updated"
      ? (row.shortageItems || []).map((it: any) => ({
          item_name: it.item_name,
          item_code: it.item_code,
          quantity: it.shortage_qty,
          shortageLedgerId: it.shortageLedgerId,
          releasedStockAvailable: it.releasedStockAvailable || [],
        }))
      : order.items || []
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
    companyName: order.company_name || "",
    crmName: order.crm_name || "",
    accessories: (order.items_accessories || []).map((a: any) => `${a.item_name} x${a.quantity}`).join(", "),
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
    totalOrderQty: order.total_qty || 0,

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
    planned: formatDateTime(acceptance?.check_inventory_planned),
    actual: inventory ? formatDateTime(inventory.created_at) : "",

    // Auto-derived, not user-selected — lets the person running Packing
    // List tell at a glance which orders have never had a scan, which are
    // back for a re-check after Indent Creation's Material Received, and
    // which need a recheck because the quotation itself changed after
    // this order was already (fully) scanned before.
    scanType,
    status: scanType === "repeat" ? "Repeat" : scanType === "updated" ? "Updated" : "New",

    // History-only: item names whose live quotation now wants LESS than
    // what's already been processed for this order — see
    // packing-list/route.ts's computeReconciliation. Read-only flag, no
    // edit action — the user is pointed back to Packing List's own
    // Pending tab for anything that CAN still be auto-reconciled.
    overResolvedItems: row.overResolvedItems || [],

    // History-only: whether this scan wave can still be edited (all its
    // Pre-Invoice / Indent Creation / ledger rows uncommitted), its
    // Pre-Invoice state ("pending" | "processed" | "none") for the filter,
    // and the wave's own recorded items (with the quotation-adjusted
    // suggested_ordered_qty) for the edit dialog — see packing-list/route.ts.
    editable: !!row.editable,
    preInvoiceStatus: row.preInvoiceStatus || "",
    inventoryId: inventory?.id || "",
    inventoryItems: inventory?.items || [],

    // items in {name, qty} shape (not {item_name, quantity}) so the existing
    // "Items Not Available" prefill logic in packing-list/page.tsx (which
    // reads item.name/item.qty) keeps working unchanged.
    items: rawItems.map((it: any) => ({
      name: it.item_name,
      qty: it.quantity,
      shortageLedgerId: it.shortageLedgerId,
      releasedStockAvailable: it.releasedStockAvailable || [],
    })),
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
// Outstanding shortage qty for an order. A first-time shortage sits in
// otp_indent_creation (open until Material Received is answered) and only
// moves into the otp_check_inventory_shortage ledger after that — counting
// just the ledger showed 0 for every order whose shortage was still in
// Indent Creation. Needs the route to embed both `shortages` and `indents`.
export function orderPendingShortageQty(order: any): number {
  const ledger = (order?.shortages || [])
    .filter((s: any) => s.status === "pending")
    .reduce((sum: number, s: any) => sum + (Number(s.shortage_qty) || 0), 0)
  const indent = (order?.indents || [])
    .filter((i: any) => i.material_received == null)
    .reduce(
      (sum: number, i: any) => sum + (i.items || []).reduce((s: number, it: any) => s + (Number(it.qty) || 0), 0),
      0
    )
  return ledger + indent
}

export function mapPreInvoiceRowToUI(row: any): any {
  if (!row) return {}

  const order = row.order || {}
  const pendingQty = orderPendingShortageQty(order)

  return {
    id: row.id,
    queueId: row.id,
    orderId: order.id || row.order_id,
    orderNo: order.order_no || "",
    quotationNo: row.quotation_number || order.quotation_number || "",
    timestamp: formatDateTime(row.created_at),
    companyName: order.company_name || "",
    crmName: order.crm_name || "",
    accessories: (order.items_accessories || []).map((a: any) => `${a.item_name} x${a.quantity}`).join(", "),
    contactPersonName: order.contact_person || "",
    contactNumber: order.phone_number || "",
    email: order.email || "",
    sourceStage: row.source_stage || "",
    totalQty: order.total_qty || 0,
    pendingQty,
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
    DeliveryNoteForInvoiceRequired:
      row.debit_note_for_invoice_required === true ? "YES" : row.debit_note_for_invoice_required === false ? "NO" : "",
    transportId: row.transport_id || "",
    gstNumber: row.gst_number || "",
    vehicleNumber: row.vehicle_number || "",
    dispatchLocation: row.dispatch_location || "",
    directDispatchDetails: row.direct_dispatch_details || "",
    paymentAttachmentUrl: row.payment_attachment_url || "",
    srnAttachmentUrl: row.srn_attachment_url || "",
    remarks: row.remarks || "",
    // No fixed planned date exists for Pre-Invoice (created immediately as
    // pending by Check Inventory/Material Received — see Database/33_otp_stage_tat.sql).
    planned: "",
    actual: row.status === "invoiced" ? formatDateTime(row.updated_at) : "",

    // History-only: this wave's qty reductions (see Database/55_otp_released_stock.sql)
    // — a durable trail of why this queue row shipped less than Check
    // Inventory originally queued for it, and where the freed qty went.
    releasedStockReasons: row.released || [],
  }
}

// Maps a Pending row from /api/otp-supabase/delivery-note-for-invoice (an
// otp_pre_invoice_queue row, joined to its parent otp_orders) into the UI
// field names delivery-note-for-invoice/page.tsx expects.
export function mapDeliveryNoteForInvoicePendingRowToUI(row: any): any {
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
    crmName: order.crm_name || "",
    accessories: (order.items_accessories || []).map((a: any) => `${a.item_name} x${a.quantity}`).join(", "),
    contactPersonName: order.contact_person || "",
    contactNumber: order.phone_number || "",
    sourceStage: row.source_stage || "",
    planned: formatDateTime(row.debit_note_planned),
    items: (row.items || []).map((it: any) => ({ name: it.item_name, qty: it.qty, itemCode: it.item_code, installation: it.installation })),
    rawItems: row.items || [],
  }
}

// Maps a History row from /api/otp-supabase/delivery-note-for-invoice (an
// otp_debit_note_for_invoice row, joined to its parent otp_orders +
// otp_pre_invoice_queue) into the UI field names
// delivery-note-for-invoice/page.tsx expects.
export function mapDeliveryNoteForInvoiceHistoryRowToUI(row: any): any {
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
    crmName: order.crm_name || "",
    accessories: (order.items_accessories || []).map((a: any) => `${a.item_name} x${a.quantity}`).join(", "),
    contactPersonName: order.contact_person || "",
    contactNumber: order.phone_number || "",
    sourceStage: queue.source_stage || "",
    items: (queue.items || []).map((it: any) => ({ name: it.item_name, qty: it.qty, itemCode: it.item_code, installation: it.installation })),
    rawItems: queue.items || [],

    amount: row.amount ?? "",
    dnNumber: row.dn_number || "",
    dnAttachmentUrl: row.dn_attachment_url || "",
    createdBy: row.created_by || "",
    planned: formatDateTime(queue.debit_note_planned),
    actual: formatDateTime(row.created_at),
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
    crmName: order.crm_name || "",
    accessories: (order.items_accessories || []).map((a: any) => `${a.item_name} x${a.quantity}`).join(", "),
    contactPersonName: order.contact_person || "",
    contactNumber: order.phone_number || "",
    billingAddress: order.billing_address || "",
    shippingAddress: order.shipping_address || "",
    paymentMode: order.payment_mode || "",
    paymentTerms: order.payment_terms_days || 0,
    transportMode: order.transport_mode || "",
    destination: order.destination || "",
    poNumber: order.po_number || "",
    quotationCopy: order.quotation_copy || "",
    acceptanceCopy: order.acceptance_file_upload || "",
    totalOrderQty: order.total_qty || 0,
    totalQty: order.total_qty || 0,
    pendingQty: orderPendingShortageQty(order),
    amount: order.amount_with_tax || 0,
    sourceStage: row.source_stage || "",
    DeliveryNoteForInvoiceRequired: row.debit_note_for_invoice_required === true ? "YES" : row.debit_note_for_invoice_required === false ? "NO" : "",
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
    invoicedAt: formatDateTime(row.invoiced_at),
    planned: formatDateTime(row.make_invoice_planned),
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
    crmName: order.crm_name || "",
    accessories: (order.items_accessories || []).map((a: any) => `${a.item_name} x${a.quantity}`).join(", "),
    contactPersonName: order.contact_person || "",
    contactNumber: order.phone_number || "",
    billingAddress: order.billing_address || "",
    shippingAddress: order.shipping_address || "",
    paymentMode: order.payment_mode || "",
    paymentTerms: order.payment_terms_days || 0,
    transportMode: order.transport_mode || "",
    destination: order.destination || "",
    poNumber: order.po_number || "",
    quotationCopy: order.quotation_copy || "",
    acceptanceCopy: order.acceptance_file_upload || "",
    totalOrderQty: order.total_qty || 0,
    amount: order.amount_with_tax || 0,

    invoiceNumber: row.invoice_number || "",
    invoiceDate: row.invoice_date || "",
    invoiceUploadUrl: row.invoice_upload_url || "",
    ewayBillNumber: row.eway_bill_number || "",
    ewayBillUploadUrl: row.eway_bill_upload_url || "",
    totalBillAmount: row.total_bill_amount ?? "",
    transportId: row.transport_id || "",
    gstNumber: row.gst_number || "",
    vehicleNumber: row.vehicle_number || "",
    paymentAttachmentUrl: row.payment_attachment_url || "",
    srnAttachmentUrl: row.srn_attachment_url || "",
    calibrationRequired: queue.calibration_required === true ? "YES" : queue.calibration_required === false ? "NO" : "",
    calibrationType: queue.calibration_type || "",
    dispatchLocation: queue.dispatch_location || "",
    directDispatchDetails: queue.direct_dispatch_details || "",
    invoicedAt: formatDateTime(queue.invoiced_at),
    remarks: row.remarks || "",
    createdBy: row.created_by || "",
    planned: formatDateTime(queue.make_invoice_planned),
    actual: formatDateTime(row.created_at),

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
    crmName: order.crm_name || "",
    accessories: (order.items_accessories || []).map((a: any) => `${a.item_name} x${a.quantity}`).join(", "),
    contactPersonName: order.contact_person || "",
    contactNumber: order.phone_number || "",
    invoiceNumber: row.invoice_number || "",
    invoiceDate: row.invoice_date || "",
    invoiceCopyUrl: row.invoice_upload_url || "",
    calibrationType: row.queue?.calibration_type || "",
    planned: formatDateTime(row.calibration_planned),
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
    crmName: order.crm_name || "",
    accessories: (order.items_accessories || []).map((a: any) => `${a.item_name} x${a.quantity}`).join(", "),
    contactPersonName: order.contact_person || "",
    contactNumber: order.phone_number || "",
    invoiceNumber: makeInvoice.invoice_number || "",
    invoiceDate: makeInvoice.invoice_date || "",
    invoiceCopyUrl: makeInvoice.invoice_upload_url || "",
    calibrationType: makeInvoice.queue?.calibration_type || "",

    certificateNumber: row.certificate_number || "",
    certificateType: row.certificate_type || "",
    certificateUploadUrl: row.certificate_upload_url || "",
    remarks: row.remarks || "",
    createdBy: row.created_by || "",
    planned: formatDateTime(makeInvoice.calibration_planned),
    actual: formatDateTime(row.created_at),

    items: (makeInvoice.items || []).map((it: any) => ({ name: it.item_name, qty: it.qty, itemCode: it.item_code })),
    rawItems: makeInvoice.items || [],
  }
}

// Maps a row from /api/otp-supabase/credit-note (status=pending|history) —
// a plain otp_credit_note row, no parent join needed (company/PO/CRM are
// denormalized onto the row itself at creation time — see
// Database/60_credit_note.sql). Same shape for both tabs; `actual`/
// `submittedBy` are only meaningful once status='completed'.
export function mapCreditNoteRowToUI(row: any): any {
  if (!row) return {}

  const items = row.items || []
  return {
    id: row.id,
    invoiceNumber: row.invoice_number || "",
    companyName: row.company_name || "",
    poNumber: row.po_number || "",
    crmName: row.crm_name || "",
    orderNos: Array.from(new Set(items.map((it: any) => it.order_no).filter(Boolean))).join(", "),
    status: row.status || "pending",
    remarks: row.remarks || "",
    createdBy: row.created_by || "",
    submittedBy: row.submitted_by || "",
    timestamp: formatDateTime(row.created_at),
    actual: formatDateTime(row.submitted_at),

    items: items.map((it: any) => ({ name: it.item_name, qty: it.qty, itemCode: it.item_code })),
    rawItems: items,
  }
}

// Maps a Pending row from /api/otp-supabase/packaging-transport (an
// otp_make_invoice row, joined to its parent otp_orders — the pending
// source table, since no otp_packaging_transport row exists yet) into the
// UI field names packaging-transport/page.tsx expects. Packaging and
// Transport branches directly off Make Invoice, in parallel with
// Calibration Certificate — not chained after it.
//
// Two shapes can land here (see
// Database/39_packaging_transport_draft_save.sql):
// - a "fresh" otp_make_invoice row (never opened/saved here yet) —
//   detected by the ABSENCE of `make_invoice_id` (only otp_packaging_
//   transport rows carry that column on themselves).
// - a "draft" otp_packaging_transport row (status='draft' — Before/After
//   Photo already saved, rest of the form not yet submitted) — carries
//   its own `make_invoice_id` plus a nested `makeInvoice`.
export function mapPackagingTransportPendingRowToUI(row: any): any {
  if (!row) return {}

  const order = row.order || {}
  const isDraft = row.make_invoice_id !== undefined && row.make_invoice_id !== null
  const makeInvoice = isDraft ? row.makeInvoice || {} : row

  return {
    id: isDraft ? row.make_invoice_id : row.id,
    makeInvoiceId: isDraft ? row.make_invoice_id : row.id,
    packagingTransportId: isDraft ? row.id : undefined,
    orderId: order.id || row.order_id,
    orderNo: order.order_no || "",
    quotationNo: order.quotation_number || "",
    timestamp: formatDateTime(isDraft ? makeInvoice.created_at : row.created_at),
    companyName: order.company_name || "",
    crmName: order.crm_name || "",
    accessories: (order.items_accessories || []).map((a: any) => `${a.item_name} x${a.quantity}`).join(", "),
    contactPersonName: order.contact_person || "",
    contactNumber: order.phone_number || "",
    invoiceNumber: makeInvoice.invoice_number || "",
    invoiceDate: makeInvoice.invoice_date || "",
    invoiceCopyUrl: makeInvoice.invoice_upload_url || "",
    isDraft,
    // Pre-fill for the process form's Transport Mode select — from the
    // live order (never overwritten there), not this row (which only ever
    // saves a mode once Final-submitted — see packaging-transport/route.ts).
    transportMode: order.transport_mode || "",
    beforePhotoUrls: row.before_photo_urls || [],
    afterPhotoUrls: row.after_photo_urls || [],
    planned: formatDateTime(makeInvoice.packaging_transport_planned),
    items: (makeInvoice.items || []).map((it: any) => ({ name: it.item_name, qty: it.qty, itemCode: it.item_code })),
    rawItems: makeInvoice.items || [],
  }
}

// Maps a History row from /api/otp-supabase/packaging-transport (an
// otp_packaging_transport row, joined to its parent otp_orders +
// otp_make_invoice) into the UI field names packaging-transport/page.tsx
// expects.
export function mapPackagingTransportHistoryRowToUI(row: any): any {
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
    crmName: order.crm_name || "",
    accessories: (order.items_accessories || []).map((a: any) => `${a.item_name} x${a.quantity}`).join(", "),
    contactPersonName: order.contact_person || "",
    contactNumber: order.phone_number || "",
    invoiceNumber: makeInvoice.invoice_number || "",
    invoiceDate: makeInvoice.invoice_date || "",
    invoiceCopyUrl: makeInvoice.invoice_upload_url || "",

    beforePhotoUrls: row.before_photo_urls || [],
    afterPhotoUrls: row.after_photo_urls || [],
    transportMode: row.transport_mode || "",
    receivingCopyUrl: row.receiving_copy_url || "",
    transporterName: row.transporter_name || "",
    transporterContact: row.transporter_contact || "",
    transporterRemarks: row.transporter_remarks || "",
    expenseAmount: row.expense_amount ?? "",
    dispatchStatus: row.dispatch_status || "okay",
    notOkReason: row.not_ok_reason || "",
    createdBy: row.created_by || "",
    planned: formatDateTime(makeInvoice.packaging_transport_planned),
    // updated_at (not created_at) — the same otp_packaging_transport row is
    // reused across the draft -> final two-step save, so created_at is the
    // draft's timestamp, not when the stage was actually completed.
    actual: formatDateTime(row.updated_at),

    items: (makeInvoice.items || []).map((it: any) => ({ name: it.item_name, qty: it.qty, itemCode: it.item_code })),
    rawItems: makeInvoice.items || [],
  }
}

// Maps a Pending row from /api/otp-supabase/bilty-upload (an
// otp_packaging_transport row, joined to its parent otp_orders +
// otp_make_invoice — the pending source table, since no otp_bilty_upload
// row exists yet) into the UI field names bilty-upload/page.tsx expects.
export function mapBiltyUploadPendingRowToUI(row: any): any {
  if (!row) return {}

  const order = row.order || {}
  const makeInvoice = row.makeInvoice || {}

  return {
    id: row.id,
    packagingTransportId: row.id,
    orderId: order.id || row.order_id,
    orderNo: order.order_no || "",
    quotationNo: order.quotation_number || "",
    timestamp: formatDateTime(row.created_at),
    companyName: order.company_name || "",
    crmName: order.crm_name || "",
    accessories: (order.items_accessories || []).map((a: any) => `${a.item_name} x${a.quantity}`).join(", "),
    contactPersonName: order.contact_person || "",
    contactNumber: order.phone_number || "",
    invoiceNumber: makeInvoice.invoice_number || "",
    invoiceDate: makeInvoice.invoice_date || "",
    invoiceCopyUrl: makeInvoice.invoice_upload_url || "",
    transporterName: row.transporter_name || "",
    transporterContact: row.transporter_contact || "",
    biltyNumber: row.bilty_number || "",
    planned: formatDateTime(row.bilty_upload_planned),
    items: (makeInvoice.items || []).map((it: any) => ({ name: it.item_name, qty: it.qty, itemCode: it.item_code })),
    rawItems: makeInvoice.items || [],
  }
}

// Maps a History row from /api/otp-supabase/bilty-upload (an
// otp_bilty_upload row, joined to its parent otp_orders +
// otp_packaging_transport + otp_make_invoice) into the UI field names
// bilty-upload/page.tsx expects.
export function mapBiltyUploadHistoryRowToUI(row: any): any {
  if (!row) return {}

  const order = row.order || {}
  const packagingTransport = row.packagingTransport || {}
  const makeInvoice = packagingTransport.makeInvoice || {}

  return {
    id: row.id,
    orderId: order.id || row.order_id,
    orderNo: order.order_no || "",
    quotationNo: order.quotation_number || "",
    timestamp: formatDateTime(row.created_at),
    companyName: order.company_name || "",
    crmName: order.crm_name || "",
    accessories: (order.items_accessories || []).map((a: any) => `${a.item_name} x${a.quantity}`).join(", "),
    contactPersonName: order.contact_person || "",
    contactNumber: order.phone_number || "",
    invoiceNumber: makeInvoice.invoice_number || "",
    invoiceDate: makeInvoice.invoice_date || "",
    invoiceCopyUrl: makeInvoice.invoice_upload_url || "",
    transporterName: packagingTransport.transporter_name || "",

    biltyTransporterName: row.transporter_name || "",
    transporterContact: row.transporter_contact || "",
    biltyNumber: row.bilty_number || "",
    biltyUploadUrls: row.bilty_upload_urls || [],
    freightCharge: row.freight_charge ?? "",
    hamaliCharge: row.hamali_charge ?? "",
    parkingCharge: row.parking_charge ?? "",
    transporterRemarks: row.transporter_remarks || "",
    createdBy: row.created_by || "",
    planned: formatDateTime(packagingTransport.bilty_upload_planned),
    actual: formatDateTime(row.created_at),

    items: (makeInvoice.items || []).map((it: any) => ({ name: it.item_name, qty: it.qty, itemCode: it.item_code })),
    rawItems: makeInvoice.items || [],
  }
}

// Maps a Pending row from /api/otp-supabase/client-confirmation (an
// otp_bilty_upload row, joined to its parent otp_orders +
// otp_packaging_transport + otp_make_invoice — the pending source table,
// since no otp_client_confirmation row exists yet) into the UI field
// names client-confirmation/page.tsx expects.
export function mapClientConfirmationPendingRowToUI(row: any): any {
  if (!row) return {}

  const order = row.order || {}
  // Two parent shapes (see client-confirmation/route.ts GET): "bilty" rows
  // are otp_bilty_upload rows with packaging info nested under
  // row.packagingTransport; "packaging" rows (Receiving's Section, Bilty
  // Upload skipped) ARE the otp_packaging_transport row itself.
  const isPackaging = row.parentType === "packaging"
  const packagingTransport = isPackaging ? row : row.packagingTransport || {}
  const makeInvoice = (isPackaging ? row.makeInvoice : packagingTransport.makeInvoice) || {}

  return {
    id: row.id,
    biltyUploadId: isPackaging ? undefined : row.id,
    packagingTransportId: isPackaging ? row.id : undefined,
    orderId: order.id || row.order_id,
    orderNo: order.order_no || "",
    quotationNo: order.quotation_number || "",
    timestamp: formatDateTime(row.created_at),
    companyName: order.company_name || "",
    crmName: order.crm_name || "",
    accessories: (order.items_accessories || []).map((a: any) => `${a.item_name} x${a.quantity}`).join(", "),
    contactPersonName: order.contact_person || "",
    contactNumber: order.phone_number || "",
    invoiceNumber: makeInvoice.invoice_number || "",
    transportMode: packagingTransport.transport_mode || "",
    transporterName: packagingTransport.transporter_name || "",
    receivingCopyUrl: isPackaging ? row.receiving_copy_url || "" : "",
    biltyNumber: row.bilty_number || "",
    planned: formatDateTime(row.client_confirmation_planned),
    items: (makeInvoice.items || []).map((it: any) => ({ name: it.item_name, qty: it.qty, itemCode: it.item_code })),
    rawItems: makeInvoice.items || [],
  }
}

// Maps a History row from /api/otp-supabase/client-confirmation (an
// otp_client_confirmation row, joined to its parent otp_orders +
// otp_bilty_upload + otp_packaging_transport + otp_make_invoice) into the
// UI field names client-confirmation/page.tsx expects.
export function mapClientConfirmationHistoryRowToUI(row: any): any {
  if (!row) return {}

  const order = row.order || {}
  const isPackaging = !!row.packaging_transport_id
  const biltyUpload = row.biltyUpload || {}
  // Normal path: nested under biltyUpload.packagingTransport. Receiving's
  // Section path: row.packagingTransport is the direct parent (see GET's
  // top-level `packagingTransport:otp_packaging_transport(...)` join).
  const packagingTransport = isPackaging ? row.packagingTransport || {} : biltyUpload.packagingTransport || {}
  const makeInvoice = packagingTransport.makeInvoice || {}

  return {
    id: row.id,
    orderId: order.id || row.order_id,
    orderNo: order.order_no || "",
    quotationNo: order.quotation_number || "",
    timestamp: formatDateTime(row.created_at),
    companyName: order.company_name || "",
    crmName: order.crm_name || "",
    accessories: (order.items_accessories || []).map((a: any) => `${a.item_name} x${a.quantity}`).join(", "),
    contactPersonName: order.contact_person || "",
    contactNumber: order.phone_number || "",
    invoiceNumber: makeInvoice.invoice_number || "",
    transportMode: packagingTransport.transport_mode || "",
    transporterName: packagingTransport.transporter_name || "",
    receivingCopyUrl: isPackaging ? packagingTransport.receiving_copy_url || "" : "",

    materialReceived: row.material_received || "",
    sitePersonName: row.site_person_name || "",
    clientContactNumber: row.contact_number || "",
    createdBy: row.created_by || "",
    planned: formatDateTime(isPackaging ? packagingTransport.client_confirmation_planned : biltyUpload.client_confirmation_planned),
    actual: formatDateTime(row.created_at),

    items: (makeInvoice.items || []).map((it: any) => ({ name: it.item_name, qty: it.qty, itemCode: it.item_code })),
    rawItems: makeInvoice.items || [],
  }
}

// Maps a row from /api/otp-supabase/indent-creation (an otp_indent_creation
// row, joined to its parent otp_orders) into the UI field names
// indent-creation/page.tsx expects. Same shape across all 3 tabs (Pending /
// Material Received / History) — which tab a row belongs to is derived
// purely from indent_created_at / material_received being null or not
// (see indent-creation/route.ts GET), not stored as its own status field.
export function mapIndentCreationRowToUI(row: any): any {
  if (!row) return {}

  const order = row.order || {}
  const items = row.items || []

  return {
    id: row.id,
    indentId: row.id,
    orderId: order.id || row.order_id,
    orderNo: order.order_no || "",
    quotationNo: order.quotation_number || "",
    timestamp: formatDateTime(row.created_at),
    companyName: order.company_name || "",
    crmName: order.crm_name || "",
    accessories: (order.items_accessories || []).map((a: any) => `${a.item_name} x${a.quantity}`).join(", "),
    contactPersonName: order.contact_person || "",
    contactNumber: order.phone_number || "",
    quotationCopy: order.quotation_copy || "",

    customerWantsMaterialAs: row.customer_wants_material_as || "",
    createdBy: row.created_by || "",
    warehouseLocation: row.warehouse_location || "",
    receivingLeadTime: row.receiving_lead_time ?? "",
    inventoryPhotoUrl: row.inventory_photo_url || "",
    remarks: row.remarks || "",
    indentCreatedAt: formatDateTime(row.indent_created_at),
    pfmsIndentNo: row.pfms_indent_no || "",

    materialReceived: row.material_received || "",
    materialReceivedBy: row.material_received_by || "",
    materialReceivedAt: formatDateTime(row.material_received_at),

    // No fixed planned date exists for Indent Creation (see
    // Database/33_otp_stage_tat.sql) — created as soon as Packing List
    // reports a first-time shortage, no TAT offset.
    planned: "",
    actual: row.material_received ? formatDateTime(row.material_received_at) : formatDateTime(row.indent_created_at),

    items: items.map((it: any) => ({ name: it.item_name, qty: it.qty, itemCode: it.item_code })),
    rawItems: items,
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
