import { NextResponse } from "next/server"
import { getSupabaseAdmin } from "@/lib/supabase"

// Aggregates real pipeline data for the Dashboard — every number here comes
// from the actual otp_* tables (no more dead otp_v_order_full /
// otp_v_dispatch_full views). Pending counts per stage mirror the exact
// same "planned IS NOT NULL AND no matching child row" logic each stage's
// own GET route already uses.
export async function GET() {
  try {
    const supabase = getSupabaseAdmin()

    const [
      ordersRes,
      acceptableRes,
      proformaRes,
      debitNoteRes,
      checkInvRes,
      shortageRes,
      queueRes,
      debitNoteInvRes,
      makeInvoiceRes,
      calibrationRes,
    ] = await Promise.all([
      supabase.from("otp_orders").select("id, order_no, company_name, payment_mode, amount_with_tax, created_at"),
      supabase.from("otp_orders_acceptable").select("order_id, is_order_acceptable, check_inventory_planned, proforma_invoice_planned, debit_note_planned"),
      supabase.from("otp_proforma_invoice").select("order_id"),
      supabase.from("otp_debit_note").select("order_id"),
      supabase.from("otp_check_inventory").select("order_id"),
      supabase.from("otp_material_shortage").select("status"),
      supabase.from("otp_pre_invoice_queue").select("id, status, debit_note_planned, make_invoice_planned"),
      supabase.from("otp_debit_note_for_invoice").select("pre_invoice_queue_id"),
      supabase.from("otp_make_invoice").select("id, pre_invoice_queue_id, total_bill_amount, calibration_planned, created_at"),
      supabase.from("otp_calibration_certificate").select("make_invoice_id"),
    ])

    for (const r of [ordersRes, acceptableRes, proformaRes, debitNoteRes, checkInvRes, shortageRes, queueRes, debitNoteInvRes, makeInvoiceRes, calibrationRes]) {
      if (r.error) throw r.error
    }

    const orders = ordersRes.data || []
    const acceptableRows = acceptableRes.data || []
    const proformaDoneIds = new Set((proformaRes.data || []).map((r: any) => r.order_id))
    const debitNoteDoneIds = new Set((debitNoteRes.data || []).map((r: any) => r.order_id))
    const checkInvDoneIds = new Set((checkInvRes.data || []).map((r: any) => r.order_id))
    const shortageRows = shortageRes.data || []
    const queueRows = queueRes.data || []
    const debitNoteInvDoneIds = new Set((debitNoteInvRes.data || []).map((r: any) => r.pre_invoice_queue_id))
    const makeInvoiceRows = makeInvoiceRes.data || []
    const makeInvoiceDoneQueueIds = new Set(makeInvoiceRows.map((r: any) => r.pre_invoice_queue_id))
    const calibrationDoneIds = new Set((calibrationRes.data || []).map((r: any) => r.make_invoice_id))

    const acceptableDoneIds = new Set(acceptableRows.map((r: any) => r.order_id))

    // Pipeline stage pending counts, in pipeline order.
    const pipelineStages = [
      {
        key: "order_acceptable",
        label: "Order Acceptable",
        pending: orders.length - acceptableDoneIds.size,
      },
      {
        key: "proforma_invoice",
        label: "Pro-Forma Invoice",
        pending: acceptableRows.filter((r: any) => r.proforma_invoice_planned && !proformaDoneIds.has(r.order_id)).length,
      },
      {
        key: "debit_note",
        label: "Debit Note",
        pending: acceptableRows.filter((r: any) => r.debit_note_planned && !debitNoteDoneIds.has(r.order_id)).length,
      },
      {
        key: "check_inventory",
        label: "Check Inventory",
        pending: acceptableRows.filter((r: any) => r.check_inventory_planned && !checkInvDoneIds.has(r.order_id)).length,
      },
      {
        key: "material_received",
        label: "Material Received",
        pending: shortageRows.filter((r: any) => r.status === "pending").length,
      },
      {
        key: "pre_invoice",
        label: "Pre-Invoice",
        pending: queueRows.filter((r: any) => r.status === "pending").length,
      },
      {
        key: "debit_note_for_invoice",
        label: "Debit Note (Inv.)",
        pending: queueRows.filter((r: any) => r.debit_note_planned && !debitNoteInvDoneIds.has(r.id)).length,
      },
      {
        key: "make_invoice",
        label: "Make Invoice",
        pending: queueRows.filter((r: any) => r.make_invoice_planned && !makeInvoiceDoneQueueIds.has(r.id)).length,
      },
      {
        key: "calibration",
        label: "Calibration Certificate",
        pending: makeInvoiceRows.filter((r: any) => r.calibration_planned && !calibrationDoneIds.has(r.id)).length,
      },
    ]

    const now = new Date()
    const ordersThisMonth = orders.filter((o: any) => {
      if (!o.created_at) return false
      const d = new Date(o.created_at)
      return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()
    }).length

    const totalOrderValue = orders.reduce((sum: number, o: any) => sum + (Number(o.amount_with_tax) || 0), 0)
    const totalInvoicedRevenue = makeInvoiceRows.reduce((sum: number, r: any) => sum + (Number(r.total_bill_amount) || 0), 0)

    const paymentModeMap: Record<string, number> = {}
    const customerMap: Record<string, { name: string; orders: number; value: number }> = {}
    const monthBuckets: Record<string, number> = {}
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

    for (const o of orders) {
      const mode = o.payment_mode || "Unknown"
      paymentModeMap[mode] = (paymentModeMap[mode] || 0) + 1

      const company = o.company_name || "Unknown"
      if (!customerMap[company]) customerMap[company] = { name: company, orders: 0, value: 0 }
      customerMap[company].orders += 1
      customerMap[company].value += Number(o.amount_with_tax) || 0

      if (o.created_at) {
        const d = new Date(o.created_at)
        const key = `${monthNames[d.getMonth()]} ${d.getFullYear()}`
        monthBuckets[key] = (monthBuckets[key] || 0) + 1
      }
    }

    // Last 6 calendar months, oldest first, zero-filled.
    const monthlyTrend: { month: string; orders: number }[] = []
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const key = `${monthNames[d.getMonth()]} ${d.getFullYear()}`
      monthlyTrend.push({ month: monthNames[d.getMonth()], orders: monthBuckets[key] || 0 })
    }

    const paymentModeData = Object.entries(paymentModeMap).map(([name, value]) => ({ name, value }))
    const topCustomers = Object.values(customerMap)
      .sort((a, b) => b.value - a.value)
      .slice(0, 5)

    const recentOrders = [...orders]
      .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 10)
      .map((o: any) => ({
        orderNo: o.order_no,
        companyName: o.company_name,
        paymentMode: o.payment_mode,
        amount: Number(o.amount_with_tax) || 0,
        createdAt: o.created_at,
      }))

    return NextResponse.json({
      success: true,
      data: {
        totalOrders: orders.length,
        ordersThisMonth,
        totalOrderValue,
        totalInvoicedRevenue,
        totalPending: pipelineStages.reduce((sum, s) => sum + s.pending, 0),
        pipelineStages,
        paymentModeData,
        monthlyTrend,
        topCustomers,
        recentOrders,
      },
    })
  } catch (err: any) {
    console.error("GET /api/otp-supabase/dashboard exception:", err)
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
