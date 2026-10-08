import { NextResponse } from "next/server"
import { getSupabaseAdmin } from "@/lib/supabase"
import { subGodownFor } from "@/lib/locations"

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

// Cross-order "Released Stock" (see Database/55_otp_released_stock.sql) — qty
// freed up when a DIFFERENT order's Pre-Invoice step reduced its queued qty
// below what it originally had (e.g. "ship less now, give the rest to
// another order"). Purely informational here: a read-only hint attached to
// matching pending items by item_name, never auto-added to scanned_qty or
// subtracted from shortage_qty. Consumption (decrementing qty_remaining)
// happens in POST below, only once a scan actually reports finding the item.
async function fetchOpenReleasedStockByName(
  supabase: ReturnType<typeof getSupabaseAdmin>
): Promise<Map<string, { qty: number; fromOrderNo: string }[]>> {
  const byName = new Map<string, { qty: number; fromOrderNo: string }[]>()

  const { data, error } = await supabase
    .from("otp_released_stock")
    .select("item_name, qty_remaining, source:otp_orders(order_no)")
    .gt("qty_remaining", 0)
    .order("created_at", { ascending: true })
  if (error) {
    // 42P01 (direct Postgres) or PGRST205 (PostgREST's schema-cache lookup,
    // what Supabase's JS client actually surfaces for a missing table) —
    // Database/55_otp_released_stock.sql not applied yet. Degrade to "no
    // hints" instead of breaking Packing List's whole Pending tab while
    // that migration is pending.
    const code = (error as any).code
    const isMissingTable = code === "42P01" || code === "PGRST205" || /schema cache/i.test(error.message || "")
    if (isMissingTable) {
      console.warn("otp_released_stock table not found yet — skipping released-stock hints:", error.message)
      return byName
    }
    throw error
  }

  for (const row of (data || []) as any[]) {
    const key = nameKey(row.item_name)
    if (!key) continue
    if (!byName.has(key)) byName.set(key, [])
    byName.get(key)!.push({ qty: Number(row.qty_remaining) || 0, fromOrderNo: row.source?.order_no || "" })
  }
  return byName
}

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
// PostgREST caps a plain select at 1000 rows — page through so a growing
// table can't be silently truncated (e.g. "ever scanned" orders reappearing
// as New). `build` must return a fresh, deterministically ordered query.
async function fetchAll(build: () => any): Promise<any[]> {
  const out: any[] = []
  for (let from = 0; ; from += 1000) {
    const { data, error } = await build().range(from, from + 999)
    if (error) throw error
    out.push(...(data || []))
    if (!data || data.length < 1000) return out
  }
}

// `.in(column, ids)` for an id list of any size: 100 ids per request (keeps
// the URL short), each page-through'd by fetchAll.
async function fetchByIds(ids: string[], build: (chunk: string[]) => any): Promise<any[]> {
  const unique = Array.from(new Set(ids.filter(Boolean)))
  const out: any[] = []
  for (let i = 0; i < unique.length; i += 100) {
    const chunk = unique.slice(i, i + 100)
    out.push(...(await fetchAll(() => build(chunk).order("id"))))
  }
  return out
}

type Accounted = { qty: Map<string, number>; name: Map<string, string> }

