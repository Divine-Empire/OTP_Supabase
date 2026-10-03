import { NextResponse } from "next/server"
import { getSupabaseAdmin } from "@/lib/supabase"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const search = searchParams.get("search") || ""
    
    const supabase = getSupabaseAdmin()

    let query = supabase
      .from("lto_items")
      .select("item_name, item_code")

    // Matches on item_name OR item_code -- lets the user find an item by
    // whichever one they actually know/remember.
    if (search) {
      const escaped = search.replace(/[%,]/g, "")
      query = query.or(`item_name.ilike.%${escaped}%,item_code.ilike.%${escaped}%`)
    }

    // Limit to 100 as requested, and ensure unique items by grouping/distinct
    // Note: Supabase doesn't natively have a .distinct() on select builder like this directly,
    // but if we are just pulling item_name, we can just deduplicate in JS or use an RPC if needed.
    // For simplicity, we'll fetch a bit more and deduplicate, or just limit and let the UI deduplicate.
    const { data, error } = await query.limit(200)

    if (error) throw error

    // Deduplicate in memory (by item_name -- the same name can have more
    // than one row/code in lto_items; first one wins).
    const seen = new Set<string>()
    const uniqueItems: { item_name: string; item_code: string | null }[] = []
    for (const d of data || []) {
      if (!d.item_name || seen.has(d.item_name)) continue
      seen.add(d.item_name)
      uniqueItems.push({ item_name: d.item_name, item_code: d.item_code || null })
      if (uniqueItems.length >= 100) break
    }

    return NextResponse.json({ success: true, data: uniqueItems })
  } catch (err: any) {
    console.error("GET /api/otp-supabase/lto-items exception:", err)
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
