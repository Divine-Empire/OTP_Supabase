import { NextResponse } from "next/server"
import { getSupabaseAdmin } from "@/lib/supabase"

// Stage — Make Invoice.
//
// Pending: otp_pre_invoice_queue.status = 'invoiced' AND no matching
//          otp_make_invoice row yet (one row per queue wave).
// History: a matching otp_make_invoice row exists.
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get("status")
    const supabase = getSupabaseAdmin()

    if (status === "history") {
      const { data, error } = await supabase
        .from("otp_make_invoice")
        .select("*, order:otp_orders(*), queue:otp_pre_invoice_queue(*)")
        .order("created_at", { ascending: false })
      if (error) throw error

      return NextResponse.json({ success: true, data: data || [] })
    }

    const { data: doneRows, error: doneError } = await supabase.from("otp_make_invoice").select("pre_invoice_queue_id")
    if (doneError) throw doneError
    const doneIds = (doneRows || []).map((r: any) => r.pre_invoice_queue_id).filter(Boolean)

    let query = supabase
      .from("otp_pre_invoice_queue")
      .select("*, order:otp_orders(*)")
      .eq("status", "invoiced")
      .order("invoiced_at", { ascending: false })

    if (doneIds.length > 0) {
      query = query.not("id", "in", `(${doneIds.join(",")})`)
    }

    const { data, error } = await query
    if (error) throw error

    return NextResponse.json({ success: true, data: data || [] })
  } catch (err: any) {
    console.error("GET /api/otp-supabase/make-invoice exception:", err)
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const {
      queueId,
      invoiceNumber,
      invoiceDate,
      invoiceUploadUrl,
      ewayBillNumber,
      ewayBillUploadUrl,
      totalBillAmount,
      remarks,
      createdBy,
    } = body as {
      queueId: string
      invoiceNumber: string
      invoiceDate?: string
      invoiceUploadUrl?: string
      ewayBillNumber?: string
      ewayBillUploadUrl?: string
      totalBillAmount?: number | string
      remarks?: string
      createdBy?: string
    }

    if (!queueId || !invoiceNumber) {
      return NextResponse.json({ success: false, error: "Missing queueId or invoiceNumber" }, { status: 400 })
    }

    const supabase = getSupabaseAdmin()

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
    // Database/27_otp_calibration_certificate.sql). Simple fixed 5-day
    // offset for now, matching otp_stage_tat's own 'calibration' default —
    // a real TAT-table-driven calculation is a later phase, same as every
    // other planned date in this pipeline.
    const calibrationPlanned = queueRow.calibration_required
      ? new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString()
      : null

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
        items: queueRow.items || [],
        remarks: remarks || null,
        created_by: createdBy || null,
        calibration_planned: calibrationPlanned,
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