// The "accounted for" side of computeReconciliation for MANY orders at once:
// 3 queries per 100 orders instead of 3 per order (the per-order version made
// Packing List's Pending/History take 15-30s with only ~60 scanned orders).
async function loadAccounted(supabase: ReturnType<typeof getSupabaseAdmin>, orderIds: string[]) {
  const byOrder = new Map<string, Accounted>()
  const ids = Array.from(new Set(orderIds.filter(Boolean)))
  for (const id of ids) byOrder.set(id, { qty: new Map(), name: new Map() })
  const add = (orderId: string, name: string | undefined, qty: number) => {
    const acc = byOrder.get(orderId)
    const key = nameKey(name)
    if (!acc || !key) return
    acc.qty.set(key, (acc.qty.get(key) || 0) + qty)
    if (!acc.name.has(key)) acc.name.set(key, name!)
  }

  for (let i = 0; i < ids.length; i += 100) {
    const chunk = ids.slice(i, i + 100)
    const [queues, ledgers, indents] = await Promise.all([
      fetchAll(() => supabase.from("otp_pre_invoice_queue").select("id, order_id, items").in("order_id", chunk).order("id")),
      fetchAll(() =>
        supabase.from("otp_check_inventory_shortage").select("id, order_id, item_name, shortage_qty").in("order_id", chunk).eq("status", "pending").order("id")
      ),
      fetchAll(() =>
        supabase.from("otp_indent_creation").select("id, order_id, items").in("order_id", chunk).is("material_received", null).order("id")
      ),
    ])
    for (const row of queues) for (const it of row.items || []) add(row.order_id, it.item_name, Number(it.qty) || 0)
    for (const row of ledgers) add(row.order_id, row.item_name, Number(row.shortage_qty) || 0)
    for (const row of indents) for (const it of row.items || []) add(row.order_id, it.item_name, Number(it.qty) || 0)
  }
  return byOrder
}

async function computeReconciliation(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  orderId: string,
  liveItems: { item_name: string; quantity: number }[]
): Promise<{ name: string; delta: number }[]> {
  return diffsFor((await loadAccounted(supabase, [orderId])).get(orderId), liveItems)
}

function diffsFor(
  acc: Accounted | undefined,
  liveItems: { item_name: string; quantity: number }[]
): { name: string; delta: number }[] {
  const accountedFor = acc?.qty || new Map<string, number>()
  const displayName = acc?.name || new Map<string, string>()

  const diffs: { name: string; delta: number }[] = []
  const liveKeys = new Set<string>()
  for (const it of liveItems || []) {
    const key = nameKey(it.item_name)
    if (!key) continue
    liveKeys.add(key)
    const delta = (Number(it.quantity) || 0) - (accountedFor.get(key) || 0)
    if (delta !== 0) diffs.push({ name: it.item_name, delta })
  }
  // An item removed from the quotation entirely isn't in liveItems at all,
  // but anything already accounted for it is now fully over-resolved.
  for (const [key, qty] of accountedFor) {
    if (!liveKeys.has(key) && qty > 0) diffs.push({ name: displayName.get(key)!, delta: -qty })
  }
  return diffs
}

type Supa = ReturnType<typeof getSupabaseAdmin>

// Fresh shortage (an item NOT tracked by a ledger row from an earlier wave)
// for one scan wave: an item name never indented before for this order gets
// a real Indent Creation row (appended to this wave's own still-Pending
// indent row if it has one); one that was indented before goes to the
// ledger as its own episode instead. Shared by POST (new scan) and PATCH
// (History edit) so both route shortage identically.
async function routeFreshShortage(
  supabase: Supa,
  orderId: string,
  inventoryId: string,
  items: { item_code: string; item_name: string; shortage_qty: number }[]
) {
  if (items.length === 0) return

  const { data: pastIndentRows, error: pastIndentError } = await supabase
    .from("otp_indent_creation")
    .select("id, items, check_inventory_id, indent_created_at, material_received")
    .eq("order_id", orderId)
  if (pastIndentError) throw pastIndentError

  const alreadyIndentedNames = new Set<string>()
  for (const row of pastIndentRows || []) {
    for (const it of row.items || []) if (it?.item_name) alreadyIndentedNames.add(nameKey(it.item_name))
  }

  const trulyFresh = items.filter((it) => !alreadyIndentedNames.has(nameKey(it.item_name)))
  const indentedBefore = items.filter((it) => alreadyIndentedNames.has(nameKey(it.item_name)))

  if (trulyFresh.length > 0) {
    const newItems = trulyFresh.map((it) => ({ item_code: it.item_code, item_name: it.item_name, qty: it.shortage_qty }))
    const ownPending = (pastIndentRows || []).find(
      (r: any) => r.check_inventory_id === inventoryId && !r.indent_created_at && !r.material_received
    )
    const { error } = ownPending
      ? await supabase.from("otp_indent_creation").update({ items: [...(ownPending.items || []), ...newItems] }).eq("id", ownPending.id)
      : await supabase.from("otp_indent_creation").insert({ order_id: orderId, check_inventory_id: inventoryId, items: newItems })
    if (error) throw error
  }

  if (indentedBefore.length > 0) {
    const { error } = await supabase.from("otp_check_inventory_shortage").insert(
      indentedBefore.map((it) => ({
        order_id: orderId,
        check_inventory_id: inventoryId,
        item_code: it.item_code || "",
        item_name: it.item_name,
        shortage_qty: it.shortage_qty,
      }))
    )
    if (error) throw error
  }
}

