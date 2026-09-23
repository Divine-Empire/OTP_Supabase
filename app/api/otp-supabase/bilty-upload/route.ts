import { NextResponse } from "next/server"
import { getSupabaseAdmin } from "@/lib/supabase"

// Stage — Bilty Upload, the final stage right after Packaging and
// Transport (see Database/38_otp_bilty_upload.sql).
//
// Pending: otp_packaging_transport.bilty_upload_planned IS NOT NULL AND no
//          matching otp_bilty_upload row yet — same planned-date pattern
//          as every other stage.
// History: a matching otp_bilty_upload row exists.
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get("status")
    const supabase = getSupabaseAdmin()

    if (status === "history") {
      const { data, error } = await supabase
        .from("otp_bilty_upload")
        .select("*, order:otp_orders(*), packagingTransport:otp_packaging_transport(*, makeInvoice:otp_make_invoice(*))")
        .order("created_at", { ascending: false })
      if (error) throw error

      return NextResponse.json({ success: true, data: data || [] })
    }

    const { data: doneRows, error: doneError } = await supabase.from("otp_bilty_upload").select("packaging_transport_id")
    if (doneError) throw doneError
    const doneIds = (doneRows || []).map((r: any) => r.packaging_transport_id).filter(Boolean)

    let query = supabase
      .from("otp_packaging_transport")
      .select("*, order:otp_orders(*), makeInvoice:otp_make_invoice(*)")
      .not("bilty_upload_planned", "is", null)
      .order("created_at", { ascending: false })

    if (doneIds.length > 0) {
      query = query.not("id", "in", `(${doneIds.join(",")})`)
    }

    const { data, error } = await query
    if (error) throw error

    return NextResponse.json({ success: true, data: data || [] })
  } catch (err: any) {
    console.error("GET /api/otp-supabase/bilty-upload exception:", err)
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const {
      packagingTransportId,
      transporterContact,
      biltyNumber,
      biltyUploadUrls,
      freightCharge,
      hamaliCharge,
      parkingCharge,
      transporterRemarks,
      createdBy,
    } = body as {
      packagingTransportId: string
      transporterContact?: string
      biltyNumber?: string
      biltyUploadUrls?: string[]
      freightCharge?: string | number
      hamaliCharge?: string | number
      parkingCharge?: string | number
      transporterRemarks?: string
      createdBy?: string
    }

    if (!packagingTransportId) {
      return NextResponse.json({ success: false, error: "Missing packagingTransportId" }, { status: 400 })
    }

    const supabase = getSupabaseAdmin()

    const { data: packagingTransportRow, error: ptError } = await supabase
      .from("otp_packaging_transport")
      .select("order_id")
      .eq("id", packagingTransportId)
      .maybeSingle()
    if (ptError) throw ptError
    if (!packagingTransportRow) {
      return NextResponse.json({ success: false, error: "Packaging and Transport record not found" }, { status: 404 })
    }

    const toNumberOrNull = (val: unknown) => {
      if (val === undefined || val === null || val === "") return null
      const n = Number(val)
      return Number.isFinite(n) ? n : null
    }

    const { data, error } = await supabase
      .from("otp_bilty_upload")
      .insert({
        packaging_transport_id: packagingTransportId,
        order_id: packagingTransportRow.order_id,
        transporter_contact: transporterContact || null,
        bilty_number: biltyNumber || null,
        bilty_upload_urls: biltyUploadUrls || [],
        freight_charge: toNumberOrNull(freightCharge),
        hamali_charge: toNumberOrNull(hamaliCharge),
        parking_charge: toNumberOrNull(parkingCharge),
        transporter_remarks: transporterRemarks || null,
        created_by: createdBy || null,
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ success: true, data })
  } catch (err: any) {
    console.error("POST /api/otp-supabase/bilty-upload exception:", err)
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
