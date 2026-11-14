import { NextResponse } from "next/server"
import { getSupabaseAdmin } from "@/lib/supabase"
import { requestAccess } from "@/lib/request-access"

// Reserves `count` consecutive certificate numbers (DE/N-LAB/<FY>/<n>) from the DB counter.
// Numbers are never handed out twice, even to concurrent users.
export async function POST(request: Request) {
  try {
    const access = await requestAccess(request)
    if (!access.userId) return NextResponse.json({ success: false, error: "Not signed in" }, { status: 401 })

    const { count, series } = (await request.json()) as { count?: number; series?: string }
    const n = Number(count)
    if (!Number.isInteger(n) || n < 1 || n > 500) {
      return NextResponse.json({ success: false, error: "count must be a whole number between 1 and 500" }, { status: 400 })
    }

    // "auto_level" (Database/87) and "total_station" (Database/88) each have their own counter
    // (N<year><seq>); everything else shares DE/N-LAB.
    const fn =
      series === "auto_level" ? "otp_reserve_auto_level_numbers" : series === "total_station" ? "otp_reserve_total_station_numbers" : "otp_reserve_certificate_numbers"
    const { data, error } = await getSupabaseAdmin().rpc(fn, { p_count: n })
    if (error) throw error
    return NextResponse.json({ success: true, numbers: data as string[] })
  } catch (err: any) {
    console.error("POST /api/otp-supabase/calibration/certificate-numbers exception:", err)
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