// Downstream rows produced by each scan wave (otp_check_inventory row). A
// History row is editable only while ALL of them are still uncommitted:
// Pre-Invoice queue 'pending', Indent Creation still in its Pending tab,
// ledger rows still 'pending'. Merged queue rows (see
// Database/58_...sql) are found via merged_source_ids too.
async function loadWaveLinks(supabase: Supa, inventoryIds: string[]) {
  const links = new Map<string, { queues: any[]; indents: any[]; ledgers: any[] }>()
  for (const id of inventoryIds) links.set(id, { queues: [], indents: [], ledgers: [] })
  if (inventoryIds.length === 0) return links

  const idList = inventoryIds.join(",")
  const [queueRes, indentRes, ledgerRes] = await Promise.all([
    supabase
      .from("otp_pre_invoice_queue")
      .select("id, status, items, source_id, merged_source_ids")
      .or(`source_id.in.(${idList}),merged_source_ids.ov.{${idList}}`),
    supabase
      .from("otp_indent_creation")
      .select("id, items, check_inventory_id, indent_created_at, material_received")
      .in("check_inventory_id", inventoryIds),
    supabase
      .from("otp_check_inventory_shortage")
      .select("id, item_name, item_code, shortage_qty, status, parent_id, check_inventory_id")
      .in("check_inventory_id", inventoryIds),
  ])
  if (queueRes.error) throw queueRes.error
  if (indentRes.error) throw indentRes.error
  if (ledgerRes.error) throw ledgerRes.error

  for (const q of queueRes.data || []) {
    for (const id of new Set([q.source_id, ...(q.merged_source_ids || [])])) links.get(id)?.queues.push(q)
  }
  for (const i of indentRes.data || []) links.get(i.check_inventory_id)?.indents.push(i)
  for (const l of ledgerRes.data || []) links.get(l.check_inventory_id)?.ledgers.push(l)
  return links
}

// A queue row emptied by an edit is kept as 'cancelled' with no items (its
// released-stock rows would cascade-delete with it) — it's a placeholder,
// not a downstream commitment, so it doesn't lock the wave.
const isEmptiedQueue = (q: any) => q.status === "cancelled" && (q.items || []).length === 0

function isWaveEditable(link: { queues: any[]; indents: any[]; ledgers: any[] }) {
  return (
    link.queues.every((q) => q.status === "pending" || isEmptiedQueue(q)) &&
    link.indents.every((i) => !i.indent_created_at && !i.material_received) &&
    link.ledgers.every((l) => l.status === "pending")
  )
}

function preInvoiceStatusOf(link: { queues: any[] }) {
  const queues = link.queues.filter((q) => !isEmptiedQueue(q))
  if (queues.length === 0) return "none"
  return queues.some((q) => q.status === "pending") ? "pending" : "processed"
}

