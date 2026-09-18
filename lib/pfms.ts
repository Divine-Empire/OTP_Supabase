// Best-effort cross-system call into Purchase-FMS-Supabase's own
// create-indent API to raise a real indent for a shortage qty. This is
// intentionally fire-and-forget from otp_material_shortage's point of
// view: that table's own `status` never depends on whether this call
// succeeded, or on matching its returned indentNo back to anything later
// (the same item_code can legitimately have other, unrelated indents
// already in flight in PFMS — indentNo is stored purely as an audit
// reference). If PFMS_CREATE_INDENT_URL isn't configured, or the call
// fails for any reason (network, item not yet registered in PFMS's Item
// Master, etc.), we just skip it and leave pfms_indent_no null.
//
// Shared by check-inventory/route.ts (first-time shortage) and
// material-received/route.ts (re-indenting whatever's still short after
// a receiving attempt).
export async function tryCreatePfmsIndent(params: {
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
