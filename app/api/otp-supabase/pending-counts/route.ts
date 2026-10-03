import { NextResponse } from "next/server"
import { getSupabaseAdmin } from "@/lib/supabase"

// Lightweight, sidebar-only counterpart to /api/otp-supabase/dashboard's
// pipelineStages — same "planned IS NOT NULL AND no matching child row"
// logic each stage's own GET route uses, but stripped down to just the
// counts (no orders/customers/monthly-trend work) since this runs on every
// page load (Sidebar remounts on every navigation — see main-layout.tsx).
// Keyed directly by the sidebar's own kebab-case `step` values so the
// component can look counts up with zero translation.
export async function GET() {
  try {
    const supabase = getSupabaseAdmin()

    const [
      ordersRes,
      acceptableRes,
      proformaRes,
      DeliveryNoteRes,
      checkInvRes,
      indentRes,
      repeatShortageRes,
      queueRes,
      DeliveryNoteInvRes,
      makeInvoiceRes,
      calibrationRes,
      packagingTransportRes,
      biltyUploadRes,
      clientConfirmationRes,
    ] = await Promise.all([
      supabase.from("otp_orders").select("id"),
      supabase.from("otp_orders_acceptable").select("order_id, check_inventory_planned, proforma_invoice_planned, debit_note_planned"),
      supabase.from("otp_proforma_invoice").select("order_id"),
      supabase.from("otp_debit_note").select("order_id"),
      supabase.from("otp_check_inventory").select("order_id"),
      supabase.from("otp_indent_creation").select("order_id, indent_created_at"),
      supabase.from("otp_check_inventory_shortage").select("order_id").eq("status", "pending"),
      supabase.from("otp_pre_invoice_queue").select("id, status, debit_note_planned, make_invoice_planned"),
      supabase.from("otp_debit_note_for_invoice").select("pre_invoice_queue_id"),
      supabase.from("otp_make_invoice").select("id, pre_invoice_queue_id, calibration_planned, packaging_transport_planned"),
      supabase.from("otp_calibration_certificate").select("make_invoice_id"),
      supabase.from("otp_packaging_transport").select("id, make_invoice_id, status, bilty_upload_planned"),
      supabase.from("otp_bilty_upload").select("id, packaging_transport_id, client_confirmation_planned"),
      supabase.from("otp_client_confirmation").select("bilty_upload_id"),
    ])

    for (const r of [
      ordersRes, acceptableRes, proformaRes, DeliveryNoteRes, checkInvRes, indentRes, repeatShortageRes, queueRes,
      DeliveryNoteInvRes, makeInvoiceRes, calibrationRes, packagingTransportRes, biltyUploadRes, clientConfirmationRes,
    ]) {
      if (r.error) throw r.error
    }

    const orders = ordersRes.data || []
    const acceptableRows = acceptableRes.data || []
    const proformaDoneIds = new Set((proformaRes.data || []).map((r: any) => r.order_id))
    const DeliveryNoteDoneIds = new Set((DeliveryNoteRes.data || []).map((r: any) => r.order_id))
    const checkInvDoneIds = new Set((checkInvRes.data || []).map((r: any) => r.order_id))
    const indentRows = indentRes.data || []
    const repeatShortageOrderIds = new Set((repeatShortageRes.data || []).map((r: any) => r.order_id))
    const queueRows = queueRes.data || []
    const DeliveryNoteInvDoneIds = new Set((DeliveryNoteInvRes.data || []).map((r: any) => r.pre_invoice_queue_id))
    const makeInvoiceRows = makeInvoiceRes.data || []
    const makeInvoiceDoneQueueIds = new Set(makeInvoiceRows.map((r: any) => r.pre_invoice_queue_id).filter(Boolean))
    const calibrationDoneIds = new Set((calibrationRes.data || []).map((r: any) => r.make_invoice_id))
    const packagingTransportRows = packagingTransportRes.data || []
    const packagingSubmittedIds = new Set(
      packagingTransportRows.filter((r: any) => r.status === "submitted").map((r: any) => r.make_invoice_id)
    )
    const biltyUploadRows = biltyUploadRes.data || []
    const biltyDoneIds = new Set((biltyUploadRows.map((r: any) => r.packaging_transport_id)).filter(Boolean))
    const clientConfirmationDoneIds = new Set(
      (clientConfirmationRes.data || []).map((r: any) => r.bilty_upload_id).filter(Boolean)
    )

    const acceptableDoneIds = new Set(acceptableRows.map((r: any) => r.order_id))

    const data: Record<string, number> = {
      "order-acceptable": orders.length - acceptableDoneIds.size,
      "proforma-invoice": acceptableRows.filter((r: any) => r.proforma_invoice_planned && !proformaDoneIds.has(r.order_id)).length,
      "delivery-note": acceptableRows.filter((r: any) => r.debit_note_planned && !DeliveryNoteDoneIds.has(r.order_id)).length,
      "packing-list":
        acceptableRows.filter((r: any) => r.check_inventory_planned && !checkInvDoneIds.has(r.order_id)).length +
        repeatShortageOrderIds.size,
      "indent-creation": indentRows.filter((r: any) => !r.indent_created_at).length,
      "pre-invoice": queueRows.filter((r: any) => r.status === "pending").length,
      "delivery-note-for-invoice": queueRows.filter((r: any) => r.debit_note_planned && !DeliveryNoteInvDoneIds.has(r.id)).length,
      "make-invoice": queueRows.filter((r: any) => r.make_invoice_planned && !makeInvoiceDoneQueueIds.has(r.id)).length,
      calibration: makeInvoiceRows.filter((r: any) => r.calibration_planned && !calibrationDoneIds.has(r.id)).length,
      "packaging-transport": makeInvoiceRows.filter((r: any) => r.packaging_transport_planned && !packagingSubmittedIds.has(r.id)).length,
      "bilty-upload": packagingTransportRows.filter((r: any) => r.bilty_upload_planned && !biltyDoneIds.has(r.id)).length,
      "client-confirmation": biltyUploadRows.filter((r: any) => r.client_confirmation_planned && !clientConfirmationDoneIds.has(r.id)).length,
    }

    return NextResponse.json({ success: true, data })
  } catch (err: any) {
    console.error("GET /api/otp-supabase/pending-counts exception:", err)
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
