import { NextResponse } from "next/server"
import { getSupabaseAdmin } from "@/lib/supabase"
import { getStageTatMinutes, addTatMinutes } from "@/lib/tat"

// Stage — Packaging and Transport.
//
// Branches directly off Make Invoice, in PARALLEL with Calibration
// Certificate (not chained after it) — see make-invoice/route.ts, which
// sets packaging_transport_planned unconditionally, for every wave,
// independently of calibration_required. See
// Database/36_packaging_transport_off_make_invoice.sql.
//
// Pending: otp_make_invoice.packaging_transport_planned IS NOT NULL AND no
//          matching otp_packaging_transport row yet — same planned-date
//          pattern as every other stage.
// History: a matching otp_packaging_transport row exists.
//
// On submit here, this route also sets bilty_upload_planned so the row
// shows up in the Bilty Upload stage's Pending queue (see
// Database/38_otp_bilty_upload.sql).
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get("status")
    const supabase = getSupabaseAdmin()

    if (status === "history") {
      const { data, error } = await supabase
        .from("otp_packaging_transport")
        .select("*, order:otp_orders(*), makeInvoice:otp_make_invoice(*)")
        .order("created_at", { ascending: false })
      if (error) throw error

      return NextResponse.json({ success: true, data: data || [] })
    }

    const { data: doneRows, error: doneError } = await supabase.from("otp_packaging_transport").select("make_invoice_id")
    if (doneError) throw doneError
    const doneIds = (doneRows || []).map((r: any) => r.make_invoice_id).filter(Boolean)

    let query = supabase
      .from("otp_make_invoice")
      .select("*, order:otp_orders(*)")
      .not("packaging_transport_planned", "is", null)
      .order("created_at", { ascending: false })

    if (doneIds.length > 0) {
      query = query.not("id", "in", `(${doneIds.join(",")})`)
    }

    const { data, error } = await query
    if (error) throw error

    return NextResponse.json({ success: true, data: data || [] })
  } catch (err: any) {
    console.error("GET /api/otp-supabase/packaging-transport exception:", err)
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const {
      makeInvoiceId,
      beforePhotoUrls,
      afterPhotoUrls,
      transporterName,
      transporterContact,
      biltyNumber,
      biltyUploadUrls,
      freightCharge,
      hamaliCharge,
      parkingCharge,
      transporterRemarks,
      expenseAmount,
      dispatchStatus,
      notOkReason,
      createdBy,
    } = body as {
      makeInvoiceId: string
      beforePhotoUrls?: string[]
      afterPhotoUrls?: string[]
      transporterName: string
      transporterContact?: string
      biltyNumber?: string
      biltyUploadUrls?: string[]
      freightCharge?: string | number
      hamaliCharge?: string | number
      parkingCharge?: string | number
      transporterRemarks?: string
      expenseAmount?: string | number
      dispatchStatus?: string
      notOkReason?: string
      createdBy?: string
    }

    if (!makeInvoiceId) {
      return NextResponse.json({ success: false, error: "Missing makeInvoiceId" }, { status: 400 })
    }
    if (!transporterName || !transporterName.trim()) {
      return NextResponse.json({ success: false, error: "Transporter name is required" }, { status: 400 })
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

    const toNumberOrNull = (val: unknown) => {
      if (val === undefined || val === null || val === "") return null
      const n = Number(val)
      return Number.isFinite(n) ? n : null
    }

    // Bilty Upload planned date — set unconditionally on every submit here,
    // unlocking Bilty Upload's Pending queue (see
    // Database/38_otp_bilty_upload.sql).
    const biltyUploadPlanned = addTatMinutes(new Date(), await getStageTatMinutes("bilty_upload"))

    const { data, error } = await supabase
      .from("otp_packaging_transport")
      .insert({
        make_invoice_id: makeInvoiceId,
        order_id: makeInvoiceRow.order_id,
        before_photo_urls: beforePhotoUrls || [],
        after_photo_urls: afterPhotoUrls || [],
        transporter_name: transporterName.trim(),
        transporter_contact: transporterContact || null,
        bilty_number: biltyNumber || null,
        bilty_upload_urls: biltyUploadUrls || [],
        freight_charge: toNumberOrNull(freightCharge),
        hamali_charge: toNumberOrNull(hamaliCharge),
        parking_charge: toNumberOrNull(parkingCharge),
        transporter_remarks: transporterRemarks || null,
        expense_amount: toNumberOrNull(expenseAmount),
        dispatch_status: dispatchStatus === "notokay" ? "notokay" : "okay",
        not_ok_reason: dispatchStatus === "notokay" ? notOkReason || null : null,
        created_by: createdBy || null,
        bilty_upload_planned: biltyUploadPlanned,
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ success: true, data })
  } catch (err: any) {
    console.error("POST /api/otp-supabase/packaging-transport exception:", err)
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
