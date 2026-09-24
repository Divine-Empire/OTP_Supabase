import { NextResponse } from "next/server"
import { getSupabaseAdmin } from "@/lib/supabase"

// Stage — Client Confirmation, the final stage right after Bilty Upload
// (see Database/42_otp_client_confirmation.sql).
//
// Pending: otp_bilty_upload.client_confirmation_planned IS NOT NULL AND no
//          matching otp_client_confirmation row yet — same planned-date
//          pattern as every other stage.
// History: a matching otp_client_confirmation row exists.
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get("status")
    const supabase = getSupabaseAdmin()

    if (status === "history") {
      const { data, error } = await supabase
        .from("otp_client_confirmation")
        .select("*, order:otp_orders(*), biltyUpload:otp_bilty_upload(*, packagingTransport:otp_packaging_transport(*, makeInvoice:otp_make_invoice(*)))")
        .order("created_at", { ascending: false })
      if (error) throw error

      return NextResponse.json({ success: true, data: data || [] })
    }

    const { data: doneRows, error: doneError } = await supabase.from("otp_client_confirmation").select("bilty_upload_id")
    if (doneError) throw doneError
    const doneIds = (doneRows || []).map((r: any) => r.bilty_upload_id).filter(Boolean)

    let query = supabase
      .from("otp_bilty_upload")
      .select("*, order:otp_orders(*), packagingTransport:otp_packaging_transport(*, makeInvoice:otp_make_invoice(*))")
      .not("client_confirmation_planned", "is", null)
      .order("created_at", { ascending: false })

    if (doneIds.length > 0) {
      query = query.not("id", "in", `(${doneIds.join(",")})`)
    }

    const { data, error } = await query
    if (error) throw error

    return NextResponse.json({ success: true, data: data || [] })
  } catch (err: any) {
    console.error("GET /api/otp-supabase/client-confirmation exception:", err)
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { biltyUploadId, materialReceived, sitePersonName, contactNumber, createdBy } = body as {
      biltyUploadId: string
      materialReceived: "Yes" | "No"
      sitePersonName: string
      contactNumber: string
      createdBy?: string
    }

    if (!biltyUploadId) {
      return NextResponse.json({ success: false, error: "Missing biltyUploadId" }, { status: 400 })
    }
    if (materialReceived !== "Yes" && materialReceived !== "No") {
      return NextResponse.json({ success: false, error: "Material Received must be Yes or No" }, { status: 400 })
    }
    if (!sitePersonName || !sitePersonName.trim()) {
      return NextResponse.json({ success: false, error: "Site-Person Name is required" }, { status: 400 })
    }
    if (!contactNumber || !contactNumber.trim()) {
      return NextResponse.json({ success: false, error: "Contact Number is required" }, { status: 400 })
    }

    const supabase = getSupabaseAdmin()

    const { data: biltyUploadRow, error: buError } = await supabase
      .from("otp_bilty_upload")
      .select("order_id")
      .eq("id", biltyUploadId)
      .maybeSingle()
    if (buError) throw buError
    if (!biltyUploadRow) {
      return NextResponse.json({ success: false, error: "Bilty Upload record not found" }, { status: 404 })
    }

    const { data, error } = await supabase
      .from("otp_client_confirmation")
      .insert({
        bilty_upload_id: biltyUploadId,
        order_id: biltyUploadRow.order_id,
        material_received: materialReceived,
        site_person_name: sitePersonName.trim(),
        contact_number: contactNumber.trim(),
        created_by: createdBy || null,
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ success: true, data })
  } catch (err: any) {
    console.error("POST /api/otp-supabase/client-confirmation exception:", err)
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
