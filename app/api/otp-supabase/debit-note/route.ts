import { NextResponse } from "next/server"
import { getSupabaseAdmin } from "@/lib/supabase"
import { consumeImsStock, resolveImsLocationCode } from "@/lib/ims"

// Stage — Debit Note (only reached when otp_orders.payment_mode = 'na' —
// see order-acceptable/route.ts). Terminal: processing here just moves the
// order to History, nothing further gets scheduled.
//
// Pending: otp_orders_acceptable.debit_note_planned IS NOT NULL AND
//          no matching otp_debit_note row yet.
// History: a matching otp_debit_note row exists.
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get("status")
    const supabase = getSupabaseAdmin()

    if (status === "history") {
      const { data, error } = await supabase
        .from("otp_debit_note")
        .select("*, order:otp_orders(*)")
        .order("created_at", { ascending: false })
      if (error) throw error

      return NextResponse.json({ success: true, data: data || [] })
    }

    const { data: doneRows, error: doneError } = await supabase.from("otp_debit_note").select("order_id")
    if (doneError) throw doneError
    const doneIds = (doneRows || []).map((r: any) => r.order_id).filter(Boolean)

    let query = supabase
      .from("otp_orders_acceptable")
      .select("*, order:otp_orders(*)")
      .not("debit_note_planned", "is", null)
      .order("created_at", { ascending: false })

    if (doneIds.length > 0) {
      query = query.not("order_id", "in", `(${doneIds.join(",")})`)
    }

    const { data, error } = await query
    if (error) throw error

    return NextResponse.json({ success: true, data: data || [] })
  } catch (err: any) {
    console.error("GET /api/otp-supabase/debit-note exception:", err)
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { orderId, dnNumber, dnAttachmentUrl, items, locationLabel, createdBy } = body as {
      orderId: string
      dnNumber?: string
      dnAttachmentUrl?: string
      items?: { itemName: string; qty: number }[]
      locationLabel?: string
      createdBy?: string
    }

    if (!orderId) {
      return NextResponse.json({ success: false, error: "Missing orderId" }, { status: 400 })
    }

    const supabase = getSupabaseAdmin()

    const { data, error } = await supabase
      .from("otp_debit_note")
      .insert({
        order_id: orderId,
        dn_number: dnNumber || null,
        dn_attachment_url: dnAttachmentUrl || null,
        created_by: createdBy || null,
      })
      .select()
      .single()
    if (error) throw error

    // IMS OUT — this stage never goes through Check Inventory
    // (payment_mode = 'na' orders skip it), so the item list + location
    // are captured manually here instead of scanned. Best-effort, no
    // shortage/indent creation (unlike Check Inventory's flow) — never
    // blocks the Debit Note submission itself.
    let imsWarnings: { itemName: string; requestedQty: number }[] = []
    try {
      const locationCode = await resolveImsLocationCode(supabase, locationLabel)
      const results = await consumeImsStock(
        supabase,
        (items || []).map((it) => ({ itemName: it.itemName, qty: Number(it.qty) || 0 })),
        locationCode,
        "debit_note",
        data.id,
        createdBy || null
      )
      imsWarnings = results.filter((r) => r.wentNegative).map((r) => ({ itemName: r.itemName, requestedQty: r.requestedQty }))
    } catch (imsErr) {
      console.error("IMS OUT exception for debit_note:", data.id, imsErr)
    }

    return NextResponse.json({ success: true, data, imsWarnings })
  } catch (err: any) {
    console.error("POST /api/otp-supabase/debit-note exception:", err)
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
