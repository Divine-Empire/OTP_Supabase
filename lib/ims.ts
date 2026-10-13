// Server-side calls into IMS (Inventory Management System) for location-wise
// stock: availability for the Packing List, reserving a pre-invoice wave's
// stock, and turning that reservation into a real OUT once Pre-Invoice
// processes it. Server-only — IMS_API_KEY must never reach the browser, so
// the Packing List page goes through this app's own /api/otp-supabase routes.
//
// Best-effort by design (same philosophy as lib/pfms.ts): if IMS isn't
// configured, is down, or rejects the call, these return { ok: false } and
// the warehouse flow carries on. A reservation that never got consumed or
// released is picked up later by IMS's own "Reconcile OTP Reservations" sync,
// which reads each wave's final status from otp_pre_invoice_queue.

export interface ImsAvailability {
  itemName: string
  itemCodes: string[]
  onHandQty: number | null
  reservedQty: number | null
  availableQty: number | null // free = on hand - reserved; null = IMS doesn't know this item
  serials: { serialNo: string; itemCode: string; inDate: string | null }[]
  unassignedCgQty: number | null
  elsewhere: { locationCode: string; availableQty: number }[]
  shortfallQty?: number
}

export interface ImsReserveItem {
  itemName: string
  qty: number
  serials?: string[]
}

export type ImsResult<T> = { ok: true; data: T } | { ok: false; error: string }

export function imsBaseUrl(): string | null {
  return process.env.IMS_API_URL ? process.env.IMS_API_URL.replace(/\/$/, "") : null
}

async function callIms<T = any>(path: string, body: Record<string, unknown>, timeoutMs = 8000): Promise<ImsResult<T>> {
  const baseUrl = imsBaseUrl()
  const apiKey = process.env.IMS_API_KEY
  if (!baseUrl || !apiKey) return { ok: false, error: "IMS_API_URL / IMS_API_KEY not configured" }

  try {
    const res = await fetch(`${baseUrl}/api/integrations/${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": apiKey },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(timeoutMs),
    })
    const json = await res.json()
    if (json.success) return { ok: true, data: json as T }
    console.warn(`IMS ${path} did not succeed:`, json.error)
    return { ok: false, error: json.error || "IMS call failed" }
  } catch (err: any) {
    console.warn(`IMS ${path} call failed (non-blocking):`, err?.message || err)
    return { ok: false, error: err?.message || "IMS unreachable" }
  }
}

export const ims = {
  availability: (locationCode: string, items: { itemName: string; requiredQty?: number }[]) =>
    callIms<{ locationCode: string; data: ImsAvailability[] }>("stock-availability", { locationCode, items }),

  serialCheck: (locationCode: string, serialNo: string, waveId?: string) =>
    callIms<{
      known: boolean
      conflict: "ALREADY_OUT" | "OTHER_LOCATION" | "RESERVED_ELSEWHERE" | null
      status?: string
      currentLocationCode?: string | null
    }>("serial-check", { locationCode, serialNo, waveId }, 5000),

  reserve: (params: { waveId: string; orderNo?: string | null; locationCode: string; items: ImsReserveItem[] }) =>
    callIms<{ conflicts: any[]; unknownSerials: string[]; unknownItems: string[]; shortfalls: any[] }>("stock-reserve", params),

  release: (waveId: string) => callIms<{ released: number }>("stock-release", { waveId }),

  consume: (params: {
    waveId: string
    orderNo?: string | null
    referenceNo?: string | null
    locationCode?: string
    items?: ImsReserveItem[]
  }) => callIms<{ consumed: number; alreadyConsumed: boolean; failed: any[]; unknownSerials: string[] }>("stock-consume", params),
}
