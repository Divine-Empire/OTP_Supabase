import { NextResponse } from "next/server"
import { getSupabaseAdmin } from "@/lib/supabase"

export async function POST(request: Request) {
  try {
    const supabase = getSupabaseAdmin()
    const contentType = request.headers.get("content-type") || ""

    let fileBuffer: Buffer
    let fileName: string
    let mimeType: string
    let folder = "attachments"

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData()
      const file = formData.get("file") as File | null
      const requestedFolder = formData.get("folder") as string | null

      if (!file) {
        return NextResponse.json({ success: false, error: "No file provided" }, { status: 400 })
      }

      const bytes = await file.arrayBuffer()
      fileBuffer = Buffer.from(bytes)
      fileName = file.name
      mimeType = file.type || "application/octet-stream"
      if (requestedFolder) folder = requestedFolder
    } else {
      const body = await request.json()
      const { file, base64, name, type, folder: requestedFolder } = body

      if (file && file.base64) {
        const rawBase64 = file.base64.split(",")[1] || file.base64
        fileBuffer = Buffer.from(rawBase64, "base64")
        fileName = file.name || "upload"
        mimeType = file.type || "application/octet-stream"
      } else if (base64) {
        const rawBase64 = base64.split(",")[1] || base64
        fileBuffer = Buffer.from(rawBase64, "base64")
        fileName = name || "upload"
        mimeType = type || "application/octet-stream"
      } else {
        return NextResponse.json({ success: false, error: "No file or base64 provided" }, { status: 400 })
      }

      if (requestedFolder) folder = requestedFolder
    }

    const cleanName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_")
    const filePath = `${folder}/${Date.now()}_${cleanName}`

    const { error: uploadErr } = await supabase.storage
      .from("otp-attachments")
      .upload(filePath, fileBuffer, {
        contentType: mimeType,
        upsert: true,
      })

    if (uploadErr) {
      console.error("Storage upload error:", uploadErr)
      return NextResponse.json({ success: false, error: uploadErr.message }, { status: 500 })
    }

    const { data: urlData } = supabase.storage
      .from("otp-attachments")
      .getPublicUrl(filePath)

    return NextResponse.json({
      success: true,
      url: urlData.publicUrl,
      path: filePath,
    })
  } catch (err: any) {
    console.error("Attachments upload exception:", err)
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
