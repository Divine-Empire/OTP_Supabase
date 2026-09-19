import { NextResponse } from "next/server"
import { getSupabaseAdmin } from "@/lib/supabase"

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
    const { orderId, dnNumber, dnAttachmentUrl, createdBy } = body as {
      orderId: string
      dnNumber?: string
      dnAttachmentUrl?: string
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

    return NextResponse.json({ success: true, data })
  } catch (err: any) {
    console.error("POST /api/otp-supabase/debit-note exception:", err)
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
