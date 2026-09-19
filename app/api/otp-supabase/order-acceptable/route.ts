import { NextResponse } from "next/server"
import { getSupabaseAdmin } from "@/lib/supabase"

// Stage 1 — Order Acceptable.
//
// Pending: otp_orders.order_acceptable_planned IS NOT NULL AND no matching
//          otp_orders_acceptable row yet.
// History: a matching otp_orders_acceptable row exists (FK: order_id -> otp_orders.id).
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get("status") // "pending" | "history"
    const supabase = getSupabaseAdmin()

    if (status === "history") {
      const { data, error } = await supabase
        .from("otp_orders_acceptable")
        .select("*, order:otp_orders(*)")
        .order("created_at", { ascending: false })

      if (error) throw error
      return NextResponse.json({ success: true, data: data || [] })
    }

    // Default / "pending": orders whose stage-1 planned date is set but that
    // don't have an otp_orders_acceptable row yet.
    const { data: doneRows, error: doneError } = await supabase
      .from("otp_orders_acceptable")
      .select("order_id")

    if (doneError) throw doneError
    const doneIds = (doneRows || []).map((r: any) => r.order_id).filter(Boolean)

    let query = supabase
      .from("otp_orders")
      .select("*")
      .not("order_acceptable_planned", "is", null)
      .order("created_at", { ascending: false })

    if (doneIds.length > 0) {
      query = query.not("id", "in", `(${doneIds.join(",")})`)
    }

    const { data, error } = await query
    if (error) throw error

    return NextResponse.json({ success: true, data: data || [] })
  } catch (err: any) {
    console.error("GET /api/otp-supabase/order-acceptable exception:", err)
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { orderId, isAcceptable, checklist, remarks, processedBy } = body

    if (!orderId || !isAcceptable) {
      return NextResponse.json(
        { success: false, error: "Missing orderId or isAcceptable" },
        { status: 400 }
      )
    }

    const supabase = getSupabaseAdmin()

    // Stage 2 (Check Inventory) planned date — only meaningful if the order
    // actually moves forward. Simple fixed 3-day offset for now; a real
    // otp_stage_tat-driven calculation is a later phase.
    //
    // Orders paying "pi against advance" get a Pro-Forma Invoice stage
    // inserted before Check Inventory (see Database/28_otp_proforma_invoice.sql):
    // proforma_invoice_planned is set instead, and check_inventory_planned
    // stays null until that stage's own POST
    // (app/api/otp-supabase/proforma-invoice/route.ts) sets it.
    //
    // Orders paying "na" go to Debit Note instead (see
    // Database/31_otp_debit_note.sql) and stop there — debit_note_planned
    // is set and neither check_inventory_planned nor proforma_invoice_planned
    // gets set, since the order doesn't continue past Debit Note.
    //
    // Every other payment mode skips both and goes straight to Check Inventory.
    let checkInventoryPlanned: string | null = null
    let proformaInvoicePlanned: string | null = null
    let debitNotePlanned: string | null = null

    if (isAcceptable === "Yes") {
      const { data: order, error: orderError } = await supabase
        .from("otp_orders")
        .select("payment_mode")
        .eq("id", orderId)
        .maybeSingle()
      if (orderError) throw orderError

      const threeDaysOut = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString()
      if (order?.payment_mode === "pi against advance") {
        proformaInvoicePlanned = threeDaysOut
      } else if (order?.payment_mode === "na") {
        debitNotePlanned = threeDaysOut
      } else {
        checkInventoryPlanned = threeDaysOut
      }
    }

    const { error } = await supabase.from("otp_orders_acceptable").upsert(
      {
        order_id: orderId,
        is_order_acceptable: isAcceptable,
        acceptance_checklist: isAcceptable === "Yes" ? (checklist || []).join(", ") : "",
        remark: remarks || "",
        processed_by: processedBy || "Admin",
        check_inventory_planned: checkInventoryPlanned,
        proforma_invoice_planned: proformaInvoicePlanned,
        debit_note_planned: debitNotePlanned,
      },
      { onConflict: "order_id" }
    )

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error("POST /api/otp-supabase/order-acceptable exception:", err)
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
