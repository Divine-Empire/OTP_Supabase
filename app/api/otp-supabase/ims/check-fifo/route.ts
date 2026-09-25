import { NextResponse } from "next/server"
import { getSupabaseAdmin } from "@/lib/supabase"
import { resolveImsLocationCode } from "@/lib/ims"

// Informational FIFO preview for Check Inventory's Compare step — NOT
// binding (the actual FIFO decrement happens independently at Make
// Invoice / Debit Note submit, see Database/49_ims_core_schema.sql +
// lib/ims.ts). Given a scanned item's decoded invoice date, reports
// whether an OLDER un-consumed batch of the same item/location exists, so
// the UI can warn "use the older stock first" — a real gap can exist
// between this check and the eventual OUT if other orders consume stock
// in between; that's an accepted trade-off, not a bug.
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const itemName = searchParams.get("itemName")
    const locationLabel = searchParams.get("locationLabel")
    const scannedDate = searchParams.get("scannedDate")

    if (!itemName || !locationLabel || !scannedDate) {
      return NextResponse.json({ success: false, error: "Missing itemName, locationLabel or scannedDate" }, { status: 400 })
    }

    const supabase = getSupabaseAdmin()
    const locationCode = await resolveImsLocationCode(supabase, locationLabel)
    if (!locationCode) {
      return NextResponse.json({ success: true, hasOlderStock: false, oldestDate: null })
    }

    const itemKey = itemName.trim().toLowerCase()
    const { data, error } = await supabase
      .from("ims_stock_batches")
      .select("invoice_date")
      .eq("item_key", itemKey)
      .eq("location_code", locationCode)
      .gt("qty_remaining", 0)
      .lt("invoice_date", scannedDate)
      .order("invoice_date", { ascending: true })
      .limit(1)

    if (error) throw error

    const oldestDate = data?.[0]?.invoice_date || null
    return NextResponse.json({ success: true, hasOlderStock: !!oldestDate, oldestDate })
  } catch (err: any) {
    console.error("GET /api/otp-supabase/ims/check-fifo exception:", err)
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
