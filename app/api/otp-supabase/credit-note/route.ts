import { NextResponse } from "next/server"
import { getSupabaseAdmin } from "@/lib/supabase"

const nameKey = (name?: string | null) => (name || "").trim().toLowerCase()

// How much of each item on an invoice_number has ALREADY been put into a
// credit note — pending or completed both count, so two people can't
// independently reserve the same units (see
// Database/60_credit_note.sql's header comment). Keyed by
// `${orderId}::${nameKey(item_name)}` since the same item name could appear
// on more than one of this invoice_number's orders.
async function loadAlreadyCredited(supabase: ReturnType<typeof getSupabaseAdmin>, invoiceNumber: string) {
  const { data, error } = await supabase.from("otp_credit_note").select("items").eq("invoice_number", invoiceNumber)
  if (error) throw error
  const qtyByKey = new Map<string, number>()
  for (const row of data || []) {
    for (const it of (row.items || []) as any[]) {
      const key = `${it.order_id}::${nameKey(it.item_name)}`
      qtyByKey.set(key, (qtyByKey.get(key) || 0) + (Number(it.qty) || 0))
    }
  }
  return qtyByKey
}

// Stage — Credit Note. Independent of the planned-date chain every other
// stage uses — triggered manually from Make Invoice's own History (see
// app/make-invoice/page.tsx's "Credit Note" button), not derived from a
// parent row's planned column.
//
// GET ?view=invoices — the invoice picker grid: otp_make_invoice rows
//   grouped by invoice_number (one physical invoice can span more than one
//   wave/order — see Database/60_credit_note.sql), each item's remaining
//   creditable qty = invoiced qty minus loadAlreadyCredited. An invoice
//   whose every item is fully credited is left out entirely.
// GET ?status=pending|history — the stage's own two tabs, plain
//   status='pending'/'completed' rows, no planned-date join needed.
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const view = searchParams.get("view")
    const status = searchParams.get("status")
    const supabase = getSupabaseAdmin()

    if (view === "invoices") {
      const { data: miRows, error: miError } = await supabase
        .from("otp_make_invoice")
        .select("id, invoice_number, invoice_date, items, order:otp_orders(id, order_no, company_name, po_number, crm_name, order_location)")
        .order("invoice_number", { ascending: true })
      if (miError) throw miError

      const byInvoice = new Map<string, any[]>()
      for (const row of miRows || []) {
        if (!byInvoice.has(row.invoice_number)) byInvoice.set(row.invoice_number, [])
        byInvoice.get(row.invoice_number)!.push(row)
      }

      const cards = await Promise.all(
        Array.from(byInvoice.entries()).map(async ([invoiceNumber, rows]) => {
          const alreadyCredited = await loadAlreadyCredited(supabase, invoiceNumber)

          const items: any[] = []
          for (const row of rows) {
            const order = (row as any).order || {}
            for (const it of (row.items || []) as any[]) {
              const key = `${order.id}::${nameKey(it.item_name)}`
              const invoicedQty = Number(it.qty) || 0
              const remainingQty = Math.max(invoicedQty - (alreadyCredited.get(key) || 0), 0)
              items.push({
                order_id: order.id,
                order_no: order.order_no,
                make_invoice_id: row.id,
                item_code: it.item_code || null,
                item_name: it.item_name,
                invoiced_qty: invoicedQty,
                remaining_qty: remainingQty,
              })
            }
          }
          if (!items.some((it) => it.remaining_qty > 0)) return null

          const orders = Array.from(new Map(rows.map((r: any) => [r.order?.id, r.order])).values()).filter(Boolean)
          return {
            invoiceNumber,
            invoiceDate: rows[0].invoice_date,
            orderNos: orders.map((o: any) => o.order_no).filter(Boolean),
            companyName: orders[0]?.company_name || "",
            poNumbers: Array.from(new Set(orders.map((o: any) => o.po_number).filter(Boolean))),
            crmName: orders[0]?.crm_name || "",
            orderLocation: orders[0]?.order_location || "",
            items,
          }
        })
      )

      return NextResponse.json({ success: true, data: cards.filter(Boolean) })
    }

    const { data, error } = await supabase
      .from("otp_credit_note")
      .select("*")
      .eq("status", status === "history" ? "completed" : "pending")
      .order("created_at", { ascending: false })
      .limit(status === "history" ? 200 : 1000)
    if (error) throw error

    return NextResponse.json({ success: true, data: data || [] })
  } catch (err: any) {
    console.error("GET /api/otp-supabase/credit-note exception:", err)
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}

