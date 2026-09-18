import { NextResponse } from "next/server"
import { getSupabaseAdmin } from "@/lib/supabase"

// Stage — Material Received.
//
// Mirrors Check Inventory's own scan -> compare -> submit flow, just
// sourced from otp_material_shortage instead of the order's original
// item list: scan whatever's now in the warehouse against the currently
// outstanding shortage items for an order, compare, then split each item
// into "found this time" (-> a new otp_pre_invoice_queue wave) and
// "still short" (-> a fresh otp_material_shortage row).
//
// Rows are immutable once processed rather than edited in place — most
// orders don't get fully received in one attempt, so overwriting
// received_qty on the same row would lose the history of each attempt.
// Instead: the row being processed flips to status='processed' and,
// if anything is still missing, a NEW row (parent_shortage_id pointing
// back to it) carries the remainder forward as the next 'pending' row.
// See Database/24_material_received_chain_and_pipeline_view.sql.
//
// Pending: grouped by order — every order with at least one
//          otp_material_shortage row still in status='pending'.
// History: otp_material_shortage rows already status='processed'
//          (item-level, not grouped — each row is its own attempt record).
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get("status") === "history" ? "processed" : "pending"
    const supabase = getSupabaseAdmin()

    const { data, error } = await supabase
      .from("otp_material_shortage")
      .select("*, order:otp_orders(*)")
      .eq("status", status)
      .order("created_at", { ascending: false })
    if (error) throw error

    if (status === "processed") {
      // History stays item-level: one row per past processing attempt.
      return NextResponse.json({ success: true, data: data || [] })
    }

    // Pending is grouped by order — one card/row per order, carrying all
    // of its currently outstanding shortage items to scan together.
    const byOrder = new Map<string, { order: any; shortageItems: any[] }>()
    for (const row of data || []) {
      const orderId = row.order_id
      if (!byOrder.has(orderId)) {
        byOrder.set(orderId, { order: row.order, shortageItems: [] })
      }
      byOrder.get(orderId)!.shortageItems.push(row)
    }

    return NextResponse.json({ success: true, data: Array.from(byOrder.values()) })
  } catch (err: any) {
    console.error("GET /api/otp-supabase/material-received exception:", err)
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}

interface ScanItemPayload {
  shortageId: string
  item_code: string
  item_name: string
  scanned_qty: number
  serials?: string[]
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { orderId, items, warehouseLocation, createdBy, remarks } = body as {
      orderId: string
      items: ScanItemPayload[]
      warehouseLocation?: string
      createdBy?: string
      remarks?: string
    }

    if (!orderId || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ success: false, error: "Missing orderId or items" }, { status: 400 })
    }

    const supabase = getSupabaseAdmin()

    const shortageIds = items.map((it) => it.shortageId)
    const { data: shortageRows, error: shortageFetchError } = await supabase
      .from("otp_material_shortage")
      .select("*")
      .in("id", shortageIds)
      .eq("order_id", orderId)
      .eq("status", "pending")
    if (shortageFetchError) throw shortageFetchError

    const shortageById = new Map((shortageRows || []).map((r: any) => [r.id, r]))

    const { data: order, error: orderError } = await supabase
      .from("otp_orders")
      .select("order_no, quotation_number")
      .eq("id", orderId)
      .maybeSingle()
    if (orderError) throw orderError
    if (!order) {
      return NextResponse.json({ success: false, error: "Order not found" }, { status: 404 })
    }

    const processedRowIds: string[] = []
    const stillShortItems: { item_code: string; item_name: string; qty: number }[] = []
    const foundItems: { item_code: string; item_name: string; qty: number }[] = []
    const successorTemplates: any[] = []

    for (const payload of items) {
      const shortage = shortageById.get(payload.shortageId)
      if (!shortage) continue // already processed or doesn't belong to this order — skip rather than fail the whole batch

      const indented = Number(shortage.indented_qty) || 0
      const foundQty = Math.max(0, Math.min(Number(payload.scanned_qty) || 0, indented))
      const stillShort = indented - foundQty

      processedRowIds.push(shortage.id)

      if (foundQty > 0) {
        foundItems.push({ item_code: shortage.item_code, item_name: shortage.item_name, qty: foundQty })
      }
      if (stillShort > 0) {
        stillShortItems.push({ item_code: shortage.item_code, item_name: shortage.item_name, qty: stillShort })
        successorTemplates.push({
          order_id: shortage.order_id,
          check_inventory_id: shortage.check_inventory_id,
          item_code: shortage.item_code,
          item_name: shortage.item_name,
          indented_qty: stillShort,
          warehouse_location: warehouseLocation || shortage.warehouse_location || null,
          remark: remarks || null,
          parent_shortage_id: shortage.id,
        })
      }

      const { error: closeError } = await supabase
        .from("otp_material_shortage")
        .update({
          status: "processed",
          received_qty: foundQty,
          warehouse_location: warehouseLocation || shortage.warehouse_location || null,
          remark: remarks || shortage.remark || null,
        })
        .eq("id", shortage.id)
      if (closeError) throw closeError
    }

    if (processedRowIds.length === 0) {
      return NextResponse.json(
        { success: false, error: "None of the submitted items matched an outstanding shortage row for this order" },
        { status: 400 }
      )
    }

    // No PFMS re-indent here, by design: an indent only ever gets raised
    // once, at the original Check Inventory shortage (see
    // check-inventory/route.ts). Material Received's own still-short
    // remainder just becomes a new pending row in this same stage —
    // pfms_indent_no stays null on it.
    if (successorTemplates.length > 0) {
      const { error: successorError } = await supabase.from("otp_material_shortage").insert(successorTemplates)
      if (successorError) throw successorError
    }

    // Whatever was found this time becomes a new Pre-Invoice wave for the
    // same order — mirrors Check Inventory's own available-qty insert.
    if (foundItems.length > 0) {
      const { error: queueError } = await supabase.from("otp_pre_invoice_queue").insert({
        order_id: orderId,
        quotation_number: order.quotation_number || null,
        source_stage: "material_received",
        source_id: processedRowIds[0],
        items: foundItems,
      })
      if (queueError) throw queueError
    }

    return NextResponse.json({
      success: true,
      foundCount: foundItems.length,
      stillShortCount: stillShortItems.length,
    })
  } catch (err: any) {
    console.error("POST /api/otp-supabase/material-received exception:", err)
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
