import { NextResponse } from "next/server"
import { getSupabaseAdmin } from "@/lib/supabase"

// Distinct otp_orders.crm_name values — feeds Settings > User Management's
// "CRM Name Access" multi-select and, per-page, each stage's CRM Name
// filter dropdown options.
export async function GET() {
  try {
    const supabase = getSupabaseAdmin()
    const { data, error } = await supabase.from("otp_orders").select("crm_name").not("crm_name", "is", null)
    if (error) throw error

    const names = Array.from(new Set((data || []).map((r: any) => r.crm_name).filter(Boolean))).sort((a, b) =>
      String(a).localeCompare(String(b))
    )

    return NextResponse.json({ success: true, data: names })
  } catch (err: any) {
    console.error("GET /api/otp-supabase/crm-names exception:", err)
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
