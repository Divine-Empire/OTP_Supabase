import { NextResponse } from "next/server"
import { getSupabaseAdmin } from "@/lib/supabase"

// Dashboard Delay Report — see Database/70_delay_report_stage_durations.sql
// and 71_delay_report_drop_stages.sql for exactly what is counted. Orders whose last wave went through Packaging
// and Dispatch in [from, to] (IST days): the Order Acceptable timestamp, then
// for each later stage the minutes it took after the previous stage, plus the
// order's total (Packaging - order created). The summary is the sum of every
// order's total (summative delay) and that sum divided by the number of
// orders (average delay).
//
// ?from=YYYY-MM-DD&to=YYYY-MM-DD   default: the last 7 days incl. today (IST)
// ?location=<label>                same scoping rule as pending-counts/dashboard

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

function istToday(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date())
}

function addDays(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

export async function GET(request: Request) {
  try {
    const params = new URL(request.url).searchParams
    const to = params.get("to") || istToday()
    const from = params.get("from") || addDays(to, -6)
    const location = params.get("location") || null

    if (!DATE_RE.test(from) || !DATE_RE.test(to) || Number.isNaN(Date.parse(from)) || Number.isNaN(Date.parse(to))) {
      return NextResponse.json({ success: false, error: "from/to must be valid YYYY-MM-DD dates" }, { status: 400 })
    }
    if (from > to) {
      return NextResponse.json({ success: false, error: "'from' must not be after 'to'" }, { status: 400 })
    }

    const supabase = getSupabaseAdmin()
    const { data, error } = await supabase.rpc("otp_delay_report", { p_from: from, p_to: to, p_location: location })
    if (error) throw error

    const rows = (data || []).map((r: any) => ({
      orderId: r.order_id,
      orderNo: r.order_no || "",
      companyName: r.company_name || "",
      processedAt: r.processed_at,
      orderAcceptableAt: r.order_acceptable_at,
      packingList: r.packing_list_duration,
      preInvoice: r.pre_invoice_duration,
      makeInvoice: r.make_invoice_duration,
      packagingDispatch: r.packaging_dispatch_duration,
      totalDelay: Number(r.total_duration) || 0,
    }))

    const totalDelay = rows.reduce((sum: number, r: { totalDelay: number }) => sum + r.totalDelay, 0)
    const orderCount = rows.length

    return NextResponse.json({
      success: true,
      data: {
        from,
        to,
        rows,
        summary: {
          orders: orderCount,
          totalDelay,
          averageDelay: orderCount > 0 ? Math.round(totalDelay / orderCount) : 0,
        },
      },
    })
  } catch (err: any) {
    console.error("GET /api/otp-supabase/dashboard/delay-report exception:", err)
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
