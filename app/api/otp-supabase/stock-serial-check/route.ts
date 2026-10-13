import { NextResponse } from "next/server"
import { getSupabaseAdmin } from "@/lib/supabase"
import { ims } from "@/lib/ims"
import { imsCodeFor, labelForImsCode } from "@/lib/locations"

// Packing List scan: is this serial usable at the order's location? Only a
// clear conflict (it's in another godown, already dispatched, or held by
// another order) comes back as `conflict` — the page blocks the scan on that
// alone. A serial IMS has never seen, or IMS being unreachable, is NOT a
// conflict (`checked`/`known` tell the page to warn at most).
export async function POST(request: Request) {
  try {
    const { orderId, serialNos } = (await request.json()) as { orderId: string; serialNos: string[] }
    if (!orderId || !Array.isArray(serialNos)) {
      return NextResponse.json({ success: false, error: "Missing orderId or serialNos" }, { status: 400 })
    }

    const supabase = getSupabaseAdmin()
    const { data: order, error } = await supabase.from("otp_orders").select("order_location").eq("id", orderId).maybeSingle()
    if (error) throw error
    const locationCode = imsCodeFor(order?.order_location)
    if (!locationCode) return NextResponse.json({ success: true, checked: false, results: [] })

    const results = await Promise.all(
      serialNos.map(async (serialNo) => {
        const r = await ims.serialCheck(locationCode, serialNo)
        if (!r.ok) return { serialNo, checked: false, known: false, conflict: null }
        return {
          serialNo,
          checked: true,
          known: r.data.known,
          conflict: r.data.conflict,
          status: r.data.status ?? null,
          currentLocation: r.data.currentLocationCode ? labelForImsCode(r.data.currentLocationCode) : null,
        }
      })
    )
    return NextResponse.json({ success: true, checked: results.some((r) => r.checked), results })
  } catch (err: any) {
    console.error("POST /api/otp-supabase/stock-serial-check exception:", err)
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
