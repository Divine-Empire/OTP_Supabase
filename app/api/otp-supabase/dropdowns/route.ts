import { NextResponse } from "next/server"
import { getSupabaseAdmin } from "@/lib/supabase"

// Generic (category, value) option lists for form dropdowns — see
// Database/22_otp_dropdown_and_pre_invoice_fields.sql. Managed from
// Settings > Dropdown (app/settings/page.tsx) — values only; categories
// themselves are fixed (whatever already exists in the table), see the
// POST handler's guard below.
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const category = searchParams.get("category")
    const supabase = getSupabaseAdmin()

    let query = supabase
      .from("otp_dropdown")
      .select("id, category, value, sort_order")
      .eq("is_active", true)
      .order("category", { ascending: true })
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

// Adds a new value to an EXISTING category only — creating a brand-new
// category isn't supported here, only through a real migration
// (Database/*.sql), same as every other otp_dropdown category so far.
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { category, value } = body as { category?: string; value?: string }

    if (!category || !value) {
      return NextResponse.json({ success: false, error: "category and value are required" }, { status: 400 })
    }

    const supabase = getSupabaseAdmin()

    // Guard: only an already-seeded category can receive new values, and
    // this same query doubles as the "what's the next sort_order" lookup
    // (append to the end, no manual sort-order input in the UI).
    const { data: existing, error: existingError } = await supabase
      .from("otp_dropdown")
      .select("sort_order")
      .eq("category", category)
      .order("sort_order", { ascending: false })
      .limit(1)
    if (existingError) throw existingError
    if (!existing || existing.length === 0) {
      return NextResponse.json({ success: false, error: "Unknown category — only values can be added, not new categories" }, { status: 400 })
    }
    const nextSortOrder = (existing[0].sort_order ?? 0) + 1

    const { data, error } = await supabase
      .from("otp_dropdown")
      .insert({
        category,
        value: value.trim(),
        sort_order: nextSortOrder,
      })
      .select()
      .single()
    if (error) throw error

    return NextResponse.json({ success: true, data })
  } catch (err: any) {
    console.error("POST /api/otp-supabase/dropdowns exception:", err)
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json()
    const { id, value } = body as { id?: string; value?: string }

    if (!id || !value) {
      return NextResponse.json({ success: false, error: "id and value are required" }, { status: 400 })
    }

    const supabase = getSupabaseAdmin()
    const { data, error } = await supabase
      .from("otp_dropdown")
      .update({ value: value.trim() })
      .eq("id", id)
      .select()
      .single()
    if (error) throw error

    return NextResponse.json({ success: true, data })
  } catch (err: any) {
    console.error("PUT /api/otp-supabase/dropdowns exception:", err)
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")

    if (!id) {
      return NextResponse.json({ success: false, error: "id is required" }, { status: 400 })
    }

    const supabase = getSupabaseAdmin()
    const { error } = await supabase.from("otp_dropdown").delete().eq("id", id)
    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error("DELETE /api/otp-supabase/dropdowns exception:", err)
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
