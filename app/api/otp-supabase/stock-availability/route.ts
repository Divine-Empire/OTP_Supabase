import { NextResponse } from "next/server"
import { getSupabaseAdmin } from "@/lib/supabase"
import { ims, imsBaseUrl } from "@/lib/ims"
import { imsCodeFor, labelForImsCode } from "@/lib/locations"

// Packing List: how much of each item on this order is free at the order's
// own location, which of that location's serials are in stock (oldest first),
// and where else the item is free (so a shortage can become a Stock Transfer
// instead of an Indent). The browser never talks to IMS directly — this route
// holds the key. Every failure mode answers 200 with `available: false`, which
// the page shows as "stock unknown" and otherwise ignores.
export async function POST(request: Request) {
  try {
    const { orderId, items } = (await request.json()) as {
      orderId: string
      items: { item_name: string; quantity: number }[]
    }
    if (!orderId || !Array.isArray(items)) {
      return NextResponse.json({ success: false, error: "Missing orderId or items" }, { status: 400 })
    }

    const supabase = getSupabaseAdmin()
    const { data: order, error } = await supabase.from("otp_orders").select("order_no, order_location").eq("id", orderId).maybeSingle()
    if (error) throw error
    if (!order) return NextResponse.json({ success: false, error: "Order not found" }, { status: 404 })

    const locationCode = imsCodeFor(order.order_location)
    const base = { success: true, orderNo: order.order_no, location: order.order_location || null, locationCode, imsUrl: imsBaseUrl() }
    if (!locationCode) return NextResponse.json({ ...base, available: false, reason: "NO_LOCATION", items: [] })

    const result = await ims.availability(
      locationCode,
      items.map((i) => ({ itemName: i.item_name, requiredQty: Number(i.quantity) || 0 }))
    )
    if (!result.ok) return NextResponse.json({ ...base, available: false, reason: "IMS_UNAVAILABLE", items: [] })

    return NextResponse.json({
      ...base,
      available: true,
      items: result.data.data.map((row) => ({
        ...row,
        elsewhere: row.elsewhere.map((e) => ({ ...e, label: labelForImsCode(e.locationCode) })),
      })),
    })
  } catch (err: any) {
    console.error("POST /api/otp-supabase/stock-availability exception:", err)
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
