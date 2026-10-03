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

const nameKey = (name?: string | null) => (name || "").trim().toLowerCase()

// Per-item reconciliation: how much of each of this order's items has
// Packing List EVER accounted for so far (queued to Pre-Invoice across
// every past wave, sitting as outstanding shortage in the ledger, or
// sitting in a still-open Indent Creation row), compared against the
// order's LIVE item list right now. A quotation can be edited in
// Lead-To-Order even after order conversion (the Enquiry Tracker History
// edit modal has no is_order_received_status guard — see
// Database/53_indent_creation_repeatable.sql's header comment), which
// silently re-syncs otp_orders.items to the new quotation. This is what
// detects that drift: delta > 0 means the live order now expects MORE of
// that item than Packing List has ever dealt with (new item, or a qty
// increase); delta < 0 means the live order now expects LESS than what's
// already been processed (can't be auto-reconciled — see History's
// "over-resolved" flag below).
async function computeReconciliation(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  orderId: string,
  liveItems: { item_name: string; quantity: number }[]
): Promise<{ name: string; delta: number }[]> {
  const [queueRes, ledgerRes, indentRes] = await Promise.all([
    supabase.from("otp_pre_invoice_queue").select("items").eq("order_id", orderId),
    supabase.from("otp_check_inventory_shortage").select("item_name, shortage_qty").eq("order_id", orderId).eq("status", "pending"),
    supabase.from("otp_indent_creation").select("items").eq("order_id", orderId).is("material_received", null),
  ])
  if (queueRes.error) throw queueRes.error
  if (ledgerRes.error) throw ledgerRes.error
  if (indentRes.error) throw indentRes.error

  const accountedFor = new Map<string, number>()
  const add = (name: string | undefined, qty: number) => {
    const key = nameKey(name)
    if (!key) return
    accountedFor.set(key, (accountedFor.get(key) || 0) + qty)
  }
  for (const row of queueRes.data || []) {
    for (const it of row.items || []) add(it.item_name, Number(it.qty) || 0)
  }
  for (const row of ledgerRes.data || []) add(row.item_name, Number(row.shortage_qty) || 0)
  for (const row of indentRes.data || []) {
    for (const it of row.items || []) add(it.item_name, Number(it.qty) || 0)
  }

  const diffs: { name: string; delta: number }[] = []
  for (const it of liveItems || []) {
    const key = nameKey(it.item_name)
    if (!key) continue
    const delta = (Number(it.quantity) || 0) - (accountedFor.get(key) || 0)
    if (delta !== 0) diffs.push({ name: it.item_name, delta })
  }
  return diffs
}

