import { NextResponse } from "next/server"
import { getSupabaseAdmin } from "@/lib/supabase"
import { tryCreatePfmsIndent } from "@/lib/pfms"

// Stage — Indent Creation. Replaces the old "Material Received" stage —
// see Database/52_indent_creation_stage.sql. One table backs all 3 tabs:
//
//   Pending            : indent_created_at IS NULL
//   Material Received  : indent_created_at IS NOT NULL AND material_received IS NULL
//   History            : material_received IS NOT NULL ('Yes' or 'No')
//
// An order only ever gets ONE otp_indent_creation row, ever — see
// check-inventory/route.ts. Reaching History here (either answer) is what
// queues the order back into Packing List's own Pending tab for
// re-checking — see material-received/route.ts (the POST sub-route, not
// the old retired page).
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get("status") // "pending" | "material-received" | "history"
    const supabase = getSupabaseAdmin()

    let query = supabase.from("otp_indent_creation").select("*, order:otp_orders(*)")

    if (status === "material-received") {
      query = query.not("indent_created_at", "is", null).is("material_received", null)
    } else if (status === "history") {
      query = query.not("material_received", "is", null).limit(200)
    } else {
      query = query.is("indent_created_at", null)
    }

    const { data, error } = await query.order("created_at", { ascending: false })
    if (error) throw error

    return NextResponse.json({ success: true, data: data || [] })
  } catch (err: any) {
    console.error("GET /api/otp-supabase/indent-creation exception:", err)
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}

// Submits the Indent Creation process form (Pending -> Material Received tab).
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const {
      indentId,
      customerWantsMaterialAs,
      createdBy,
      warehouseLocation,
      receivingLeadTime,
      inventoryPhotoUrl,
      remarks,
    } = body as {
      indentId: string
      customerWantsMaterialAs?: string
      createdBy?: string
      warehouseLocation?: string
      receivingLeadTime?: number | string
      inventoryPhotoUrl?: string
      remarks?: string
    }

    if (!indentId) {
      return NextResponse.json({ success: false, error: "Missing indentId" }, { status: 400 })
    }

    const supabase = getSupabaseAdmin()

    const { data: indentRow, error: fetchError } = await supabase
      .from("otp_indent_creation")
      .select("order_id, items, order:otp_orders(order_no)")
      .eq("id", indentId)
      .maybeSingle()
    if (fetchError) throw fetchError
    if (!indentRow) {
      return NextResponse.json({ success: false, error: "Indent record not found" }, { status: 404 })
    }

    // Best-effort — see lib/pfms.ts. Returns null (and is a no-op) while
    // PFMS_CREATE_INDENT_URL is unset, same as before.
    const generatedIndentNos = await tryCreatePfmsIndent({
      orderNo: (indentRow as any).order?.order_no || "",
      warehouseLocation: warehouseLocation || null,
      leadTime: receivingLeadTime ? Number(receivingLeadTime) : null,
      items: (indentRow.items || []).map((it: any) => ({ item_code: it.item_code, item_name: it.item_name, qty: it.qty })),
    })

    const { error: updateError } = await supabase
      .from("otp_indent_creation")
      .update({
        customer_wants_material_as: customerWantsMaterialAs || null,
        created_by: createdBy || null,
        warehouse_location: warehouseLocation || null,
        receiving_lead_time: receivingLeadTime ? Number(receivingLeadTime) : null,
        inventory_photo_url: inventoryPhotoUrl || null,
        remarks: remarks || null,
        indent_created_at: new Date().toISOString(),
        pfms_indent_no: generatedIndentNos?.[0] || null,
      })
      .eq("id", indentId)
    if (updateError) throw updateError

    // Lets the frontend show a toast distinguishing "PFMS not configured"
    // from "PFMS call actually failed" — tryCreatePfmsIndent collapses both
    // to null itself, so we check the env var separately here.
    const pfmsConfigured = Boolean(process.env.PFMS_CREATE_INDENT_URL)
    const pfmsSuccess = Array.isArray(generatedIndentNos) && generatedIndentNos.length > 0

    return NextResponse.json({
      success: true,
      pfmsConfigured,
      pfmsSuccess,
      pfmsIndentNo: generatedIndentNos?.[0] || null,
    })
  } catch (err: any) {
    console.error("POST /api/otp-supabase/indent-creation exception:", err)
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
