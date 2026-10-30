import { NextResponse } from "next/server"
import { getSupabaseAdmin } from "@/lib/supabase"
import { requestAccess } from "@/lib/request-access"

const BUCKET = "otp-calibration-certificates"
const MAX_BYTES = 10 * 1024 * 1024

// Stores the generated (already compressed, see certificate-formats/common-format-pdf.jsx)
// certificate PDF and returns its public URL for the Process form to save.
export async function POST(request: Request) {
  try {
    const access = await requestAccess(request)
    if (!access.userId) return NextResponse.json({ success: false, error: "Not signed in" }, { status: 401 })

    const form = await request.formData()
    const file = form.get("file") as File | null
    if (!file) return NextResponse.json({ success: false, error: "No file provided" }, { status: 400 })
    if (file.type !== "application/pdf") return NextResponse.json({ success: false, error: "Only PDF files are accepted" }, { status: 400 })
    if (file.size > MAX_BYTES) return NextResponse.json({ success: false, error: "PDF is larger than 10 MB" }, { status: 413 })

    const supabase = getSupabaseAdmin()
    const cleanName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_")
    const path = `${new Date().getFullYear()}/${Date.now()}_${cleanName}`
    const { error } = await supabase.storage.from(BUCKET).upload(path, Buffer.from(await file.arrayBuffer()), {
      contentType: "application/pdf",
      upsert: false,
    })
    if (error) throw error

    return NextResponse.json({ success: true, url: supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl, path })
  } catch (err: any) {
    console.error("POST /api/otp-supabase/calibration/certificate-upload exception:", err)
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
