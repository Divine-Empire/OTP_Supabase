import { NextResponse } from "next/server"
import { getSupabaseAdmin } from "@/lib/supabase"

// Stage — Client Confirmation, the final stage.
//
// Reached via EITHER of two parents (exactly one set, see
// Database/59_packaging_dispatch_receiving_section.sql):
//   bilty_upload_id        — normal path, right after Bilty Upload.
//   packaging_transport_id — Receiving's Section path, straight off
//                             Packaging and Dispatch when Bilty Upload was
//                             skipped (self pickup/delivery modes).
//
// Pending: a union of both planned-date sources below, same
//          planned-date pattern as every other stage, just two parents
//          instead of one:
//   otp_bilty_upload.client_confirmation_planned IS NOT NULL AND no
//     matching otp_client_confirmation row yet (bilty_upload_id).
//   otp_packaging_transport.client_confirmation_planned IS NOT NULL AND no
//     matching otp_client_confirmation row yet (packaging_transport_id).
// History: a matching otp_client_confirmation row exists (either parent).
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get("status")
    const supabase = getSupabaseAdmin()

    if (status === "history") {
      const { data, error } = await supabase
        .from("otp_client_confirmation")
        .select(
          "*, order:otp_orders(*), biltyUpload:otp_bilty_upload(client_confirmation_planned, packagingTransport:otp_packaging_transport(transporter_name, transport_mode, receiving_copy_url, makeInvoice:otp_make_invoice(invoice_number, items))), packagingTransport:otp_packaging_transport(transport_mode, receiving_copy_url, client_confirmation_planned, makeInvoice:otp_make_invoice(invoice_number, items))"
        )
        .order("created_at", { ascending: false })
        .limit(200)
      if (error) throw error

      return NextResponse.json({ success: true, data: data || [] })
    }

    const [doneRes, biltyRes, packagingRes] = await Promise.all([
      supabase.from("otp_client_confirmation").select("bilty_upload_id, packaging_transport_id"),
      supabase
        .from("otp_bilty_upload")
        .select("*, order:otp_orders(*), packagingTransport:otp_packaging_transport(transporter_name, transport_mode, makeInvoice:otp_make_invoice(invoice_number, invoice_date, invoice_upload_url, items))")
        .not("client_confirmation_planned", "is", null)
        .order("created_at", { ascending: false }),
      supabase
        .from("otp_packaging_transport")
        .select("*, order:otp_orders(*), makeInvoice:otp_make_invoice(invoice_number, invoice_date, invoice_upload_url, items)")
        .not("client_confirmation_planned", "is", null)
        .order("created_at", { ascending: false }),
    ])
    if (doneRes.error) throw doneRes.error
    if (biltyRes.error) throw biltyRes.error
    if (packagingRes.error) throw packagingRes.error

    const doneBiltyIds = new Set((doneRes.data || []).map((r: any) => r.bilty_upload_id).filter(Boolean))
    const donePackagingIds = new Set((doneRes.data || []).map((r: any) => r.packaging_transport_id).filter(Boolean))

    const fromBilty = (biltyRes.data || [])
      .filter((r: any) => !doneBiltyIds.has(r.id))
      .map((r: any) => ({ ...r, parentType: "bilty" as const }))
    // Receiving's Section rows carry their own order/makeInvoice join
    // directly (no bilty row exists for them at all) — shaped the same way
    // so the frontend doesn't need to branch on parentType for display.
    const fromPackaging = (packagingRes.data || [])
      .filter((r: any) => !donePackagingIds.has(r.id))
      .map((r: any) => ({ ...r, packagingTransport: null, parentType: "packaging" as const }))

    const data = [...fromBilty, ...fromPackaging].sort((a, b) => (a.created_at < b.created_at ? 1 : -1))

    return NextResponse.json({ success: true, data })
  } catch (err: any) {
    console.error("GET /api/otp-supabase/client-confirmation exception:", err)
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { biltyUploadId, packagingTransportId, materialReceived, sitePersonName, contactNumber, createdBy } = body as {
      biltyUploadId?: string
      packagingTransportId?: string
      materialReceived: "Yes" | "No"
      sitePersonName: string
      contactNumber: string
      createdBy?: string
    }

    if (!biltyUploadId && !packagingTransportId) {
      return NextResponse.json({ success: false, error: "Missing biltyUploadId or packagingTransportId" }, { status: 400 })
    }
    if (biltyUploadId && packagingTransportId) {
      return NextResponse.json({ success: false, error: "Only one parent record is expected" }, { status: 400 })
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

    const { data: parentRow, error: parentError } = await supabase
      .from(biltyUploadId ? "otp_bilty_upload" : "otp_packaging_transport")
      .select("order_id")
      .eq("id", biltyUploadId || packagingTransportId)
      .maybeSingle()
    if (parentError) throw parentError
    if (!parentRow) {
      return NextResponse.json(
        { success: false, error: biltyUploadId ? "Bilty Upload record not found" : "Packaging and Dispatch record not found" },
        { status: 404 }
      )
    }

    const { data, error } = await supabase
      .from("otp_client_confirmation")
      .insert({
        bilty_upload_id: biltyUploadId || null,
        packaging_transport_id: packagingTransportId || null,
        order_id: parentRow.order_id,
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
