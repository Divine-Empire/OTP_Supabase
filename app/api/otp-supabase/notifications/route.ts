import { NextResponse } from "next/server"
import { getSupabaseAdmin } from "@/lib/supabase"

// In-app bell feed (otp_notifications, see Database/58_...sql).
// GET  ?stage=packing-list&username=x -> latest 50 + unread count for x
// POST { ids: string[], username }      -> mark those read for x
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const stage = searchParams.get("stage")
    const username = searchParams.get("username") || ""
    if (!stage) return NextResponse.json({ success: false, error: "Missing stage" }, { status: 400 })

    const { data, error } = await getSupabaseAdmin()
      .from("otp_notifications")
      .select("*")
      .eq("stage", stage)
      .order("created_at", { ascending: false })
      .limit(50)
    if (error) throw error

    const rows = (data || []).map((n: any) => ({ ...n, read: (n.read_by || []).includes(username) }))
    return NextResponse.json({ success: true, data: rows, unread: rows.filter((n) => !n.read).length })
  } catch (err: any) {
    console.error("GET /api/otp-supabase/notifications exception:", err)
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const { ids, username } = (await request.json()) as { ids: string[]; username: string }
    if (!Array.isArray(ids) || ids.length === 0 || !username) {
      return NextResponse.json({ success: false, error: "Missing ids or username" }, { status: 400 })
    }

    const supabase = getSupabaseAdmin()
    const { data, error } = await supabase.from("otp_notifications").select("id, read_by").in("id", ids)
    if (error) throw error

    await Promise.all(
      (data || [])
        .filter((n: any) => !(n.read_by || []).includes(username))
        .map(async (n: any) => {
          const { error: updateError } = await supabase
            .from("otp_notifications")
            .update({ read_by: [...(n.read_by || []), username] })
            .eq("id", n.id)
          if (updateError) throw updateError
        })
    )
    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error("POST /api/otp-supabase/notifications exception:", err)
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
