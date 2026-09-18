import { NextResponse } from "next/server"
import { getSupabaseAdmin } from "@/lib/supabase"

// Stage — Pre-Invoice.
//
// Pending: otp_pre_invoice_queue.status = 'pending' (a queue row per wave —
//          Check Inventory's available-qty submission creates one; a future
//          Material Received partial-receipt submission will create more
//          for the same order).
// History: otp_pre_invoice_queue.status = 'invoiced'.
//
// The Invoice Number captured here becomes the tracking key for every
// stage after this one — this route doesn't do anything with it beyond
// storing it; downstream stages are built separately.
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get("status") === "history" ? "invoiced" : "pending"
    const supabase = getSupabaseAdmin()

    const { data, error } = await supabase
      .from("otp_pre_invoice_queue")
      .select("*, order:otp_orders(*)")
      .eq("status", status)
      .order("created_at", { ascending: false })

    if (error) throw error

    return NextResponse.json({ success: true, data: data || [] })
  } catch (err: any) {
    console.error("GET /api/otp-supabase/pre-invoice exception:", err)
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { id, invoiceNumber, invoiceCopyUrl, createdBy } = body as {
      id: string
      invoiceNumber: string
      invoiceCopyUrl?: string
      createdBy?: string
    }

    if (!id || !invoiceNumber) {
      return NextResponse.json(
        { success: false, error: "Missing id or invoiceNumber" },
        { status: 400 }
      )
    }

    const supabase = getSupabaseAdmin()

    const { data, error } = await supabase
      .from("otp_pre_invoice_queue")
      .update({
        invoice_number: invoiceNumber,
        invoice_copy_url: invoiceCopyUrl || null,
        created_by: createdBy || null,
        status: "invoiced",
        invoiced_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("status", "pending")
      .select()
      .single()

    if (error) throw error
    if (!data) {
      return NextResponse.json(
        { success: false, error: "Queue row not found or already invoiced" },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true, data })
  } catch (err: any) {
    console.error("POST /api/otp-supabase/pre-invoice exception:", err)
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
