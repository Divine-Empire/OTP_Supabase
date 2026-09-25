import { NextResponse } from "next/server"
import { getSupabaseAdmin } from "@/lib/supabase"

// IMS INN endpoint — called cross-project over HTTP by Purchase-FMS-Supabase's
// Tally Entry submit (see Purchase-FMS-Supabase/app/api/tally-entry/route.ts).
// Purchase-FMS-Supabase (zpkikvgmmbtekbcuqahf) and OTP_Supabase/Lead-To-Order
// (nfwtbrmqvsejwwvraanf) are SEPARATE Supabase projects — the IMS schema
// (Database/49_ims_core_schema.sql) lives only in this one, so a direct
// Postgres RPC from the other project isn't possible; this HTTP endpoint is
// the sync point instead, same pattern as order-ingest's webhook.
export async function POST(request: Request) {
  try {
    const syncSecret = process.env.IMS_SYNC_SECRET
    if (syncSecret) {
      const headerSecret = request.headers.get("x-ims-secret")
      if (headerSecret !== syncSecret) {
        return NextResponse.json({ success: false, error: "Unauthorized: Invalid IMS sync secret" }, { status: 401 })
      }
    }

    const body = await request.json()
    const {
      itemName,
      itemCode,
      locationCode,
      locationLabel,
      invoiceDate,
      qty,
      sourceType,
      sourceRef,
      createdBy,
    } = body as {
      itemName: string
      itemCode?: string
      locationCode?: string
      locationLabel?: string
      invoiceDate?: string
      qty: number
      sourceType: string
      sourceRef?: string
      createdBy?: string
    }

    if (!itemName || !qty || qty <= 0) {
      return NextResponse.json({ success: false, error: "Missing itemName or qty" }, { status: 400 })
    }
    if (!sourceType) {
      return NextResponse.json({ success: false, error: "Missing sourceType" }, { status: 400 })
    }

    const supabase = getSupabaseAdmin()

    let resolvedLocationCode = locationCode || null
    if (!resolvedLocationCode && locationLabel) {
      // Lenient match — strip periods/extra whitespace, since the same
      // warehouse name is spelled slightly differently across forms (e.g.
      // "C.G Warehouse" vs "C.G. Warehouse").
      const { data: locations } = await supabase.from("ims_locations").select("code, label")
      const normalize = (s: string) => s.replace(/[.\s]+/g, "").toLowerCase()
      const target = normalize(locationLabel)
      resolvedLocationCode = (locations || []).find((l: any) => normalize(l.label) === target)?.code || null
    }

    if (!resolvedLocationCode) {
      return NextResponse.json(
        { success: false, error: `Could not resolve IMS location for "${locationLabel || locationCode}"` },
        { status: 400 }
      )
    }

    const { data: batchId, error } = await supabase.rpc("ims_receive_stock", {
      p_item_name: itemName,
      p_item_code: itemCode || null,
      p_location_code: resolvedLocationCode,
      p_invoice_date: invoiceDate || null,
      p_qty: qty,
      p_source_type: sourceType,
      p_source_ref: sourceRef || null,
      p_created_by: createdBy || null,
    })

    if (error) throw error

    return NextResponse.json({ success: true, batchId })
  } catch (err: any) {
    console.error("POST /api/otp-supabase/ims/receive exception:", err)
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