// What this wave's ordered qty should become given the live quotation: only
// ever shrinks, by however much the order is now over-accounted for that
// item (quotation reduced / item removed). Increases aren't absorbed here —
// those surface as an "updated" Packing List row instead.
function adjustedOrderedQty(orderedQty: number, delta: number | undefined) {
  return Math.max(0, orderedQty + Math.min(0, delta || 0))
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
//               indent-creation/route.ts). Compare against those
//               outstanding ledger rows PLUS any live quotation-drift delta
//               on top (see computeReconciliation) — a quotation edit can
//               land while this order is mid-repeat-cycle, and it must not
//               get stuck behind it until the cycle finishes. Delta items
//               already present in the ledger have their qty bumped up by
//               the delta amount; brand-new items (not in the ledger) are
//               appended with no shortageLedgerId, so they flow through
//               submit as fresh items (see POST). Any shortage found this
//               time for an existing ledger item stays in this same ledger
//               (successor rows) — it never goes back to Indent Creation.
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
      const deltaByOrder = new Map<string, Map<string, number>>()
      const [accounted, waveLinks] = await Promise.all([
        loadAccounted(supabase, uniqueOrderIds as string[]),
        loadWaveLinks(supabase, (inventoryRows || []).map((r: any) => r.id)),
      ])
      for (const oid of uniqueOrderIds as string[]) {
        const diffs = diffsFor(accounted.get(oid), orderById.get(oid)?.items || [])
        deltaByOrder.set(oid, new Map(diffs.map((d) => [nameKey(d.name), d.delta])))
        const overResolved = diffs.filter((d) => d.delta < 0).map((d) => d.name)
        if (overResolved.length > 0) overResolvedByOrder.set(oid, overResolved)
      }

      const shaped = (inventoryRows || []).map((r: any) => {
        const { order, ...inventory } = r
        const link = waveLinks.get(r.id)!
        const deltas = deltaByOrder.get(r.order_id)
        return {
          order,
          acceptance: acceptanceMap.get(r.order_id) || null,
          inventory: {
            ...inventory,
            items: (inventory.items || []).map((it: any) => ({
              ...it,
              suggested_ordered_qty: adjustedOrderedQty(Number(it.ordered_qty) || 0, deltas?.get(nameKey(it.item_name))),
            })),
          },
          overResolvedItems: overResolvedByOrder.get(r.order_id) || [],
          editable: isWaveEditable(link),
          preInvoiceStatus: preInvoiceStatusOf(link),
        }
      })
      await enrichOrderItemsWithCode(supabase, shaped)

      return NextResponse.json({ success: true, data: shaped })
    }

    // Cross-order released-stock hints — one query, reused across all three
    // buckets below (see fetchOpenReleasedStockByName's own comment).
    const releasedStockByName = await fetchOpenReleasedStockByName(supabase)

    // --- "new" rows: orders whose stage-2 planned date is set but that
    // have NEVER had an otp_check_inventory row.
    const everScannedIds: string[] = Array.from(
      new Set(
        (await fetchAll(() => supabase.from("otp_check_inventory").select("id, order_id").order("id")))
          .map((r: any) => r.order_id)
          .filter(Boolean)
      )
    )
    const scannedSet = new Set(everScannedIds)

    // Filtered in memory rather than a `NOT IN (...)` URL filter, which grows
    // with every order ever scanned.
    const plannedOrderIds = (
      await fetchAll(() =>
        supabase.from("otp_orders_acceptable").select("id, order_id").not("check_inventory_planned", "is", null).order("id")
      )
    ).map((r: any) => r.order_id)
    const newRows = (
      await fetchByIds(
        plannedOrderIds.filter((id: string) => id && !scannedSet.has(id)),
        (chunk) =>
          supabase.from("otp_orders_acceptable").select("*, order:otp_orders(*)").in("order_id", chunk).not("check_inventory_planned", "is", null)
      )
    ).sort((a: any, b: any) => (a.created_at < b.created_at ? 1 : -1))

    const newShaped = newRows.map((r: any) => {
      const { order, ...acceptance } = r
      if (order?.items) {
        order.items = order.items.map((it: any) => ({
          ...it,
          releasedStockAvailable: releasedStockByName.get(nameKey(it.item_name)) || [],
        }))
      }
      return { order, acceptance, inventory: null, scanType: "new", shortageItems: [] }
    })

    // --- "repeat" rows: orders with an outstanding otp_check_inventory_shortage
    // ledger (created once Indent Creation's Material Received is answered).
    const ledgerRows = await fetchAll(() =>
      supabase
        .from("otp_check_inventory_shortage")
        .select("*, order:otp_orders(*)")
        .eq("status", "pending")
        .order("created_at", { ascending: false })
        .order("id")
    )

    const repeatOrderIds: string[] = Array.from(new Set(ledgerRows.map((r: any) => r.order_id)))
    const acceptanceByOrder = new Map(
      (await fetchByIds(repeatOrderIds, (chunk) => supabase.from("otp_orders_acceptable").select("*").in("order_id", chunk))).map(
        (a: any) => [a.order_id, a]
      )
    )

    const ledgerByOrder = new Map<string, any[]>()
    for (const r of ledgerRows) {
      if (!ledgerByOrder.has(r.order_id)) ledgerByOrder.set(r.order_id, [])
      ledgerByOrder.get(r.order_id)!.push(r)
    }

    const alreadyRepeatIds = new Set(repeatOrderIds)
    const settledScannedIds = everScannedIds.filter((id: string) => !alreadyRepeatIds.has(id))
    // One batched load for every order either bucket below reconciles.
    const accounted = await loadAccounted(supabase, [...repeatOrderIds, ...settledScannedIds])

    const repeatShaped = repeatOrderIds.map((orderId) => {
        const rows = ledgerByOrder.get(orderId)!
        const order = rows[0].order

        const shortageItems = rows.map((r: any) => ({
          shortageLedgerId: r.id as string | null,
          item_code: r.item_code,
          item_name: r.item_name,
          shortage_qty: Number(r.shortage_qty) || 0,
          releasedStockAvailable: releasedStockByName.get(nameKey(r.item_name)) || [],
        }))

        // Merge in any live quotation-drift on top of the ledger's own
        // frozen items — accountedFor already sums this order's own pending
        // ledger rows, so delta here is purely what's missing beyond them,
        // safe to add without double-counting.
        const diffs = diffsFor(accounted.get(orderId), order?.items || [])
        for (const inc of diffs.filter((d) => d.delta > 0)) {
          const key = nameKey(inc.name)
          const existing = shortageItems.find((si) => nameKey(si.item_name) === key)
          if (existing) {
            existing.shortage_qty += inc.delta
          } else {
            shortageItems.push({
              shortageLedgerId: null,
              item_code: null, // backfilled below once enrichOrderItemsWithCode resolves order.items codes
              item_name: inc.name,
              shortage_qty: inc.delta,
              releasedStockAvailable: releasedStockByName.get(nameKey(inc.name)) || [],
            })
          }
        }

        return {
          order,
          acceptance: acceptanceByOrder.get(orderId) || null,
          inventory: null,
          scanType: "repeat",
          shortageItems,
        }
      })

    // --- "updated" rows: orders that have been scanned before (not "new")
    // and have no outstanding repeat-ledger right now, but whose LIVE
    // order.items no longer matches what Packing List last accounted for —
    // see computeReconciliation's comment. Orders still mid-repeat-cycle are
    // excluded here because their drift is already merged into "repeat"
    // above (see repeatShaped) — never double-surfaced in both buckets.
    let updatedShaped: any[] = []
    if (settledScannedIds.length > 0) {
      const [settledOrders, settledAcceptanceRows] = await Promise.all([
        fetchByIds(settledScannedIds, (chunk) => supabase.from("otp_orders").select("*").in("id", chunk)),
        fetchByIds(settledScannedIds, (chunk) => supabase.from("otp_orders_acceptable").select("*").in("order_id", chunk)),
      ])
      const settledAcceptanceMap = new Map(settledAcceptanceRows.map((a: any) => [a.order_id, a]))

      const results = settledOrders.map((order: any) => {
          const diffs = diffsFor(accounted.get(order.id), order.items || [])
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
              releasedStockAvailable: releasedStockByName.get(nameKey(d.name)) || [],
            })),
          }
        })
      updatedShaped = results.filter(Boolean) as any[]
    }

    const shaped = [...newShaped, ...repeatShaped, ...updatedShaped]
    await enrichOrderItemsWithCode(supabase, shaped)

    // Backfill item codes for any shortageItems entry still missing one
    // (new "updated" rows, and drift-merged entries appended to "repeat"
    // rows above) now that order.items[].item_code has been resolved.
    for (const row of [...repeatShaped, ...updatedShaped]) {
      const codeByName = new Map((row.order.items || []).map((it: any) => [nameKey(it.item_name), it.item_code]))
      for (const si of row.shortageItems) {
        if (!si.item_code) si.item_code = codeByName.get(nameKey(si.item_name)) || null
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
    const { orderId, items, accessories, createdBy, subGodown } = body as {
      orderId: string
      items: ScanItemPayload[]
      accessories?: AccessoryPayload[]
      createdBy?: string
      subGodown?: string | null
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

    // Consume any open cross-order released-stock (see
    // Database/55_otp_released_stock.sql / the GET branch's
    // releasedStockAvailable hint) for whatever this scan reports finding —
    // FIFO by created_at, capped at qty_remaining, floor at 0. Best-effort
    // and independent of the rest of this submit: a release-pool hiccup
    // here must never block a normal scan from going through.
    try {
      const consumableNames = normalized.filter((it) => it.scanned_qty > 0).map((it) => nameKey(it.item_name))
      if (consumableNames.length > 0) {
        const { data: openReleases, error: openReleasesError } = await supabase
          .from("otp_released_stock")
          .select("id, item_name, qty_remaining")
          .gt("qty_remaining", 0)
          .order("created_at", { ascending: true })
        if (openReleasesError) throw openReleasesError

        const releasesByName = new Map<string, { id: string; qty_remaining: number }[]>()
        for (const row of (openReleases || []) as any[]) {
          const key = nameKey(row.item_name)
          if (!releasesByName.has(key)) releasesByName.set(key, [])
          releasesByName.get(key)!.push(row)
        }

        const updates: { id: string; qty_remaining: number }[] = []
        for (const it of normalized) {
          if (it.scanned_qty <= 0) continue
          const rows = releasesByName.get(nameKey(it.item_name))
          if (!rows || rows.length === 0) continue
          let toConsume = it.scanned_qty
          for (const row of rows) {
            if (toConsume <= 0) break
            const available = Number(row.qty_remaining) || 0
            const consume = Math.min(toConsume, available)
            if (consume <= 0) continue
            updates.push({ id: row.id, qty_remaining: available - consume })
            toConsume -= consume
          }
        }
        if (updates.length > 0) {
          await Promise.all(
            updates.map((u) => supabase.from("otp_released_stock").update({ qty_remaining: u.qty_remaining }).eq("id", u.id))
          )
        }
      }
    } catch (releaseConsumeErr) {
      console.warn("Released-stock consumption failed (non-blocking):", releaseConsumeErr)
    }

    const { data: order, error: orderError } = await supabase
      .from("otp_orders")
      .select("order_no, quotation_number, order_location")
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

    // Per-ITEM eligibility, not per-order — see routeFreshShortage.
    await routeFreshShortage(supabase, orderId, inventoryRow.id, freshShortageItems)

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
        source_stage: "packing_list",
        source_id: inventoryRow.id,
        items: availableItems,
        // Derived from the order's own location whenever it has one (the
        // client's pick is only used for pre-Database/63 orders with none).
        sub_godown: order.order_location ? subGodownFor(order.order_location) : subGodown || null,
      })
      if (queueError) throw queueError
    }

    return NextResponse.json({ success: true, availabilityStatus })
  } catch (err: any) {
    console.error("POST /api/otp-supabase/packing-list exception:", err)
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}

