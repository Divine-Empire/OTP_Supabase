// Best-effort, fire-and-forget cross-system call into the Inventory
// Management System (IMS) when a serial-numbered item is scanned OUT at
// Check Inventory or Pre-Invoice. IMS uses this to (a) warn if older
// warranty/invoice-dated stock of the same item is still available, and
// (b) immediately record the OUT event itself — no separate sync job is
// needed for that on IMS's side.
//
// Same non-blocking philosophy as lib/pfms.ts: if IMS_API_URL isn't
// configured, or the call fails for any reason (network, IMS hasn't synced
// this serial yet, etc.), we just skip it. Nothing here should ever block
// or fail the actual warehouse scan/dispatch flow.
export async function checkSerialWithIms(params: {
  serialNo: string
  locationLabel: string | null // e.g. "C.G Warehouse", "NE Warehouse", "Maniquip Store", "Head Office"
  itemCode?: string | null
  itemName?: string | null
  source: "otp-check-inventory" | "otp-pre-invoice"
  referenceNo?: string | null
}): Promise<{ alert: string | null } | null> {
  const baseUrl = process.env.IMS_API_URL
  const apiKey = process.env.IMS_API_KEY
  if (!baseUrl || !apiKey || !params.serialNo || !params.locationLabel) return null

  try {
    const res = await fetch(`${baseUrl.replace(/\/$/, "")}/api/integrations/scan-out`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": apiKey },
      body: JSON.stringify({
        serialNo: params.serialNo,
        locationCode: params.locationLabel,
        itemCode: params.itemCode || undefined,
        itemName: params.itemName || undefined,
        source: params.source,
        referenceNo: params.referenceNo || undefined,
      }),
      signal: AbortSignal.timeout(5000),
    })
    const json = await res.json()
    if (json.success) return { alert: json.alert ?? null }
    console.warn("IMS scan-out call did not succeed:", json.error)
    return null
  } catch (err) {
    console.warn("IMS scan-out call failed (non-blocking):", err)
    return null
  }
}
