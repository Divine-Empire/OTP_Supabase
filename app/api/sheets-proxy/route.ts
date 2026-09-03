import { NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const sheetId = searchParams.get("sheetId")
  const sheetName = searchParams.get("sheetName")

  if (!sheetId || !sheetName) {
    return NextResponse.json(
      { error: "Missing sheetId or sheetName parameter" },
      { status: 400 }
    )
  }

  const sheetsUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(sheetName)}`

  try {
    const response = await fetch(sheetsUrl, {
      headers: {
        // Forward as a regular browser-like request
        "User-Agent": "Mozilla/5.0",
      },
      // No-store so we always get fresh data
      cache: "no-store",
    })

    if (!response.ok) {
      return NextResponse.json(
        { error: `Google Sheets responded with status ${response.status}` },
        { status: response.status }
      )
    }

    const text = await response.text()

    return new NextResponse(text, {
      status: 200,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-store",
      },
    })
  } catch (err: any) {
    console.error("Sheets proxy error:", err)
    return NextResponse.json(
      { error: err.message || "Failed to fetch from Google Sheets" },
      { status: 500 }
    )
  }
}
