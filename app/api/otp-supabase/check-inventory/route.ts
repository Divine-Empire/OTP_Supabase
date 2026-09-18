import { NextResponse } from "next/server"
import { getSupabaseAdmin } from "@/lib/supabase"

// otp_orders.items only carries {item_name, quantity} — it was populated
// straight from lto_enquiry_items/lto_lead_items, neither of which track an
// item_code. The QR-scan compare step needs item_code (a name match would be
// fragile — see the Purchase-FMS-Supabase item-master duplicate/typo issues
// found earlier), so resolve it here via lto_items, which lives in the same
// database as otp_orders and does have one. Best-effort: an item_name with
// no lto_items match just gets item_code: null and falls back to name
// matching in the UI.
async function enrichOrderItemsWithCode(supabase: ReturnType<typeof getSupabaseAdmin>, rows: any[]) {
  const allNames = new Set<string>()
  for (const r of rows) {
    for (const it of r.order?.items || []) {
      if (it?.item_name) allNames.add(it.item_name)
    }
  }
  if (allNames.size === 0) return rows

  const { data: masterItems } = await supabase
    .from("lto_items")
    .select("item_name, item_code")
    .in("item_name", Array.from(allNames))

  const codeByName = new Map(
    (masterItems || []).map((m: any) => [(m.item_name || "").trim().toLowerCase(), m.item_code])
  )

  for (const r of rows) {
    if (!r.order?.items) continue
    r.order.items = r.order.items.map((it: any) => ({
      ...it,
      item_code: codeByName.get((it.item_name || "").trim().toLowerCase()) || null,
    }))
  }
  return rows
}

// Stage 2 — Check Inventory.
//
// Pending: otp_orders_acceptable.check_inventory_planned IS NOT NULL AND no
//          matching otp_check_inventory row yet.
// History: a matching otp_check_inventory row exists (FK: order_id -> otp_orders.id).
//
// Both branches return the same shape so the frontend mapper doesn't need to
// branch on which endpoint it came from: { order, acceptance, inventory }.
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get("status") // "pending" | "history"
    const supabase = getSupabaseAdmin()

    if (status === "history") {
      const { data: inventoryRows, error } = await supabase
        .from("otp_check_inventory")
        .select("*, order:otp_orders(*)")
        .order("created_at", { ascending: false })

      if (error) throw error

      const orderIds = (inventoryRows || []).map((r: any) => r.order_id).filter(Boolean)
      let acceptanceMap = new Map<string, any>()
      if (orderIds.length > 0) {
        const { data: acceptanceRows, error: acceptanceError } = await supabase
          .from("otp_orders_acceptable")
          .select("*")
          .in("order_id", orderIds)
        if (acceptanceError) throw acceptanceError
        acceptanceMap = new Map((acceptanceRows || []).map((a: any) => [a.order_id, a]))
      }

      const shaped = (inventoryRows || []).map((r: any) => {
        const { order, ...inventory } = r
        return { order, acceptance: acceptanceMap.get(r.order_id) || null, inventory }
      })
      await enrichOrderItemsWithCode(supabase, shaped)

      return NextResponse.json({ success: true, data: shaped })
    }

    // Default / "pending": orders whose stage-2 planned date (on
    // otp_orders_acceptable) is set but that don't have an
    // otp_check_inventory row yet.
    const { data: doneRows, error: doneError } = await supabase
      .from("otp_check_inventory")
      .select("order_id")

    if (doneError) throw doneError
    const doneIds = (doneRows || []).map((r: any) => r.order_id).filter(Boolean)

    let query = supabase
      .from("otp_orders_acceptable")
      .select("*, order:otp_orders(*)")
      .not("check_inventory_planned", "is", null)
      .order("created_at", { ascending: false })

    if (doneIds.length > 0) {
      query = query.not("order_id", "in", `(${doneIds.join(",")})`)
    }

    const { data, error } = await query
    if (error) throw error

    const shaped = (data || []).map((r: any) => {
      const { order, ...acceptance } = r
      return { order, acceptance, inventory: null }
    })
    await enrichOrderItemsWithCode(supabase, shaped)

    return NextResponse.json({ success: true, data: shaped })
  } catch (err: any) {
    console.error("GET /api/otp-supabase/check-inventory exception:", err)
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}

interface ScanItemPayload {
  item_code: string
  item_name: string
  ordered_qty: number
  scanned_qty: number
  serials?: string[]
}