// Stage 2 — Packing List (Check Inventory).
//
// Can now be scanned more than once per order (otp_check_inventory's old
// UNIQUE(order_id) was dropped — see Database/52_indent_creation_stage.sql).
// Pending is a union of THREE kinds of rows, tagged `scanType` so the
// frontend knows what to compare scans against and where shortage should
// go on submit:
//
//   "new"     — order never scanned before (no otp_check_inventory row at
//               all yet). Compare against the full order item list. Any
//               shortage found creates this order's first (not
//               necessarily only, see "updated" below) otp_indent_creation
//               row.
//   "repeat"  — order already has an otp_check_inventory_shortage ledger
//               row still status='pending' (put there once an Indent
//               Creation's Material Received flips to Yes/No — see
//               indent-creation/route.ts). Compare ONLY against those
//               outstanding ledger rows (everything else on the order was
//               already resolved in an earlier wave). Any shortage found
//               this time stays in this same ledger (successor rows) —
//               it never goes back to Indent Creation.
//   "updated" — order was scanned before and has no outstanding "repeat"
//               ledger right now, but its LIVE order.items no longer
//               matches what was last accounted for — see
//               computeReconciliation's own comment below for why this
//               can happen (a quotation edited in Lead-To-Order after
//               order conversion). Compare against just the delta
//               (new/increased items), not the whole order again.
//
// History: a matching otp_check_inventory row exists (FK: order_id ->
//          otp_orders.id) — every scan attempt, new/repeat/updated. Each
//          history row also carries `overResolvedItems` — item names
//          whose live quotation now wants LESS than what's already been
//          processed (can't auto-reconcile, surfaced read-only).
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
        .limit(200)

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

      // One reconciliation check per unique order (not per history row —
      // the same order can have many past scan attempts) to flag any whose
      // live quotation now wants LESS of an item than Packing List has
      // already processed (can't be auto-fixed by a re-scan, since that
      // material may already be invoiced — see computeReconciliation above).
      const uniqueOrderIds = Array.from(new Set((inventoryRows || []).map((r: any) => r.order_id).filter(Boolean)))
      const orderById = new Map((inventoryRows || []).map((r: any) => [r.order_id, r.order]))
      const overResolvedByOrder = new Map<string, string[]>()
      await Promise.all(
        uniqueOrderIds.map(async (oid) => {
          const order = orderById.get(oid)
          const diffs = await computeReconciliation(supabase, oid, order?.items || [])
          const overResolved = diffs.filter((d) => d.delta < 0).map((d) => d.name)
          if (overResolved.length > 0) overResolvedByOrder.set(oid, overResolved)
        })
      )

      const shaped = (inventoryRows || []).map((r: any) => {
        const { order, ...inventory } = r
        return {
          order,
          acceptance: acceptanceMap.get(r.order_id) || null,
          inventory,
          overResolvedItems: overResolvedByOrder.get(r.order_id) || [],
        }
      })
      await enrichOrderItemsWithCode(supabase, shaped)

      return NextResponse.json({ success: true, data: shaped })
    }

    // --- "new" rows: orders whose stage-2 planned date is set but that
    // have NEVER had an otp_check_inventory row.
    const { data: everScannedRows, error: everScannedError } = await supabase
      .from("otp_check_inventory")
      .select("order_id")
    if (everScannedError) throw everScannedError
    const everScannedIds = (everScannedRows || []).map((r: any) => r.order_id).filter(Boolean)

    let newQuery = supabase
      .from("otp_orders_acceptable")
      .select("*, order:otp_orders(*)")
      .not("check_inventory_planned", "is", null)
      .order("created_at", { ascending: false })
    if (everScannedIds.length > 0) {
      newQuery = newQuery.not("order_id", "in", `(${everScannedIds.join(",")})`)
    }
    const { data: newRows, error: newError } = await newQuery
    if (newError) throw newError

    const newShaped = (newRows || []).map((r: any) => {
      const { order, ...acceptance } = r
      return { order, acceptance, inventory: null, scanType: "new", shortageItems: [] }
    })

    // --- "repeat" rows: orders with an outstanding otp_check_inventory_shortage
    // ledger (created once Indent Creation's Material Received is answered).
    const { data: ledgerRows, error: ledgerError } = await supabase
      .from("otp_check_inventory_shortage")
      .select("*, order:otp_orders(*)")
      .eq("status", "pending")
      .order("created_at", { ascending: false })
    if (ledgerError) throw ledgerError

    const repeatOrderIds = Array.from(new Set((ledgerRows || []).map((r: any) => r.order_id)))
    let acceptanceByOrder = new Map<string, any>()
    if (repeatOrderIds.length > 0) {
      const { data: acceptanceRows, error: acceptanceError } = await supabase
        .from("otp_orders_acceptable")
        .select("*")
        .in("order_id", repeatOrderIds)
      if (acceptanceError) throw acceptanceError
      acceptanceByOrder = new Map((acceptanceRows || []).map((a: any) => [a.order_id, a]))
    }

    const ledgerByOrder = new Map<string, any[]>()
    for (const r of ledgerRows || []) {
      if (!ledgerByOrder.has(r.order_id)) ledgerByOrder.set(r.order_id, [])
      ledgerByOrder.get(r.order_id)!.push(r)
    }

    const repeatShaped = repeatOrderIds.map((orderId) => {
      const rows = ledgerByOrder.get(orderId)!
      const order = rows[0].order
      return {
        order,
        acceptance: acceptanceByOrder.get(orderId) || null,
        inventory: null,
        scanType: "repeat",
        shortageItems: rows.map((r: any) => ({
          shortageLedgerId: r.id,
          item_code: r.item_code,
          item_name: r.item_name,
          shortage_qty: Number(r.shortage_qty) || 0,
        })),
      }
    })

    // --- "updated" rows: orders that have been scanned before (not "new")
    // and have no outstanding repeat-ledger right now (not already surfaced
    // as "repeat" above), but whose LIVE order.items no longer matches what
    // Packing List last accounted for — see computeReconciliation's comment.
    // Scoped to orders whose last scan was fully settled (no bucket overlap
    // with "repeat"); a quotation drift on an order still mid-repeat-cycle
    // surfaces here once that cycle finishes, not before.
    const alreadyRepeatIds = new Set(repeatOrderIds)
    const settledScannedIds = everScannedIds.filter((id: string) => !alreadyRepeatIds.has(id))

    let updatedShaped: any[] = []
    if (settledScannedIds.length > 0) {
      const { data: settledOrders, error: settledError } = await supabase
        .from("otp_orders")
        .select("*")
        .in("id", settledScannedIds)
      if (settledError) throw settledError

      const { data: settledAcceptanceRows, error: settledAcceptanceError } = await supabase
        .from("otp_orders_acceptable")
        .select("*")
        .in("order_id", settledScannedIds)
      if (settledAcceptanceError) throw settledAcceptanceError
      const settledAcceptanceMap = new Map((settledAcceptanceRows || []).map((a: any) => [a.order_id, a]))

      const results = await Promise.all(
        (settledOrders || []).map(async (order: any) => {
          const diffs = await computeReconciliation(supabase, order.id, order.items || [])
          const increases = diffs.filter((d) => d.delta > 0)
          if (increases.length === 0) return null
          return {
            order,
            acceptance: settledAcceptanceMap.get(order.id) || null,
            inventory: null,
            scanType: "updated",
            shortageItems: increases.map((d) => ({
              item_code: null, // backfilled below once enrichOrderItemsWithCode resolves order.items codes
              item_name: d.name,
              shortage_qty: d.delta, // "qty to check" — not an existing outstanding shortage
            })),
          }
        })
      )
      updatedShaped = results.filter(Boolean) as any[]
    }

    const shaped = [...newShaped, ...repeatShaped, ...updatedShaped]
    await enrichOrderItemsWithCode(supabase, shaped)

    // Backfill "updated" rows' item codes now that order.items[].item_code
    // has been resolved above.
    for (const row of updatedShaped) {
      const codeByName = new Map((row.order.items || []).map((it: any) => [nameKey(it.item_name), it.item_code]))
      for (const si of row.shortageItems) {
        si.item_code = codeByName.get(nameKey(si.item_name)) || null
      }
    }

    return NextResponse.json({ success: true, data: shaped })
  } catch (err: any) {
    console.error("GET /api/otp-supabase/packing-list exception:", err)
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}

