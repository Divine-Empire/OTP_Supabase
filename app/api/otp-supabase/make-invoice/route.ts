import { NextResponse } from "next/server"
import { getSupabaseAdmin } from "@/lib/supabase"
import { fetchAllRows } from "@/lib/fetch-all"
import { getStageTatMinutes, addTatMinutes } from "@/lib/tat"
import { parseHistoryParams, applyHistoryFilters, pageJson , crmFacet } from "@/lib/history-filters"
import { requestAccess, scopeRowsByAccess } from "@/lib/request-access"

// Stage — Make Invoice.
//
// Pending: otp_pre_invoice_queue.make_invoice_planned IS NOT NULL (set once
//          Delivery Note (Inv.) has been processed for this wave — see
//          Database/32_otp_debit_note_for_invoice.sql and
//          app/api/otp-supabase/delivery-note-for-invoice/route.ts) AND no
//          matching otp_make_invoice row yet (one row per queue wave).
// History: a matching otp_make_invoice row exists.
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get("status")
    const supabase = getSupabaseAdmin()

    if (status === "history" && searchParams.has("page")) {
      // Server-paged History (hooks/use-stage-list.ts): one page per request, search /
      // CRM filter / access rules applied in SQL on otp_v_make_invoice_history.
      const p = parseHistoryParams(searchParams, [], await requestAccess(request))
      const { data, error, count } = await applyHistoryFilters(
        supabase.from("otp_v_make_invoice_history").select("*", { count: "exact" }),
        p
      )
        .order("created_at", { ascending: false })
        .order("id")
        .range(p.offset, p.to)
      if (error) throw error
      return pageJson(data, count, p, await crmFacet(supabase, "otp_v_make_invoice_history", p))
    }

    // History is server-paged only (?page=, see lib/history-filters.ts).
    if (status === "history") {
      return NextResponse.json({ success: false, error: "History requires ?page=" }, { status: 400 })
    }

    // Anti-join view (Database/72, 73): no done-id list in the URL, and paged
    // past PostgREST's 1000-row cap.
    const data = await fetchAllRows((from, to) =>
      supabase
        .from("otp_v_make_invoice_pending")
        .select("*")
        .order("make_invoice_planned", { ascending: false })
        .order("id")
        .range(from, to)
    )

    return NextResponse.json({ success: true, data: scopeRowsByAccess(data, await requestAccess(request)) })
  } catch (err: any) {
    console.error("GET /api/otp-supabase/make-invoice exception:", err)
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const { actorName } = await requestAccess(request)
    const body = await request.json()
    const {
      queueId,
      invoiceNumber,
      invoiceDate,
      invoiceUploadUrl,
      ewayBillNumber,
      ewayBillUploadUrl,
      totalBillAmount,
      transportId,
      gstNumber,
      vehicleNumber,
      paymentAttachmentUrl,
      srnAttachmentUrl,
      remarks,
    } = body as {
      queueId: string
      invoiceNumber: string
      invoiceDate?: string
      invoiceUploadUrl?: string
      ewayBillNumber?: string
      ewayBillUploadUrl?: string
      totalBillAmount?: number | string
      transportId?: string
      gstNumber?: string
      vehicleNumber?: string
      paymentAttachmentUrl?: string
      srnAttachmentUrl?: string
      remarks?: string
    }

    if (!queueId || !invoiceNumber) {
      return NextResponse.json({ success: false, error: "Missing queueId or invoiceNumber" }, { status: 400 })
    }

    const supabase = getSupabaseAdmin()

    // Multi-wave billing: fold the other selected waves of the same order into
    // queueId first, so one invoice (and one downstream row per stage) covers
    // them all. otp_merge_queue_waves validates same order / all still
    // pending here / at most one Delivery Note (Inv.).
    const mergeIds: string[] = (body.mergeIds || []).filter((m: string) => m && m !== queueId)
    if (mergeIds.length > 0) {
      const { data: waves, error: wavesError } = await supabase
        .from("otp_pre_invoice_queue")
        .select("id, calibration_required, calibration_type")
        .in("id", [queueId, ...mergeIds])
      if (wavesError) throw wavesError

      const { error: mergeError } = await supabase.rpc("otp_merge_queue_waves", {
        p_primary: queueId,
        p_others: mergeIds,
        p_stage: "make_invoice",
      })
      if (mergeError) throw mergeError

      // Combined wave needs calibration if any of its parts did.
      const calibrating = (waves || []).find((w: any) => w.calibration_required)
      const primary = (waves || []).find((w: any) => w.id === queueId)
      if (calibrating && !primary?.calibration_required) {
        const { error: calError } = await supabase
          .from("otp_pre_invoice_queue")
          .update({ calibration_required: true, calibration_type: calibrating.calibration_type })
          .eq("id", queueId)
        if (calError) throw calError
      }
    }

    const { data: queueRow, error: queueError } = await supabase
      .from("otp_pre_invoice_queue")
      .select("order_id, items, calibration_required")
      .eq("id", queueId)
      .eq("status", "invoiced")
      .maybeSingle()
    if (queueError) throw queueError
    if (!queueRow) {
      return NextResponse.json({ success: false, error: "Pre-Invoice wave not found" }, { status: 404 })
    }

    // Calibration Certificate planned date — only set when this wave was
    // flagged for calibration back at Pre-Invoice; a wave with
    // calibration_required = false leaves this null, so it never appears
    // in Calibration Certificate's pending list (see
    // Database/27_otp_calibration_certificate.sql).
    // Planned = this record's creation time (now) + Calibration's TAT.
    const calibrationPlanned = queueRow.calibration_required
      ? addTatMinutes(new Date(), await getStageTatMinutes("calibration"))
      : null

    // Packaging and Transport planned date — set unconditionally, for
    // every wave, independently of calibration_required. Packaging and
    // Transport branches directly off Make Invoice in PARALLEL with
    // Calibration Certificate (not chained after it), so both stages'
    // pending queues populate from this same submit at the same time and
    // are processed independently of each other — see
    // Database/36_packaging_transport_off_make_invoice.sql.
    const packagingTransportPlanned = addTatMinutes(new Date(), await getStageTatMinutes("packaging_transport"))

    const { data, error } = await supabase
      .from("otp_make_invoice")
      .insert({
        order_id: queueRow.order_id,
        pre_invoice_queue_id: queueId,
        invoice_number: invoiceNumber,
        invoice_date: invoiceDate || null,
        invoice_upload_url: invoiceUploadUrl || null,
        eway_bill_number: ewayBillNumber || null,
        eway_bill_upload_url: ewayBillUploadUrl || null,
        total_bill_amount: totalBillAmount ? Number(totalBillAmount) : null,
        transport_id: transportId || null,
        gst_number: gstNumber || null,
        vehicle_number: vehicleNumber || null,
        payment_attachment_url: paymentAttachmentUrl || null,
        srn_attachment_url: srnAttachmentUrl || null,
        items: queueRow.items || [],
        remarks: remarks || null,
        created_by: actorName,
        calibration_planned: calibrationPlanned,
        packaging_transport_planned: packagingTransportPlanned,
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ success: true, data })
  } catch (err: any) {
    console.error("POST /api/otp-supabase/make-invoice exception:", err)
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