// Best-effort cross-system call into Purchase-FMS-Supabase's own
// create-indent API to raise a real indent for the shortage qty. This is
// intentionally fire-and-forget from otp_material_shortage's point of
// view: that table's own `status` never depends on whether this call
// succeeded, or on matching its returned indentNo back to anything later
// (the same item_code can legitimately have other, unrelated indents
// already in flight in PFMS — indentNo is stored purely as an audit
// reference). If PFMS_CREATE_INDENT_URL isn't configured, or the call
// fails for any reason (network, item not yet registered in PFMS's Item
// Master, etc.), we just skip it and leave pfms_indent_no null.
async function tryCreatePfmsIndent(params: {
  orderNo: string
  warehouseLocation: string | null
  leadTime: number | null
  items: { item_code: string; item_name: string; qty: number }[]
}): Promise<string[] | null> {
  const baseUrl = process.env.PFMS_CREATE_INDENT_URL
  if (!baseUrl || params.items.length === 0) return null

  try {
    const res = await fetch(`${baseUrl.replace(/\/$/, "")}/api/create-indent`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "insertIndent",
        createdBy: "OTP System (auto)",
        warehouseLocation: params.warehouseLocation || "",
        leadTime: params.leadTime,
        attachment: null,
        items: params.items.map((it) => ({
          category: "", // PFMS validates category+itemName against its own Item Master;
          itemName: it.item_name, // items unknown there will make the whole call fail —
          quantity: it.qty, // acceptable, since this is best-effort only.
          uom: "NOS",
          itemCode: it.item_code,
        })),
        // Only used as a human-readable trail on the PFMS side — see the
        // note on this function: never used as a tracking/join key back here.
        remarks: `OTP Order: ${params.orderNo}`,
      }),
      signal: AbortSignal.timeout(8000),
    })
    const json = await res.json()
    if (json.success && Array.isArray(json.generatedIds)) {
      return json.generatedIds
    }
    console.warn("PFMS create-indent call did not succeed:", json.error)
    return null
  } catch (err) {
    console.warn("PFMS create-indent call failed (non-blocking):", err)
    return null
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const {
      orderId,
      items, // ScanItemPayload[] — every item on the order, scanned or not
      customerWantsMaterialAs,
      createdBy,
      warehouseLocation,
      inventoryPhotoUrl,
      leadTime,
      remarks,
    } = body as {
      orderId: string
      items: ScanItemPayload[]
      customerWantsMaterialAs?: string
      createdBy?: string
      warehouseLocation?: string
      inventoryPhotoUrl?: string
      leadTime?: number | string
      remarks?: string
    }

    if (!orderId || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { success: false, error: "Missing orderId or items" },
        { status: 400 }
      )
    }

    const supabase = getSupabaseAdmin()

    // Normalize + compute shortage per item, and the overall status.
    // `serials` (the individually-numbered QR labels scanned for this item,
    // if any — see check-inventory/page.tsx) rides along into
    // otp_check_inventory.items purely for traceability; it isn't used by
    // shortage/pre-invoice-queue logic below, which only ever needs qty.
    const normalized = items.map((it) => {
      const ordered = Number(it.ordered_qty) || 0
      const scanned = Number(it.scanned_qty) || 0
      const shortage = Math.max(ordered - scanned, 0)
      return {
        item_code: it.item_code,
        item_name: it.item_name,
        ordered_qty: ordered,
        scanned_qty: scanned,
        shortage_qty: shortage,
        serials: it.serials || [],
      }
    })

    const totalShortage = normalized.reduce((sum, it) => sum + it.shortage_qty, 0)
    const totalScanned = normalized.reduce((sum, it) => sum + it.scanned_qty, 0)
    const availabilityStatus = totalShortage === 0 ? "Available" : totalScanned === 0 ? "Not Available" : "Partial"

    const { data: order, error: orderError } = await supabase
      .from("otp_orders")
      .select("order_no, quotation_number")
      .eq("id", orderId)
      .maybeSingle()
    if (orderError) throw orderError
    if (!order) {
      return NextResponse.json({ success: false, error: "Order not found" }, { status: 404 })
    }

    // 1. otp_check_inventory
    const leadTimeNum = leadTime ? Number(leadTime) : null
    const { data: inventoryRow, error: inventoryError } = await supabase
      .from("otp_check_inventory")
      .upsert(
        {
          order_id: orderId,
          availability_status: availabilityStatus,
          items: normalized,
          customer_wants_material_as: availabilityStatus === "Available" ? null : customerWantsMaterialAs || null,
          created_by: createdBy || null,
          warehouse_location: warehouseLocation || null,
          inventory_photo_url: inventoryPhotoUrl || null,
          material_received_lead_time: leadTimeNum,
          remark: remarks || "",
          actual_date: new Date().toISOString(),
        },
        { onConflict: "order_id" }
      )
      .select()
      .single()
    if (inventoryError) throw inventoryError

    // 2. Shortage items -> otp_material_shortage (+ best-effort PFMS indent)
    const shortageItems = normalized.filter((it) => it.shortage_qty > 0)
    if (shortageItems.length > 0) {
      const generatedIndentNos = await tryCreatePfmsIndent({
        orderNo: order.order_no,
        warehouseLocation: warehouseLocation || null,
        leadTime: leadTimeNum,
        items: shortageItems.map((it) => ({ item_code: it.item_code, item_name: it.item_name, qty: it.shortage_qty })),
      })

      const shortageRows = shortageItems.map((it, idx) => ({
        order_id: orderId,
        check_inventory_id: inventoryRow.id,
        item_code: it.item_code,
        item_name: it.item_name,
        indented_qty: it.shortage_qty,
        pfms_indent_no: generatedIndentNos?.[idx] || null,
        warehouse_location: warehouseLocation || null,
      }))

      const { error: shortageError } = await supabase.from("otp_material_shortage").insert(shortageRows)
      if (shortageError) throw shortageError
    }

    // 3. Available portion -> otp_pre_invoice_queue (one wave for this submission)
    const availableItems = normalized
      .filter((it) => it.scanned_qty > 0)
      .map((it) => ({ item_code: it.item_code, item_name: it.item_name, qty: it.scanned_qty }))

    if (availableItems.length > 0) {
      const { error: queueError } = await supabase.from("otp_pre_invoice_queue").insert({
        order_id: orderId,
        quotation_number: order.quotation_number || null,
        source_stage: "check_inventory",
        source_id: inventoryRow.id,
        items: availableItems,
      })
      if (queueError) throw queueError
    }

    return NextResponse.json({ success: true, availabilityStatus })
  } catch (err: any) {
    console.error("POST /api/otp-supabase/check-inventory exception:", err)
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
