import { NextResponse } from "next/server"
import { getSupabaseAdmin } from "@/lib/supabase"

// Generic (category, value) option lists for form dropdowns — see
// Database/22_otp_dropdown_and_pre_invoice_fields.sql. Read-only for now;
// a "Master" page to manage these from the UI is a separate later task.
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const category = searchParams.get("category")
    const supabase = getSupabaseAdmin()

    let query = supabase
      .from("otp_dropdown")
      .select("category, value, sort_order")
      .eq("is_active", true)
      .order("sort_order", { ascending: true })

    if (category) query = query.eq("category", category)

    const { data, error } = await query
    if (error) throw error

    return NextResponse.json({ success: true, data: data || [] })
  } catch (err: any) {
    console.error("GET /api/otp-supabase/dropdowns exception:", err)
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
