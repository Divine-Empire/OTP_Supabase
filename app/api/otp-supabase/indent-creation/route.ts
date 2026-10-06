import { NextResponse } from "next/server"
import { getSupabaseAdmin } from "@/lib/supabase"
import { tryCreatePfmsIndent } from "@/lib/pfms"

// Stage — Indent Creation. Replaces the old "Material Received" stage —
// see Database/52_indent_creation_stage.sql. One table backs all 3 tabs:
//
//   Pending            : indent_created_at IS NULL AND material_received IS NULL
//   Material Received  : indent_created_at IS NOT NULL AND material_received IS NULL
//   History            : material_received IS NOT NULL ('Yes', 'No' or 'Rejected')
//
// An order can get more than one row, one per item name's first-time
// shortage — see packing-list/route.ts. Reaching History via Yes/No queues
// the order back into Packing List's own Pending tab for re-checking (see
// material-received/route.ts); 'Rejected' (PATCH below) does not.
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
      // material_received IS NULL too — a 'Rejected' row never gets
      // indent_created_at, so this alone would keep it in Pending.
      query = query.is("indent_created_at", null).is("material_received", null)
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
      .select("order_id, items, indent_created_at, material_received, order:otp_orders(order_no)")
      .eq("id", indentId)
      .maybeSingle()
    if (fetchError) throw fetchError
    if (!indentRow) {
      return NextResponse.json({ success: false, error: "Indent record not found" }, { status: 404 })
    }
    if (indentRow.indent_created_at || indentRow.material_received) {
      return NextResponse.json({ success: false, error: "Indent already processed" }, { status: 409 })
    }

    // Items whose qty dropped to 0 (quotation reduced/removed after the
    // shortage was raised) are dropped here rather than indented, and saved
    // back so Material Received later only opens ledger rows for real qty.
    const liveItems = ((indentRow.items || []) as any[]).filter((it) => (Number(it.qty) || 0) > 0)
    if (liveItems.length === 0) {
      return NextResponse.json(
        { success: false, error: "All items are 0 qty — edit the qty or reject this indent instead" },
        { status: 400 }
      )
    }

    // Best-effort — see lib/pfms.ts. Returns null (and is a no-op) while
    // PFMS_CREATE_INDENT_URL is unset, same as before.
    const generatedIndentNos = await tryCreatePfmsIndent({
      orderNo: (indentRow as any).order?.order_no || "",
      warehouseLocation: warehouseLocation || null,
      leadTime: receivingLeadTime ? Number(receivingLeadTime) : null,
      items: liveItems.map((it: any) => ({ item_code: it.item_code, item_name: it.item_name, qty: it.qty })),
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
        items: liveItems,
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

// Pending-tab only (indent_created_at IS NULL) actions on a row:
//   editQty — set each item's qty (>= 0), matched by item_name.
//   reject  — only when every item is 0 qty: straight to History as
//             'Rejected'. No PFMS indent, and deliberately no
//             otp_check_inventory_shortage ledger row (unlike Material
//             Received), so the order is NOT queued back into Packing List.
export async function PATCH(request: Request) {
  try {
    const body = await request.json()
    const { indentId, action, items, by } = body as {
      indentId: string
      action: "editQty" | "reject"
      items?: { item_name: string; qty: number }[]
      by?: string
    }

    if (!indentId || (action !== "editQty" && action !== "reject")) {
      return NextResponse.json({ success: false, error: "Missing indentId or invalid action" }, { status: 400 })
    }

    const supabase = getSupabaseAdmin()
    const { data: row, error: fetchError } = await supabase
      .from("otp_indent_creation")
      .select("items, indent_created_at, material_received")
      .eq("id", indentId)
      .maybeSingle()
    if (fetchError) throw fetchError
    if (!row) return NextResponse.json({ success: false, error: "Indent record not found" }, { status: 404 })
    if (row.indent_created_at || row.material_received) {
      return NextResponse.json({ success: false, error: "Only Pending indents can be edited or rejected" }, { status: 409 })
    }

    const current = (row.items || []) as any[]

    if (action === "editQty") {
      if (!Array.isArray(items)) {
        return NextResponse.json({ success: false, error: "Missing items" }, { status: 400 })
      }
      const qtyByName = new Map(items.map((it) => [(it.item_name || "").trim().toLowerCase(), Number(it.qty)]))
      for (const q of qtyByName.values()) {
        if (!Number.isFinite(q) || q < 0) {
          return NextResponse.json({ success: false, error: "Qty must be 0 or more" }, { status: 400 })
        }
      }
      const updated = current.map((it) => {
        const key = (it.item_name || "").trim().toLowerCase()
        return qtyByName.has(key) ? { ...it, qty: qtyByName.get(key) } : it
      })
      const { error } = await supabase.from("otp_indent_creation").update({ items: updated }).eq("id", indentId)
      if (error) throw error
      return NextResponse.json({ success: true })
    }

    if (current.some((it) => (Number(it.qty) || 0) > 0)) {
      return NextResponse.json(
        { success: false, error: "Only an indent whose items are all 0 qty can be rejected" },
        { status: 400 }
      )
    }
    const { error } = await supabase
      .from("otp_indent_creation")
      .update({
        material_received: "Rejected",
        material_received_by: by || null,
        material_received_at: new Date().toISOString(),
      })
      .eq("id", indentId)
      .is("indent_created_at", null)
      .is("material_received", null)
    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error("PATCH /api/otp-supabase/indent-creation exception:", err)
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
