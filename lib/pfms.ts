// Best-effort cross-system call into Purchase-FMS-Supabase's own
// create-indent API to raise a real indent for a shortage qty. This is
// intentionally fire-and-forget from otp_indent_creation's point of view:
// that row's own lifecycle (Pending -> Material Received -> History) never
// depends on whether this call succeeded, or on matching its returned
// indentNo back to anything later (the same item_code can legitimately
// have other, unrelated indents already in flight in PFMS — indentNo is
// stored purely as an audit reference). If PFMS_CREATE_INDENT_URL isn't
// configured, or the call fails for any reason (network, item not yet
// registered in PFMS's Item Master, etc.), we just skip it and leave
// pfms_indent_no null.
//
// Called from indent-creation/route.ts's POST (the process-form submit
// that moves a row from Pending to the Material Received tab) — once per
// otp_indent_creation row's submit. An order can now have more than one
// such row over its lifetime (Database/53_indent_creation_repeatable.sql),
// so this can fire more than once per order, just never twice for the
// same indent row.
//
// PFMS's create-indent API rejects the WHOLE batch unless every item's
// itemName+category combo matches an pfms_item_master row exactly (see
// findUnregisteredItems in Purchase-FMS-Supabase/app/api/create-indent/route.ts)
// — sending a blank category here used to make every real item look
// "unregistered" even when it has a real, non-empty category in PFMS's
// catalog, so every call failed. PFMS's own /api/dropdowns endpoint already
// returns that catalog (item name -> category), so look the real category
// up there first. An item genuinely missing from PFMS's catalog (never
// added there at all) still has no category to find and the call will
// correctly fail just for that item's batch — that's a real data gap on
// PFMS's side, not something this lookup can paper over.
async function resolveItemCategories(baseUrl: string, itemNames: string[]): Promise<Map<string, string>> {
  const map = new Map<string, string>()
  try {
    const res = await fetch(`${baseUrl}/api/dropdowns`, { signal: AbortSignal.timeout(8000) })
    const json = await res.json()
    const items: { itemName?: string; category?: string }[] = json?.data?.items || []
    for (const it of items) {
      const name = (it.itemName || "").trim().toLowerCase()
      if (name && it.category) map.set(name, it.category)
    }
  } catch (err) {
    console.warn("PFMS dropdowns lookup failed (category resolution skipped):", err)
  }
  return map
}

export async function tryCreatePfmsIndent(params: {
  orderNo: string
  warehouseLocation: string | null
  leadTime: number | null
  items: { item_code: string; item_name: string; qty: number }[]
}): Promise<string[] | null> {
  const baseUrl = process.env.PFMS_CREATE_INDENT_URL
  if (!baseUrl || params.items.length === 0) return null
  const cleanBaseUrl = baseUrl.replace(/\/$/, "")

  try {
    const categoryByName = await resolveItemCategories(
      cleanBaseUrl,
      params.items.map((it) => it.item_name)
    )

    const res = await fetch(`${cleanBaseUrl}/api/create-indent`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "insertIndent",
        createdBy: "OTP System (auto)",
        warehouseLocation: params.warehouseLocation || "",
        leadTime: params.leadTime,
        attachment: null,
        items: params.items.map((it) => ({
          category: categoryByName.get(it.item_name.trim().toLowerCase()) || "",
          itemName: it.item_name,
          quantity: it.qty,
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