interface ScanItemPayload {
  item_code: string
  item_name: string
  ordered_qty: number
  scanned_qty: number
  serials?: string[]
  shortageLedgerId?: string // present only for scanType "repeat" items
}

interface AccessoryPayload {
  item_name: string
  quantity: number
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { orderId, items, accessories, createdBy } = body as {
      orderId: string
      items: ScanItemPayload[]
      accessories?: AccessoryPayload[]
      createdBy?: string
    }

    if (!orderId || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { success: false, error: "Missing orderId or items" },
        { status: 400 }
      )
    }

    const supabase = getSupabaseAdmin()

    // `serials` (the individually-numbered QR labels scanned for this item,
    // if any — see packing-list/page.tsx) rides along into
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
        shortageLedgerId: it.shortageLedgerId || null,
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

    // Accessories scanned at this stage aren't part of the order's own item
    // list -- written straight onto otp_orders (not otp_check_inventory) so
    // every later stage's Pending/History view can read it via the same
    // `order` join they already have, same as items/total_qty/crm_name etc.
    if (Array.isArray(accessories)) {
      const normalizedAccessories = accessories
        .filter((a) => a?.item_name)
        .map((a) => ({ item_name: a.item_name, quantity: Number(a.quantity) || 0 }))
      const { error: accessoriesError } = await supabase
        .from("otp_orders")
        .update({ items_accessories: normalizedAccessories })
        .eq("id", orderId)
      if (accessoriesError) throw accessoriesError
    }

    // 1. otp_check_inventory — always a fresh row now (one per scan attempt,
    // new or repeat), no more upsert-by-order_id.
    const { data: inventoryRow, error: inventoryError } = await supabase
      .from("otp_check_inventory")
      .insert({
        order_id: orderId,
        availability_status: availabilityStatus,
        items: normalized,
        created_by: createdBy || null,
        actual_date: new Date().toISOString(),
      })
      .select()
      .single()
    if (inventoryError) throw inventoryError

    // 2. Shortage handling — split by whether each ITEM carries a
    // shortageLedgerId, not by whether this order has an otp_indent_creation
    // row. A "repeat" scan's items always carry one (even for orders whose
    // ledger predates Indent Creation entirely — e.g. the 4 rows carried
    // forward from the old otp_material_shortage table, see
    // Database/52_indent_creation_stage.sql), and those must always resolve
    // through the ledger, never through Indent Creation.
    const ledgerTrackedItems = normalized.filter((it) => it.shortageLedgerId)
    const freshShortageItems = normalized.filter((it) => !it.shortageLedgerId && it.shortage_qty > 0)

    if (ledgerTrackedItems.length > 0) {
      // Every ledger row this scan addressed is done with, whatever the
      // outcome — fully found (no successor) or still short (successor row
      // below carries the remainder forward).
      const ledgerIds = ledgerTrackedItems.map((it) => it.shortageLedgerId) as string[]
      const { error: resolveError } = await supabase
        .from("otp_check_inventory_shortage")
        .update({ status: "resolved" })
        .in("id", ledgerIds)
      if (resolveError) throw resolveError

      const successorRows = ledgerTrackedItems
        .filter((it) => it.shortage_qty > 0)
        .map((it) => ({
          order_id: orderId,
          check_inventory_id: inventoryRow.id,
          item_code: it.item_code,
          item_name: it.item_name,
          shortage_qty: it.shortage_qty,
          parent_id: it.shortageLedgerId,
        }))
      if (successorRows.length > 0) {
        const { error: successorError } = await supabase.from("otp_check_inventory_shortage").insert(successorRows)
        if (successorError) throw successorError
      }
    }

    if (freshShortageItems.length > 0) {
      // Per-ITEM eligibility, not per-order — an order can get more than
      // one first-ever-shortage indent now (see
      // Database/53_indent_creation_repeatable.sql), one per item name
      // that's never appeared in any of THIS order's past indent rows.
      // (Needed for "updated"-scanType reconciliation items: a brand new
      // item added by a later quotation edit is a genuine first-time
      // shortage for ITS name, even though the order already has an old,
      // closed indent row for some other item.)
      const { data: pastIndentRows, error: pastIndentError } = await supabase
        .from("otp_indent_creation")
        .select("items")
        .eq("order_id", orderId)
      if (pastIndentError) throw pastIndentError

      const alreadyIndentedNames = new Set<string>()
      for (const row of pastIndentRows || []) {
        for (const it of row.items || []) {
          if (it?.item_name) alreadyIndentedNames.add(it.item_name.trim().toLowerCase())
        }
      }

      const trulyFreshItems = freshShortageItems.filter((it) => !alreadyIndentedNames.has((it.item_name || "").trim().toLowerCase()))
      // Already indented once before (fully resolved since), now short
      // again with no ledger row to attach to — e.g. a quotation increase
      // on an item that was already fully resolved/invoiced. Per the
      // established "an item only ever gets a real indent raised the
      // first time it's short" rule, this is a fresh ledger entry (its
      // own episode, no parent_id), not a second indent.
      const alreadyIndentedButShortAgain = freshShortageItems.filter((it) => alreadyIndentedNames.has((it.item_name || "").trim().toLowerCase()))

      if (trulyFreshItems.length > 0) {
        const { error: indentError } = await supabase.from("otp_indent_creation").insert({
          order_id: orderId,
          check_inventory_id: inventoryRow.id,
          items: trulyFreshItems.map((it) => ({ item_code: it.item_code, item_name: it.item_name, qty: it.shortage_qty })),
        })
        if (indentError) throw indentError
      }

      if (alreadyIndentedButShortAgain.length > 0) {
        const { error: ledgerInsertError } = await supabase.from("otp_check_inventory_shortage").insert(
          alreadyIndentedButShortAgain.map((it) => ({
            order_id: orderId,
            check_inventory_id: inventoryRow.id,
            item_code: it.item_code,
            item_name: it.item_name,
            shortage_qty: it.shortage_qty,
          }))
        )
        if (ledgerInsertError) throw ledgerInsertError
      }
    }

    // 3. Available portion -> otp_pre_invoice_queue (one wave for this submission)
    // `serials` rides along so Pre-Invoice can prefill one row per
    // physical unit instead of just a lump qty — see pre-invoice/page.tsx.
    const availableItems = normalized
      .filter((it) => it.scanned_qty > 0)
      .map((it) => ({ item_code: it.item_code, item_name: it.item_name, qty: it.scanned_qty, serials: it.serials }))

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
    console.error("POST /api/otp-supabase/packing-list exception:", err)
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
