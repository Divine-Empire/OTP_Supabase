import { NextResponse } from "next/server"
import { getSupabaseAdmin } from "@/lib/supabase"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const search = searchParams.get("search") || ""
    
    const supabase = getSupabaseAdmin()

    let query = supabase
      .from("lto_items")
      .select("item_name")
      
    if (search) {
      query = query.ilike("item_name", `%${search}%`)
    }

    // Limit to 100 as requested, and ensure unique items by grouping/distinct
    // Note: Supabase doesn't natively have a .distinct() on select builder like this directly, 
    // but if we are just pulling item_name, we can just deduplicate in JS or use an RPC if needed.
    // For simplicity, we'll fetch a bit more and deduplicate, or just limit and let the UI deduplicate.
    const { data, error } = await query.limit(200)

    if (error) throw error

    // Deduplicate in memory
    const uniqueItems = Array.from(new Set((data || []).map(d => d.item_name)))
      .filter(Boolean)
      .slice(0, 100)
      .map(name => ({ item_name: name }))

    return NextResponse.json({ success: true, data: uniqueItems })
  } catch (err: any) {
    console.error("GET /api/otp-supabase/lto-items exception:", err)
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
