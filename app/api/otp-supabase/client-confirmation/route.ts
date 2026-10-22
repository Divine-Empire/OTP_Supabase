import { NextResponse } from "next/server"
import { getSupabaseAdmin } from "@/lib/supabase"
import { chunkParams, chunkJson } from "@/lib/history-chunk"
import { parseHistoryParams, applyHistoryFilters, pageJson } from "@/lib/history-filters"

// Stage — Client Confirmation, the final stage.
//
// Its only parent is otp_packaging_transport: every Packaging and Dispatch
// submission sets client_confirmation_planned directly (the Bilty Upload
// stage in between was removed — Database/65_remove_bilty_upload_stage.sql).
//
// Pending: otp_packaging_transport.client_confirmation_planned IS NOT NULL
//          AND no matching otp_client_confirmation row yet.
// History: a matching otp_client_confirmation row exists.
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get("status")
    const supabase = getSupabaseAdmin()

    if (status === "history" && searchParams.has("page")) {
      // Server-paged History (hooks/use-stage-list.ts): one page per request, search /
      // CRM filter / access rules applied in SQL on otp_v_client_confirmation_history.
      const p = parseHistoryParams(searchParams)
      const { data, error, count } = await applyHistoryFilters(
        supabase.from("otp_v_client_confirmation_history").select("*", { count: "exact" }),
        p
      )
        .order("created_at", { ascending: false })
        .order("id")
        .range(p.offset, p.to)
      if (error) throw error
      return pageJson(data, count, p)
    }

    if (status === "history") {
      const { limit, offset, to } = chunkParams(searchParams)
      const { data, error, count } = await supabase
        .from("otp_client_confirmation")
        .select(
          "*, order:otp_orders(*), packagingTransport:otp_packaging_transport(transport_mode, receiving_copy_url, client_confirmation_planned, transporter_name, reference_no, freight_charge, hamali_charge, parking_charge, bilty_upload_urls, makeInvoice:otp_make_invoice(invoice_number, items))",
          { count: "exact" }
        )
        .order("created_at", { ascending: false })
        .order("id")
        .range(offset, to)
      if (error) throw error

      return chunkJson(data, count, offset)
    }

    const [doneRes, packagingRes] = await Promise.all([
      supabase.from("otp_client_confirmation").select("packaging_transport_id"),
      supabase
        .from("otp_packaging_transport")
        .select("*, order:otp_orders(*), makeInvoice:otp_make_invoice(invoice_number, invoice_date, invoice_upload_url, items)")
        .not("client_confirmation_planned", "is", null)
        .order("created_at", { ascending: false }),
    ])
    if (doneRes.error) throw doneRes.error
    if (packagingRes.error) throw packagingRes.error

    const donePackagingIds = new Set((doneRes.data || []).map((r: any) => r.packaging_transport_id))
    const data = (packagingRes.data || []).filter((r: any) => !donePackagingIds.has(r.id))

    return NextResponse.json({ success: true, data })
  } catch (err: any) {
    console.error("GET /api/otp-supabase/client-confirmation exception:", err)
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { packagingTransportId, materialReceived, sitePersonName, contactNumber, createdBy } = body as {
      packagingTransportId: string
      materialReceived: "Yes" | "No"
      sitePersonName: string
      contactNumber: string
      createdBy?: string
    }

    if (!packagingTransportId) {
      return NextResponse.json({ success: false, error: "Missing packagingTransportId" }, { status: 400 })
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
      .from("otp_packaging_transport")
      .select("order_id")
      .eq("id", packagingTransportId)
      .maybeSingle()
    if (parentError) throw parentError
    if (!parentRow) {
      return NextResponse.json({ success: false, error: "Packaging and Dispatch record not found" }, { status: 404 })
    }

    const { data, error } = await supabase
      .from("otp_client_confirmation")
      .insert({
        packaging_transport_id: packagingTransportId,
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
