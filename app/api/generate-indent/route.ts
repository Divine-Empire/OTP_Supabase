import { NextResponse } from "next/server"
import { getSupabaseAdmin } from "@/lib/supabase"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { items, createdBy, warehouseLocation, lineItemNumber, leadTime, remarks, file, totalQty } = body

    // 0. Ensure items list has at least one valid entry or create from fallback details
    let itemsToProcess: Array<{ name: string; qty: number }> =
      items && Array.isArray(items) && items.length > 0
        ? items.filter((it: any) => it && (it.name || it.qty)).map((it: any) => ({ name: String(it.name || "Material"), qty: Number(it.qty) || 0 }))
        : []

    if (itemsToProcess.length === 0) {
      itemsToProcess = [{
        name: body.itemName || (lineItemNumber ? `Item Line ${lineItemNumber}` : "Material"),
        qty: Number(totalQty || 1),
      }]
    }

    const supabase = getSupabaseAdmin()

    // 1. Upload file to Supabase Storage (otp-attachments) if provided
    let attachmentUrl = ""
    if (file && file.base64 && file.name && file.type) {
      try {
        const base64Data = file.base64.split(",")[1] || file.base64
        const fileBuffer = Buffer.from(base64Data, "base64")

        const cleanName = file.name.replace(/[^a-zA-Z0-9.]/g, "_")
        const filePath = `indent/${Date.now()}_${cleanName}`

        const { error: uploadError } = await supabase.storage
          .from("otp-attachments")
          .upload(filePath, fileBuffer, {
            contentType: file.type,
            upsert: true,
          })

        if (!uploadError) {
          const { data: urlData } = supabase.storage
            .from("otp-attachments")
            .getPublicUrl(filePath)
          attachmentUrl = urlData?.publicUrl || ""
        } else {
          console.warn("Attachment upload notice:", uploadError.message)
        }
      } catch (uploadErr: any) {
        console.warn("Exception during attachment upload:", uploadErr.message)
      }
    }

    // 2. Generate sequential indent numbers: IND-001, IND-002...
    let startingIndex = 1
    try {
      const { count, error: countErr } = await supabase
        .from("pfms_indent-generation")
        .select("*", { count: "exact", head: true })

      if (!countErr && typeof count === "number") {
        startingIndex = count + 1
      }
    } catch (countEx) {
      console.warn("Indent count query notice:", countEx)
    }

    const indentNos = itemsToProcess.map((_, i) => `IND-${String(startingIndex + i).padStart(3, "0")}`)

    // 3. Turnaround time for indent approval (default: 24 hours)
    const actionTime = 24
    const now = new Date()
    const plannedDate = new Date(now.getTime() + actionTime * 60 * 60 * 1000)

    const formatTimestamp = (date: Date): string => {
      const YYYY = date.getFullYear()
      const MM = String(date.getMonth() + 1).padStart(2, "0")
      const DD = String(date.getDate()).padStart(2, "0")
      const HH = String(date.getHours()).padStart(2, "0")
      const mm = String(date.getMinutes()).padStart(2, "0")
      const ss = String(date.getSeconds()).padStart(2, "0")
      const SSS = String(date.getMilliseconds()).padStart(3, "0")
      return `${YYYY}-${MM}-${DD} ${HH}:${mm}:${ss}.${SSS}`
    }

    const formattedPlannedApproval = formatTimestamp(plannedDate)
    const formattedCreatedAt = formatTimestamp(now)
    const formattedUpdatedAt = formatTimestamp(now)

    // 4. Bulk insert rows into the "pfms_indent-generation" table
    const rowsToInsert = itemsToProcess.map((item: { name: string; qty: number }, idx: number) => ({
      indentNo: indentNos[idx] || "",
      createdBy: createdBy || "Admin",
      category: "",
      itemName: item.name,
      quantity: Number(item.qty) || 0,
      warehouseLocation: warehouseLocation || "",
      itemCode: "",
      leadTime: leadTime ? Number(leadTime) : null,
      uom: "",
      attachment: attachmentUrl,
      status: "pending",
      remarks: remarks || "",
      plannedIndentApproval: formattedPlannedApproval,
      createdAt: formattedCreatedAt,
      updatedAt: formattedUpdatedAt,
    }))

    const { data: insertedData, error: insertError } = await supabase
      .from("pfms_indent-generation")
      .insert(rowsToInsert)
      .select()

    if (insertError) {
      console.error("Error inserting into pfms_indent-generation:", insertError)
      return NextResponse.json(
        { success: false, error: `Database insert failed: ${insertError.message}` },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: `Successfully created ${rowsToInsert.length} indent generation record(s).`,
      generatedIds: indentNos,
      data: insertedData,
    })
  } catch (error: any) {
    console.error("Unhandled exception in generate-indent route:", error)
    return NextResponse.json(
      { success: false, error: error.message || "Internal server error" },
      { status: 500 }
    )
  }
}
