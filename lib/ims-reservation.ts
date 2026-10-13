import type { getSupabaseAdmin } from "@/lib/supabase"
import { ims, type ImsReserveItem } from "@/lib/ims"
import { imsCodeFor } from "@/lib/locations"

// Keeps IMS's stock reservation in step with otp_pre_invoice_queue. One
// pre-invoice wave (queue row) = one reservation, keyed by the queue row's id.
// A wave RESERVES stock when Packing List queues it, follows every edit made
// to it (Packing List history edit, Pre-Invoice qty reduction), is RELEASED
// if it's emptied or cancelled, and is CONSUMED (becomes a real OUT from that
// same location) when Pre-Invoice processes it.
//
// Everything here is best-effort and never throws: IMS being down must not
// stop the warehouse. Whatever slips through is fixed later by IMS's
// "Reconcile OTP Reservations" sync, which re-reads each wave's final status.

type Supabase = ReturnType<typeof getSupabaseAdmin>

type QueueItem = { item_name?: string; qty?: number | string; serials?: string[]; serial_no?: string }

const nameKey = (s: string | undefined) => (s || "").trim().toLowerCase()

/** Queue items (lump rows with serials[], or one row per serial with serial_no) -> one entry per item name. */
export function groupForIms(items: QueueItem[] | null | undefined): ImsReserveItem[] {
  const byName = new Map<string, ImsReserveItem>()
  for (const it of items || []) {
    if (!it?.item_name) continue
    const key = nameKey(it.item_name)
    const entry = byName.get(key) || { itemName: it.item_name, qty: 0, serials: [] as string[] }
    entry.qty += Number(it.qty) || 0
    const serials = [...(it.serials || []), ...(it.serial_no ? [it.serial_no] : [])].map((s) => s.trim()).filter(Boolean)
    for (const s of serials) if (!entry.serials!.includes(s)) entry.serials!.push(s)
    byName.set(key, entry)
  }
  return Array.from(byName.values()).filter((e) => e.qty > 0)
}

async function orderContext(supabase: Supabase, orderId: string) {
  const { data } = await supabase.from("otp_orders").select("order_no, order_location").eq("id", orderId).maybeSingle()
  return { orderNo: (data?.order_no as string | null) ?? null, locationCode: imsCodeFor(data?.order_location) }
}

/** Make IMS's reservation for this wave match the queue row as it stands right now. */
export async function syncWaveReservation(supabase: Supabase, queueId: string): Promise<void> {
  try {
    const { data: q } = await supabase.from("otp_pre_invoice_queue").select("id, order_id, items, status").eq("id", queueId).maybeSingle()
    if (!q || q.status === "invoiced") return

    const items = groupForIms(q.items)
    if (q.status !== "pending" || items.length === 0) {
      await ims.release(q.id)
      return
    }

    // An order with no location (converted before orders carried one) can't
    // be reserved against any godown — it just isn't tracked until it has one.
    const { orderNo, locationCode } = await orderContext(supabase, q.order_id)
    if (!locationCode) return
    await ims.reserve({ waveId: q.id, orderNo, locationCode, items })
  } catch (err) {
    console.warn("IMS reservation sync failed (non-blocking):", err)
  }
}

export async function releaseWaveReservations(waveIds: string[]): Promise<void> {
  await Promise.all(waveIds.map((id) => ims.release(id).catch(() => null)))
}

/**
 * Pre-Invoice processed: the wave's reserved stock goes OUT of its location.
 * `finalItems` is what the Pre-Invoice dialog actually saved (qty/serials may
 * have been edited); without it, the primary wave's queued items are used.
 * Other waves merged into this one give their reservation back first — the
 * final list already covers their stock.
 */
export async function consumeWaveReservation(
  supabase: Supabase,
  params: { primaryId: string; mergedIds?: string[]; finalItems?: QueueItem[] | null }
): Promise<void> {
  try {
    const { data: q } = await supabase.from("otp_pre_invoice_queue").select("id, order_id, items").eq("id", params.primaryId).maybeSingle()
    if (!q) return
    const { orderNo, locationCode } = await orderContext(supabase, q.order_id)
    if (!locationCode) return

    if (params.mergedIds?.length) await releaseWaveReservations(params.mergedIds)

    const items = groupForIms(params.finalItems && params.finalItems.length > 0 ? params.finalItems : q.items)
    await ims.consume({ waveId: q.id, orderNo, referenceNo: orderNo, locationCode, items })
  } catch (err) {
    console.warn("IMS consume failed (non-blocking):", err)
  }
}
