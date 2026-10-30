import { NextResponse } from "next/server"
import { getSupabaseAdmin } from "@/lib/supabase"
import { requestAccess, scopeRowsByAccess } from "@/lib/request-access"

// Everything the certificate dialog needs for one Pending calibration row, in one round trip:
// the wave's packed items (otp_make_invoice.items already carry item_code / item_name / qty),
// company, shipping address, invoice date, each item's certificate format from lto_items,
// and the number the next reservation will start from. Read-only: nothing is saved.
export async function GET(request: Request) {
  try {
    const makeInvoiceId = new URL(request.url).searchParams.get("makeInvoiceId")
    if (!makeInvoiceId) return NextResponse.json({ success: false, error: "Missing makeInvoiceId" }, { status: 400 })

    const access = await requestAccess(request)
    if (!access.userId) return NextResponse.json({ success: false, error: "Not signed in" }, { status: 401 })

    const supabase = getSupabaseAdmin()
    const { data: row, error } = await supabase.from("otp_v_calibration_pending").select("id, items, invoice_date, order").eq("id", makeInvoiceId).maybeSingle()
    if (error) throw error
    if (!row || scopeRowsByAccess([row], access).length === 0) {
      return NextResponse.json({ success: false, error: "Calibration record not found" }, { status: 404 })
    }

    const packed: any[] = (row.items || []).filter((it: any) => Number(it?.qty) > 0)
    const codes = [...new Set(packed.map((it) => it.item_code).filter(Boolean))] as string[]
    const namesWithoutCode = [...new Set(packed.filter((it) => !it.item_code && it.item_name).map((it) => it.item_name))] as string[]

    // At most two indexed lookups for the whole wave, however many items it has.
    const [byCode, byName, peek] = await Promise.all([
      codes.length
        ? supabase.from("lto_items").select("item_code, calibration_certificate_format, otp_is_value").in("item_code", codes)
        : Promise.resolve({ data: [], error: null }),
      namesWithoutCode.length
        ? supabase.from("lto_items").select("item_name, item_code, calibration_certificate_format, otp_is_value").in("item_name", namesWithoutCode)
        : Promise.resolve({ data: [], error: null }),
      supabase.rpc("otp_peek_certificate_number"),
    ])
    if (byCode.error) throw byCode.error
    if (byName.error) throw byName.error
    if (peek.error) throw peek.error

    // item_code is not unique in lto_items; take the first row that has a format.
    const metaByCode = new Map<string, { format: string | null; isValue: string | null }>()
    for (const m of (byCode.data || []) as any[]) {
      if (m.calibration_certificate_format && !metaByCode.has(m.item_code)) metaByCode.set(m.item_code, { format: m.calibration_certificate_format, isValue: m.otp_is_value || null })
    }
    const lookupByName = new Map<string, { code: string | null; format: string | null; isValue: string | null }>()
    for (const m of (byName.data || []) as any[]) lookupByName.set(String(m.item_name).trim().toLowerCase(), { code: m.item_code || null, format: m.calibration_certificate_format || null, isValue: m.otp_is_value || null })

    const items = packed.map((it) => {
      const byNameHit = it.item_code ? null : lookupByName.get(String(it.item_name || "").trim().toLowerCase())
      const itemCode = it.item_code || byNameHit?.code || null
      const meta = it.item_code ? metaByCode.get(it.item_code) : byNameHit
      return {
        itemName: it.item_name || "",
        itemCode,
        qty: Number(it.qty),
        format: meta?.format || null,
        isValue: meta?.isValue || null,
      }
    })

    const order = (row as any).order || {}
    return NextResponse.json({
      success: true,
      data: {
        companyName: order.company_name || "",
        shippingAddress: order.shipping_address || "",
        invoiceDate: row.invoice_date || "",
        items,
        nextCertificateNumber: peek.data as string,
      },
    })
  } catch (err: any) {
    console.error("GET /api/otp-supabase/calibration/certificate-prefill exception:", err)
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
