import { NextResponse } from "next/server"
import { getSupabaseAdmin } from "@/lib/supabase"
import { fetchAllRows } from "@/lib/fetch-all"
import { parseHistoryParams, applyHistoryFilters, pageJson, crmFacet } from "@/lib/history-filters"
import { requestAccess, scopeRowsByAccess } from "@/lib/request-access"

// Stage — Certi. Hardcopy. No table of its own: it reads otp_calibration_certificate.
//
// Pending: hardcopy_planned IS NOT NULL AND hardcopy_created_at IS NULL
//          (hardcopy_planned is set when Calibration Certificate is processed for a
//          wave whose Pre-Invoice said Cert. Hardcopy Req. = Yes).
// History: both are set (hardcopy_pdf_url holds the generated PDF).
// See Database/84_certificate_hardcopy.sql.
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get("status")
    const supabase = getSupabaseAdmin()

    if (status === "history" && searchParams.has("page")) {
      const p = parseHistoryParams(searchParams, [], await requestAccess(request))
      const query = applyHistoryFilters(supabase.from("otp_v_certi_hardcopy_history").select("*", { count: "exact" }), p)
      const { data, error, count } = await query.order("hardcopy_created_at", { ascending: false }).order("id").range(p.offset, p.to)
      if (error) throw error
      return pageJson(data, count, p, { facets: (await crmFacet(supabase, "otp_v_certi_hardcopy_history", p)).facets })
    }

    if (status === "history") {
      return NextResponse.json({ success: false, error: "History requires ?page=" }, { status: 400 })
    }

    const data = await fetchAllRows((from, to) =>
      supabase.from("otp_v_certi_hardcopy_pending").select("*").order("created_at", { ascending: false }).order("id").range(from, to)
    )
    return NextResponse.json({ success: true, data: scopeRowsByAccess(data, await requestAccess(request)) })
  } catch (err: any) {
    console.error("GET /api/otp-supabase/certi-hardcopy exception:", err)
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}

// Marks the hardcopy as generated: stores the PDF url and stamps hardcopy_created_at,
// which is what moves the row from Pending to History.
export async function POST(request: Request) {
  try {
    const access = await requestAccess(request)
    if (!access.userId) return NextResponse.json({ success: false, error: "Not signed in" }, { status: 401 })

    const { calibrationId, hardcopyPdfUrl } = (await request.json()) as { calibrationId?: string; hardcopyPdfUrl?: string }
    if (!calibrationId || !hardcopyPdfUrl) {
      return NextResponse.json({ success: false, error: "Missing calibrationId or hardcopyPdfUrl" }, { status: 400 })
    }

    const supabase = getSupabaseAdmin()
    const { data: row, error: rowError } = await supabase
      .from("otp_v_certi_hardcopy_pending")
      .select("id, order, crm_name, order_location")
      .eq("id", calibrationId)
      .maybeSingle()
    if (rowError) throw rowError
    if (!row || scopeRowsByAccess([row], access).length === 0) {
      return NextResponse.json({ success: false, error: "Hardcopy record not found or already generated" }, { status: 404 })
    }

    const { data, error } = await supabase
      .from("otp_calibration_certificate")
      .update({ hardcopy_pdf_url: hardcopyPdfUrl, hardcopy_created_at: new Date().toISOString() })
      .eq("id", calibrationId)
      .not("hardcopy_planned", "is", null)
      .is("hardcopy_created_at", null)
      .select("id, hardcopy_planned, hardcopy_created_at, hardcopy_pdf_url")
      .maybeSingle()
    if (error) throw error
    if (!data) return NextResponse.json({ success: false, error: "Hardcopy record not found or already generated" }, { status: 404 })

    return NextResponse.json({ success: true, data })
  } catch (err: any) {
    console.error("POST /api/otp-supabase/certi-hardcopy exception:", err)
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
