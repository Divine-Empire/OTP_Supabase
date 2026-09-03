import { NextResponse } from "next/server"
import { getSupabaseAdmin } from "@/lib/supabase"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const search = searchParams.get("search")
    const liftNo = searchParams.get("liftNo")

    const supabase = getSupabaseAdmin()

    let query = supabase
      .from("pfms_material-testing")
      .select("*")
      .order("createdAt", { ascending: false })

    if (liftNo) {
      query = query.eq("liftNo", liftNo)
    }

    if (search) {
      query = query.or(
        `liftNo.ilike.%${search}%,partName.ilike.%${search}%,qcBy.ilike.%${search}%,remarks.ilike.%${search}%`
      )
    }

    const { data, error } = await query

    if (error) {
      console.error("Error querying pfms_material-testing:", error)
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }

    // Process and flatten serial numbers for frontend display
    const flatRows: Array<{
      indentNo: string
      liftNo: string
      machineName: string
      serialNo: string
      qrCode: string
      qcBy?: string
      qcDate?: string
      workingCondition?: string
    }> = []

    if (Array.isArray(data)) {
      data.forEach((row: any) => {
        const cond = String(row.workingCondition || "").toLowerCase().replace(/[\s_]+/g, "")
        const isPassed = !row.workingCondition || cond.includes("pass") || cond === ""

        if (isPassed) {
          const serialsList: string[] = Array.isArray(row.serialNumbers)
            ? row.serialNumbers.map((s: any) => String(s).trim()).filter(Boolean)
            : typeof row.serialNumbers === "string" && row.serialNumbers.trim() !== ""
            ? row.serialNumbers.split(",").map((s: string) => s.trim()).filter(Boolean)
            : []

          if (serialsList.length === 0) {
            flatRows.push({
              indentNo: row.id || row.liftNo || "-",
              liftNo: row.liftNo || "-",
              machineName: row.partName || "-",
              serialNo: "-",
              qrCode: "-",
              qcBy: row.qcBy || "",
              qcDate: row.qcDate || "",
              workingCondition: row.workingCondition || "",
            })
          } else {
            serialsList.forEach((sn: string) => {
              flatRows.push({
                indentNo: row.id || row.liftNo || "-",
                liftNo: row.liftNo || "-",
                machineName: row.partName || "-",
                serialNo: sn,
                qrCode: sn,
                qcBy: row.qcBy || "",
                qcDate: row.qcDate || "",
                workingCondition: row.workingCondition || "",
              })
            })
          }
        }
      })
    }

    return NextResponse.json({ success: true, data: flatRows })
  } catch (error: any) {
    console.error("Error in material-tested route:", error)
    return NextResponse.json({ success: false, error: error.message || "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const supabase = getSupabaseAdmin()

    const newRecord = {
      id: body.id || `MT-${Date.now()}`,
      timestamp: new Date().toISOString(),
      liftNo: body.liftNo || "",
      qcBy: body.qcBy || null,
      qcDate: body.qcDate || new Date().toISOString(),
      workingCondition: body.workingCondition || "Passed",
      remarks: body.remarks || null,
      pendingQty: body.pendingQty ? Number(body.pendingQty) : null,
      approvedQty: body.approvedQty ? Number(body.approvedQty) : null,
      checklist: Array.isArray(body.checklist) ? body.checklist : null,
      serialNumbers: Array.isArray(body.serialNumbers) ? body.serialNumbers : [],
      images: Array.isArray(body.images) ? body.images : [],
      rejectType: body.rejectType || null,
      partName: body.partName || null,
      rejectedQty: body.rejectedQty ? Number(body.rejectedQty) : null,
      plannedPurchaseReturns: body.plannedPurchaseReturns || null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      delay: body.delay ? Number(body.delay) : null,
    }

    const { data, error } = await supabase
      .from("pfms_material-testing")
      .insert([newRecord])
      .select()
      .single()

    if (error) {
      console.error("Error inserting into pfms_material-testing:", error)
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, data })
  } catch (error: any) {
    console.error("POST material-testing exception:", error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
