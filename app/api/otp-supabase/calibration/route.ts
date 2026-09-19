import { NextResponse } from "next/server"
import { getSupabaseAdmin } from "@/lib/supabase"

// Stage — Calibration Certificate.
//
// Pending: otp_make_invoice.calibration_planned IS NOT NULL (only set when
//          that wave's otp_pre_invoice_queue.calibration_required was true
//          — see make-invoice/route.ts) AND no matching
//          otp_calibration_certificate row yet.
// History: a matching otp_calibration_certificate row exists. A wave with
//          calibration_required = false never gets a planned date, so it
//          never appears here — it just stays done in Make Invoice's own
//          History, as intended.
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get("status")
    const supabase = getSupabaseAdmin()

    if (status === "history") {
      const { data, error } = await supabase
        .from("otp_calibration_certificate")
        .select("*, order:otp_orders(*), makeInvoice:otp_make_invoice(*)")
        .order("created_at", { ascending: false })
      if (error) throw error

      return NextResponse.json({ success: true, data: data || [] })
    }

    const { data: doneRows, error: doneError } = await supabase.from("otp_calibration_certificate").select("make_invoice_id")
    if (doneError) throw doneError
    const doneIds = (doneRows || []).map((r: any) => r.make_invoice_id).filter(Boolean)

    let query = supabase
      .from("otp_make_invoice")
      .select("*, order:otp_orders(*)")
      .not("calibration_planned", "is", null)
      .order("created_at", { ascending: false })

    if (doneIds.length > 0) {
      query = query.not("id", "in", `(${doneIds.join(",")})`)
    }

    const { data, error } = await query
    if (error) throw error

    return NextResponse.json({ success: true, data: data || [] })
  } catch (err: any) {
    console.error("GET /api/otp-supabase/calibration exception:", err)
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { makeInvoiceId, certificateNumber, certificateType, certificateUploadUrl, remarks, createdBy } = body as {
      makeInvoiceId: string
      certificateNumber?: string
      certificateType?: string
      certificateUploadUrl?: string
      remarks?: string
      createdBy?: string
    }

    if (!makeInvoiceId) {
      return NextResponse.json({ success: false, error: "Missing makeInvoiceId" }, { status: 400 })
    }

    const supabase = getSupabaseAdmin()

    const { data: makeInvoiceRow, error: miError } = await supabase
      .from("otp_make_invoice")
      .select("order_id")
      .eq("id", makeInvoiceId)
      .maybeSingle()
    if (miError) throw miError
    if (!makeInvoiceRow) {
      return NextResponse.json({ success: false, error: "Make Invoice record not found" }, { status: 404 })
    }

    const { data, error } = await supabase
      .from("otp_calibration_certificate")
      .insert({
        make_invoice_id: makeInvoiceId,
        order_id: makeInvoiceRow.order_id,
        certificate_number: certificateNumber || null,
        certificate_type: certificateType || null,
        certificate_upload_url: certificateUploadUrl || null,
        remarks: remarks || null,
        created_by: createdBy || null,
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ success: true, data })
  } catch (err: any) {
    console.error("POST /api/otp-supabase/calibration exception:", err)
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
