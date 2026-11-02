import { NextResponse } from "next/server"
import { getSupabaseAdmin } from "@/lib/supabase"
import { requestAccess, scopeRowsByAccess } from "@/lib/request-access"

// The certificates exactly as Calibration Certificate printed them, for one Pending
// hardcopy row. Kept out of the list views on purpose (it is the only large column);
// fetched here when the Generate Certificate dialog opens. Read-only.
export async function GET(request: Request) {
  try {
    const calibrationId = new URL(request.url).searchParams.get("calibrationId")
    if (!calibrationId) return NextResponse.json({ success: false, error: "Missing calibrationId" }, { status: 400 })

    const access = await requestAccess(request)
    if (!access.userId) return NextResponse.json({ success: false, error: "Not signed in" }, { status: 401 })

    const supabase = getSupabaseAdmin()
    // The pending view enforces "hardcopy still to do" and carries the CRM/location access fields.
    const { data: row, error } = await supabase
      .from("otp_v_certi_hardcopy_pending")
      .select("id, order, crm_name, order_location, makeInvoice")
      .eq("id", calibrationId)
      .maybeSingle()
    if (error) throw error
    if (!row || scopeRowsByAccess([row], access).length === 0) {
      return NextResponse.json({ success: false, error: "Hardcopy record not found or already generated" }, { status: 404 })
    }

    const { data: cc, error: ccError } = await supabase
      .from("otp_calibration_certificate")
      .select("certificate_snapshot")
      .eq("id", calibrationId)
      .maybeSingle()
    if (ccError) throw ccError

    const snapshot = cc?.certificate_snapshot
    if (!snapshot || !Array.isArray(snapshot.certs) || snapshot.certs.length === 0) {
      return NextResponse.json({ success: false, error: "No saved certificate data for this order" }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      data: { snapshot, invoiceNumber: (row as any).makeInvoice?.invoice_number || "", orderNo: (row as any).order?.order_no || "" },
    })
  } catch (err: any) {
    console.error("GET /api/otp-supabase/certi-hardcopy/snapshot exception:", err)
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
