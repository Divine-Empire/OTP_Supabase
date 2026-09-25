import { getSupabaseAdmin } from "@/lib/supabase"

// Shared IMS OUT helper — used by Make Invoice and (na-payment) Debit Note,
// the two stock-decrement points (see Database/49_ims_core_schema.sql for
// the FIFO engine itself). Never blocks: ims_consume_stock always succeeds,
// dumping any shortfall onto a negative "shortfall" batch — callers surface
// `wentNegative` items back to the frontend as a non-blocking warning.

export interface ImsOutItem {
  itemName: string
  qty: number
}

export interface ImsOutResult {
  itemName: string
  requestedQty: number
  wentNegative: boolean
}

// Same lenient match as app/api/otp-supabase/ims/receive/route.ts —
// warehouse names are spelled slightly differently across the forms that
// capture them (e.g. "C.G Warehouse" vs "C.G. Warehouse").
export async function resolveImsLocationCode(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  locationLabel: string | null | undefined
): Promise<string | null> {
  if (!locationLabel) return null
  const { data } = await supabase.from("ims_locations").select("code, label")
  const normalize = (s: string) => s.replace(/[.\s]+/g, "").toLowerCase()
  const target = normalize(locationLabel)
  return (data || []).find((l: any) => normalize(l.label) === target)?.code || null
}

// Decrements IMS stock (FIFO) for every item in `items`, at `locationCode`.
// Best-effort per item — one item's failure doesn't stop the rest. Returns
// which items (if any) pushed their stock negative, for the caller to
// surface as a non-blocking "blinking alert" in the UI.
export async function consumeImsStock(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  items: ImsOutItem[],
  locationCode: string | null,
  sourceType: string,
  sourceRef: string,
  createdBy: string | null
): Promise<ImsOutResult[]> {
  if (!locationCode) {
    console.error(`IMS consume skipped for ${sourceType}:${sourceRef} — no resolvable location`)
    return items
      .filter((it) => it.itemName && it.qty > 0)
      .map((it) => ({ itemName: it.itemName, requestedQty: it.qty, wentNegative: false }))
  }

  const results: ImsOutResult[] = []
  for (const item of items) {
    if (!item.itemName || !item.qty || item.qty <= 0) continue
    try {
      const { data, error } = await supabase.rpc("ims_consume_stock", {
        p_item_name: item.itemName,
        p_location_code: locationCode,
        p_qty: item.qty,
        p_source_type: sourceType,
        p_source_ref: sourceRef,
        p_created_by: createdBy,
      })
      if (error) {
        console.error(`IMS consume failed for "${item.itemName}" (${sourceType}:${sourceRef}):`, error)
        continue
      }
      const wentNegative = Array.isArray(data) && data.some((row: any) => row.went_negative)
      results.push({ itemName: item.itemName, requestedQty: item.qty, wentNegative })
    } catch (err) {
      console.error(`IMS consume exception for "${item.itemName}" (${sourceType}:${sourceRef}):`, err)
    }
  }
  return results
}
