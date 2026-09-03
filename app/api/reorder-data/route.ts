import { NextResponse } from "next/server"

// Apps Script linked to the Reorder/IMS spreadsheet
// (SPREADSHEET_ID: 1O-fEA6iQvlJhSP6xcn2G-n0XxWE5LUX2kg2z6BVQLJw)
const REORDER_SCRIPT_URL = process.env.REORDER_SCRIPT_URL
const SHEET_NAME = "IMS"

// The sheet uses 2 header rows → data starts at index 2 (row 3)
const HEADER_ROWS = 2

export async function GET() {
  try {
    const url = `${REORDER_SCRIPT_URL}?sheet=${SHEET_NAME}`

    const response = await fetch(url, {
      method: "GET",
      redirect: "follow",
    })

    if (!response.ok) {
      return NextResponse.json(
        { success: false, error: `Script returned status: ${response.status}` }
      )
    }

    const raw = await response.json()

    if (!raw.success || !Array.isArray(raw.data)) {
      return NextResponse.json({ success: false, error: raw.error || "No data returned" })
    }

    // Row 1 = primary headers, Row 2 = sub-headers (used as column IDs)
    // gviz used these as column labels — we replicate them as col_A, col_B...
    const headerRow = raw.data[1] || [] // Row 2 (index 1) used as col labels
    const dataRows = raw.data.slice(HEADER_ROWS)

    // Build columns metadata (same shape as gviz output the frontend expects)
    function colLetter(n: number): string {
      let letter = ""
      n = n + 1
      while (n > 0) {
        const rem = (n - 1) % 26
        letter = String.fromCharCode(65 + rem) + letter
        n = Math.floor((n - 1) / 26)
      }
      return letter
    }

    const columns = headerRow.map((label: any, i: number) => ({
      id: colLetter(i),
      label: label ? String(label) : colLetter(i),
      index: i,
    }))

    // Map data rows to col_A, col_B, col_C... format (matches frontend expectations)
    const items = dataRows.map((row: any[]) => {
      const item: any = {}
      columns.forEach((col: any) => {
        item[`col_${col.id}`] = row[col.index] ?? ""
      })
      return item
    })

    return NextResponse.json({ success: true, items, columns })

  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch reorder data" }
    )
  }
}