// Packing List History edit — correct a recorded scan wave (wrong scanned
// qty, or the quotation was reduced / an item removed afterwards). Allowed
// only while every downstream row of that wave is still uncommitted (see
// isWaveEditable). Ordered qty is re-derived here from the live quotation
// (adjustedOrderedQty) — never trusted from the client — and scanned qty
// comes from the user. The change is cascaded into this wave's Pre-Invoice
// queue row and its shortage rows (Indent Creation / ledger) so nobody has
// to repeat the correction downstream. An Indent Creation item that drops
// to 0 is kept at 0 (not removed) so Indent Creation shows it for Edit Qty /
// Reject. Every effective edit drops an otp_notifications row with the
// before/after per item.
//
// ponytail: sequential writes, not one DB transaction (same as POST above) —
// a failure part-way can leave a wave half-edited. Move the cascade into a
// plpgsql function if that ever happens in practice.
export async function PATCH(request: Request) {
  try {
    const { inventoryId, items, editedBy } = (await request.json()) as {
      inventoryId: string
      items: { item_name: string; scanned_qty: number }[]
      editedBy?: string
    }
    if (!inventoryId || !Array.isArray(items)) {
      return NextResponse.json({ success: false, error: "Missing inventoryId or items" }, { status: 400 })
    }

    const supabase = getSupabaseAdmin()

    const { data: inv, error: invError } = await supabase
      .from("otp_check_inventory")
      .select("id, order_id, items, order:otp_orders(order_no, crm_name, quotation_number, items)")
      .eq("id", inventoryId)
      .maybeSingle()
    if (invError) throw invError
    if (!inv) return NextResponse.json({ success: false, error: "History row not found" }, { status: 404 })

    const link = (await loadWaveLinks(supabase, [inventoryId])).get(inventoryId)!
    if (!isWaveEditable(link)) {
      return NextResponse.json(
        { success: false, error: "This wave has already moved forward in Pre-Invoice / Indent Creation and can no longer be edited" },
        { status: 409 }
      )
    }

    const order = inv.order as any
    const diffs = await computeReconciliation(supabase, inv.order_id, order?.items || [])
    const deltaByName = new Map(diffs.map((d) => [nameKey(d.name), d.delta]))
    const scannedByName = new Map(items.map((it) => [nameKey(it.item_name), Number(it.scanned_qty)]))

    const queue = link.queues[0] || null
    const queueItems: any[] | null = queue ? [...(queue.items || [])] : null
    const newQueueItems: any[] = []
    const dirtyIndents = new Set<any>()
    const freshToRoute: { item_code: string; item_name: string; shortage_qty: number }[] = []
    const changes: any[] = []
    const newInvItems: any[] = []

    for (const it of (inv.items || []) as any[]) {
      const key = nameKey(it.item_name)
      const oldOrdered = Number(it.ordered_qty) || 0
      const oldScanned = Number(it.scanned_qty) || 0
      const oldShortage = Number(it.shortage_qty) || 0
      const newOrdered = adjustedOrderedQty(oldOrdered, deltaByName.get(key))
      const newScanned = scannedByName.has(key) ? scannedByName.get(key)! : Math.min(oldScanned, newOrdered)
      if (!Number.isInteger(newScanned) || newScanned < 0 || newScanned > newOrdered) {
        return NextResponse.json(
          { success: false, error: `${it.item_name}: scanned qty must be a whole number between 0 and ${newOrdered}` },
          { status: 400 }
        )
      }
      const newShortage = newOrdered - newScanned

      newInvItems.push({
        ...it,
        ordered_qty: newOrdered,
        scanned_qty: newScanned,
        shortage_qty: newShortage,
        serials: (it.serials || []).slice(0, newScanned),
      })

      if (newOrdered === oldOrdered && newScanned === oldScanned && newShortage === oldShortage) continue
      changes.push({
        item_name: it.item_name,
        ordered_before: oldOrdered,
        ordered_after: newOrdered,
        scanned_before: oldScanned,
        scanned_after: newScanned,
        shortage_before: oldShortage,
        shortage_after: newShortage,
      })

      // Available portion -> this wave's Pre-Invoice queue row
      const dScan = newScanned - oldScanned
      if (dScan !== 0) {
        if (queueItems) {
          const idx = queueItems.findIndex((q) => nameKey(q.item_name) === key)
          if (idx >= 0) {
            const qty = (Number(queueItems[idx].qty) || 0) + dScan
            if (qty <= 0) queueItems.splice(idx, 1)
            else queueItems[idx] = { ...queueItems[idx], qty, serials: (queueItems[idx].serials || []).slice(0, qty) }
          } else if (dScan > 0) {
            queueItems.push({ item_code: it.item_code, item_name: it.item_name, qty: dScan, serials: [] })
          }
        } else if (newScanned > 0) {
          newQueueItems.push({ item_code: it.item_code, item_name: it.item_name, qty: newScanned, serials: [] })
        }
      }

      // Shortage portion -> wherever this wave routed it
      if (newShortage === oldShortage) continue
      if (it.shortageLedgerId) {
        const successor = link.ledgers.find((l) => l.parent_id === it.shortageLedgerId)
        if (newShortage > 0) {
          const { error } = successor
            ? await supabase.from("otp_check_inventory_shortage").update({ shortage_qty: newShortage }).eq("id", successor.id)
            : await supabase.from("otp_check_inventory_shortage").insert({
                order_id: inv.order_id,
                check_inventory_id: inventoryId,
                item_code: it.item_code || "",
                item_name: it.item_name,
                shortage_qty: newShortage,
                parent_id: it.shortageLedgerId,
              })
          if (error) throw error
        } else if (successor) {
          const { error } = await supabase.from("otp_check_inventory_shortage").delete().eq("id", successor.id)
          if (error) throw error
        }
        continue
      }

      const indentRow = link.indents.find((r) => (r.items || []).some((x: any) => nameKey(x.item_name) === key))
      const freshLedger = link.ledgers.find((l) => !l.parent_id && nameKey(l.item_name) === key)
      if (indentRow) {
        indentRow.items = indentRow.items.map((x: any) => (nameKey(x.item_name) === key ? { ...x, qty: newShortage } : x))
        dirtyIndents.add(indentRow)
      } else if (freshLedger) {
        const { error } =
          newShortage > 0
            ? await supabase.from("otp_check_inventory_shortage").update({ shortage_qty: newShortage }).eq("id", freshLedger.id)
            : await supabase.from("otp_check_inventory_shortage").delete().eq("id", freshLedger.id)
        if (error) throw error
      } else if (newShortage > 0) {
        freshToRoute.push({ item_code: it.item_code || "", item_name: it.item_name, shortage_qty: newShortage })
      }
    }

    if (changes.length === 0) return NextResponse.json({ success: true, changes })

    // Indent rows first: routeFreshShortage re-reads them and may append.
    for (const row of dirtyIndents) {
      const { error } = await supabase.from("otp_indent_creation").update({ items: row.items }).eq("id", row.id)
      if (error) throw error
    }
    await routeFreshShortage(supabase, inv.order_id, inventoryId, freshToRoute)

    if (queue && queueItems) {
      // Never delete — see isEmptiedQueue. Emptied -> cancelled placeholder;
      // refilled (scanned raised again) -> back to pending.
      const { error } = await supabase
        .from("otp_pre_invoice_queue")
        .update(queueItems.length === 0 ? { items: [], status: "cancelled" } : { items: queueItems, status: "pending" })
        .eq("id", queue.id)
        .in("status", ["pending", "cancelled"])
      if (error) throw error
    } else if (newQueueItems.length > 0) {
      const { error } = await supabase.from("otp_pre_invoice_queue").insert({
        order_id: inv.order_id,
        quotation_number: order?.quotation_number || null,
        source_stage: "packing_list",
        source_id: inventoryId,
        items: newQueueItems,
      })
      if (error) throw error
    }

    const totalShortage = newInvItems.reduce((s, it) => s + it.shortage_qty, 0)
    const totalScanned = newInvItems.reduce((s, it) => s + it.scanned_qty, 0)
    const { error: invUpdateError } = await supabase
      .from("otp_check_inventory")
      .update({
        items: newInvItems,
        availability_status: totalShortage === 0 ? "Available" : totalScanned === 0 ? "Not Available" : "Partial",
      })
      .eq("id", inventoryId)
    if (invUpdateError) throw invUpdateError

    const { error: notifyError } = await supabase.from("otp_notifications").insert({
      stage: "packing-list",
      order_id: inv.order_id,
      order_no: order?.order_no || null,
      crm_name: order?.crm_name || null,
      message: `${order?.order_no || "Order"}${order?.crm_name ? ` (${order.crm_name})` : ""} — Packing List History edited by ${editedBy || "someone"}`,
      changes,
      created_by: editedBy || null,
    })
    if (notifyError) throw notifyError

    return NextResponse.json({ success: true, changes })
  } catch (err: any) {
    console.error("PATCH /api/otp-supabase/packing-list exception:", err)
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
