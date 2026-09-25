import { NextResponse } from "next/server"
import { getSupabaseAdmin } from "@/lib/supabase"
import { resolveImsLocationCode } from "@/lib/ims"

// Opening-balance import — Settings > Inventory (IMS), CSV-driven. Each
// row is IDEMPOTENT per (item, location): re-uploading the same row later
// (e.g. to fix a typo) replaces that item+location's opening batch rather
// than adding a second one — see ims_set_opening_balance in
// Database/50_ims_opening_balance_csv_import.sql. Real Tally Entry
// receipts (source_type = 'tally_entry') are a separate batch lineage,
// untouched by this.
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { rows, createdBy } = body as {
      rows: {
        itemName: string
        itemCode?: string
        category?: string
        groupName?: string
        locationLabel: string
        openingQty?: number
        maxLevel?: number
      }[]
      createdBy?: string
    }

    if (!Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json({ success: false, error: "No rows to import" }, { status: 400 })
    }

    const supabase = getSupabaseAdmin()
    const results: { itemName: string; success: boolean; error?: string }[] = []

    for (const row of rows) {
      try {
        if (!row.itemName || !row.locationLabel) {
          results.push({ itemName: row.itemName || "(blank)", success: false, error: "Missing item name or location" })
          continue
        }
        const locationCode = await resolveImsLocationCode(supabase, row.locationLabel)
        if (!locationCode) {
          results.push({ itemName: row.itemName, success: false, error: `Unknown location "${row.locationLabel}"` })
          continue
        }

        const { error } = await supabase.rpc("ims_set_opening_balance", {
          p_item_name: row.itemName,
          p_item_code: row.itemCode || null,
          p_category: row.category || null,
          p_group_name: row.groupName || null,
          p_location_code: locationCode,
          p_qty: row.openingQty || null,
          p_max_level: row.maxLevel ?? null,
          p_created_by: createdBy || null,
        })
        if (error) throw error

        results.push({ itemName: row.itemName, success: true })
      } catch (rowErr: any) {
        results.push({ itemName: row.itemName, success: false, error: rowErr.message })
      }
    }

    return NextResponse.json({ success: true, results })
  } catch (err: any) {
    console.error("POST /api/otp-supabase/ims/opening-balance exception:", err)
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
