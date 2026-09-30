import { NextResponse } from "next/server"
import { getSupabaseAdmin } from "@/lib/supabase"

// Confirms Material Received (Yes/No) on an otp_indent_creation row —
// moves it from the "Material Received" tab to "History" (any answer sets
// material_received, which is the sole History gate — see
// indent-creation/route.ts GET). Either answer also queues the order back
// into Packing List's own Pending tab (as a "repeat" scan) by opening one
// otp_check_inventory_shortage ledger row per item on this indent — actual
// physical stock only ever gets confirmed at that next Packing List scan,
// this Yes/No is just the paperwork/vendor-side signal.
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { indentId, materialReceived, materialReceivedBy } = body as {
      indentId: string
      materialReceived?: "Yes" | "No"
      materialReceivedBy?: string
    }

    if (!indentId || (materialReceived !== "Yes" && materialReceived !== "No")) {
      return NextResponse.json(
        { success: false, error: "Missing indentId or materialReceived" },
        { status: 400 }
      )
    }

    const supabase = getSupabaseAdmin()

    const { data: indentRow, error: fetchError } = await supabase
      .from("otp_indent_creation")
      .select("order_id, check_inventory_id, items")
      .eq("id", indentId)
      .maybeSingle()
    if (fetchError) throw fetchError
    if (!indentRow) {
      return NextResponse.json({ success: false, error: "Indent record not found" }, { status: 404 })
    }

    const { error: updateError } = await supabase
      .from("otp_indent_creation")
      .update({
        material_received: materialReceived,
        material_received_by: materialReceivedBy || null,
        material_received_at: new Date().toISOString(),
      })
      .eq("id", indentId)
    if (updateError) throw updateError

    const items = (indentRow.items || []) as { item_code: string; item_name: string; qty: number }[]
    if (items.length > 0) {
      const ledgerRows = items.map((it) => ({
        order_id: indentRow.order_id,
        check_inventory_id: indentRow.check_inventory_id,
        item_code: it.item_code,
        item_name: it.item_name,
        shortage_qty: it.qty,
      }))
      const { error: ledgerError } = await supabase.from("otp_check_inventory_shortage").insert(ledgerRows)
      if (ledgerError) throw ledgerError
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error("POST /api/otp-supabase/indent-creation/material-received exception:", err)
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