// Step 1 — created from Make Invoice's invoice grid. Re-validates every
// item's qty against the live remaining-creditable amount server-side
// (never trusts the grid's own numbers, which could be stale by the time
// of submit).
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { invoiceNumber, companyName, poNumber, crmName, items, createdBy } = body as {
      invoiceNumber: string
      companyName?: string
      poNumber?: string
      crmName?: string
      items: { order_id: string; order_no: string; make_invoice_id: string; item_code: string | null; item_name: string; qty: number }[]
      createdBy?: string
    }

    if (!invoiceNumber || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ success: false, error: "Missing invoiceNumber or items" }, { status: 400 })
    }
    for (const it of items) {
      if (!Number.isFinite(Number(it.qty)) || Number(it.qty) <= 0) {
        return NextResponse.json({ success: false, error: `${it.item_name}: qty must be greater than 0` }, { status: 400 })
      }
    }

    const supabase = getSupabaseAdmin()

    const { data: miRows, error: miError } = await supabase
      .from("otp_make_invoice")
      .select("items, order_id")
      .eq("invoice_number", invoiceNumber)
    if (miError) throw miError
    if (!miRows || miRows.length === 0) {
      return NextResponse.json({ success: false, error: "Invoice not found" }, { status: 404 })
    }

    const invoicedQtyByKey = new Map<string, number>()
    for (const row of miRows) {
      for (const it of (row.items || []) as any[]) {
        const key = `${row.order_id}::${nameKey(it.item_name)}`
        invoicedQtyByKey.set(key, (invoicedQtyByKey.get(key) || 0) + (Number(it.qty) || 0))
      }
    }
    const alreadyCredited = await loadAlreadyCredited(supabase, invoiceNumber)

    const { data: locOrder, error: locError } = await supabase
      .from("otp_orders")
      .select("order_location")
      .eq("id", miRows[0].order_id)
      .maybeSingle()
    if (locError) throw locError

    for (const it of items) {
      const key = `${it.order_id}::${nameKey(it.item_name)}`
      const remaining = (invoicedQtyByKey.get(key) || 0) - (alreadyCredited.get(key) || 0)
      if (Number(it.qty) > remaining) {
        return NextResponse.json(
          { success: false, error: `${it.item_name}: only ${Math.max(remaining, 0)} left to credit` },
          { status: 409 }
        )
      }
    }

    const { data, error } = await supabase
      .from("otp_credit_note")
      .insert({
        invoice_number: invoiceNumber,
        company_name: companyName || null,
        po_number: poNumber || null,
        crm_name: crmName || null,
        order_location: locOrder?.order_location || null,
        items,
        created_by: createdBy || null,
      })
      .select()
      .single()
    if (error) throw error

    return NextResponse.json({ success: true, data })
  } catch (err: any) {
    console.error("POST /api/otp-supabase/credit-note exception:", err)
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}

// Step 2 — Credit Note's own Pending-tab process form: qty can be edited
// further down, or an item dropped entirely (just omit it from `items`),
// then remarks + submit flips status to 'completed'.
export async function PATCH(request: Request) {
  try {
    const { id, items, remarks, submittedBy } = (await request.json()) as {
      id: string
      items: { order_id: string; order_no: string; make_invoice_id: string; item_code: string | null; item_name: string; qty: number }[]
      remarks?: string
      submittedBy?: string
    }
    if (!id || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ success: false, error: "At least one item is required" }, { status: 400 })
    }
    for (const it of items) {
      if (!Number.isFinite(Number(it.qty)) || Number(it.qty) <= 0) {
        return NextResponse.json({ success: false, error: `${it.item_name}: qty must be greater than 0` }, { status: 400 })
      }
    }

    const supabase = getSupabaseAdmin()

    const { data: row, error: rowError } = await supabase
      .from("otp_credit_note")
      .select("invoice_number, items, status")
      .eq("id", id)
      .maybeSingle()
    if (rowError) throw rowError
    if (!row) return NextResponse.json({ success: false, error: "Credit Note not found" }, { status: 404 })
    if (row.status !== "pending") {
      return NextResponse.json({ success: false, error: "Only a Pending Credit Note can be submitted" }, { status: 409 })
    }

    // Re-check against the live invoice + every OTHER credit note (this
    // row's own original reservation is excluded, since it's being
    // replaced by whatever qty is submitted here).
    const { data: miRows, error: miError } = await supabase
      .from("otp_make_invoice")
      .select("items, order_id")
      .eq("invoice_number", row.invoice_number)
    if (miError) throw miError

    const invoicedQtyByKey = new Map<string, number>()
    for (const r of miRows || []) {
      for (const it of (r.items || []) as any[]) {
        const key = `${r.order_id}::${nameKey(it.item_name)}`
        invoicedQtyByKey.set(key, (invoicedQtyByKey.get(key) || 0) + (Number(it.qty) || 0))
      }
    }
    const { data: otherRows, error: otherError } = await supabase
      .from("otp_credit_note")
      .select("items")
      .eq("invoice_number", row.invoice_number)
      .neq("id", id)
    if (otherError) throw otherError
    const creditedByOthers = new Map<string, number>()
    for (const r of otherRows || []) {
      for (const it of (r.items || []) as any[]) {
        const key = `${it.order_id}::${nameKey(it.item_name)}`
        creditedByOthers.set(key, (creditedByOthers.get(key) || 0) + (Number(it.qty) || 0))
      }
    }

    for (const it of items) {
      const key = `${it.order_id}::${nameKey(it.item_name)}`
      const remaining = (invoicedQtyByKey.get(key) || 0) - (creditedByOthers.get(key) || 0)
      if (Number(it.qty) > remaining) {
        return NextResponse.json(
          { success: false, error: `${it.item_name}: only ${Math.max(remaining, 0)} left to credit` },
          { status: 409 }
        )
      }
    }

    const { data, error } = await supabase
      .from("otp_credit_note")
      .update({
        items,
        remarks: remarks || null,
        status: "completed",
        submitted_by: submittedBy || null,
        submitted_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("status", "pending")
      .select()
      .single()
    if (error) throw error

    return NextResponse.json({ success: true, data })
  } catch (err: any) {
    console.error("PATCH /api/otp-supabase/credit-note exception:", err)
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
