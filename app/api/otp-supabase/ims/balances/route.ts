import { NextResponse } from "next/server"
import { getSupabaseAdmin } from "@/lib/supabase"

// Current stock balance per item+location — reads ims_v_stock_balance
// (Database/49_ims_core_schema.sql), used by Settings > Inventory (IMS)
// to show what's already been recorded after an opening-balance import.
export async function GET() {
  try {
    const supabase = getSupabaseAdmin()
    const { data, error } = await supabase
      .from("ims_v_stock_balance")
      .select("*")
      .order("item_name", { ascending: true })
    if (error) throw error
    return NextResponse.json({ success: true, data: data || [] })
  } catch (err: any) {
    console.error("GET /api/otp-supabase/ims/balances exception:", err)
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
