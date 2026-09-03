import { NextResponse } from "next/server"
import { getSupabaseAdmin } from "@/lib/supabase"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const orderNo = searchParams.get("orderNo")
    const search = searchParams.get("search")

    const supabase = getSupabaseAdmin()
    let query = supabase
      .from("sss_service_installation")
      .select("*")
      .order("created_at", { ascending: false })

    if (orderNo) {
      query = query.eq("order_no", orderNo)
    }

    if (search) {
      query = query.or(
        `order_no.ilike.%${search}%,company_name.ilike.%${search}%,item_name.ilike.%${search}%,si_no.ilike.%${search}%,serial.ilike.%${search}%`
      )
    }

    const { data, error } = await query

    if (error) {
      console.error("Error fetching service installation records:", error)
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, data: data || [] })
  } catch (err: any) {
    console.error("GET service-installation exception:", err)
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const {
      orderNo,
      order_no,
      companyName,
      company_name,
      contactPersonName,
      contact_person_name,
      contactPersonNo,
      contact_person_no,
      dispatchTimestamp,
      items,
    } = body

    const targetOrderNo = orderNo || order_no || ""
    const targetCompanyName = companyName || company_name || ""
    const targetContactPerson = contactPersonName || contact_person_name || ""
    const targetContactNo = contactPersonNo || contact_person_no || ""
    const plannedDate = dispatchTimestamp || new Date().toISOString()

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { success: false, error: "Missing or invalid items array for installation logging" },
        { status: 400 }
      )
    }

    const supabase = getSupabaseAdmin()

    // Query current count to generate next sequential SI-001, SI-002... ID
    let startingIndex = 1
    try {
      const { count, error: countErr } = await supabase
        .from("sss_service_installation")
        .select("*", { count: "exact", head: true })

      if (!countErr && typeof count === "number") {
        startingIndex = count + 1
      }
    } catch (countEx) {
      console.warn("Count query warning in service-installation, defaulting to 1:", countEx)
    }

    const now = new Date().toISOString()
    const rowsToInsert = items.map((it: any, idx: number) => {
      const siIndex = startingIndex + idx
      const siNo = `SI-${String(siIndex).padStart(3, "0")}`

      return {
        order_no: targetOrderNo,
        is_installation_required: "Yes",
        company_name: targetCompanyName || null,
        contact_person_name: targetContactPerson || null,
        contact_person_no: targetContactNo || null,
        item_name: it.itemName || it.item_name || it.name || null,
        qty: Number(it.qty || it.quantity || 0),
        serial: it.serial || it.serialNo || it.serial_no || null,
        si_no: siNo,
        planned: plannedDate,
        created_at: now,
        updated_at: now,
      }
    })

    const { data, error } = await supabase
      .from("sss_service_installation")
      .insert(rowsToInsert)
      .select()

    if (error) {
      console.error("Error inserting into sss_service_installation:", error)
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: `Successfully logged ${rowsToInsert.length} installation item(s) in sss_service_installation`,
      data,
    })
  } catch (err: any) {
    console.error("POST service-installation exception:", err)
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
