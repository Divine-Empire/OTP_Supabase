import { NextResponse } from "next/server"

// This is the Apps Script linked to the INDENT-LIFT spreadsheet
// (SPREADSHEET_ID: 1_KAokqi4ZxBGj2xA7TOdUMj6H44szaf4CQMI_OINdAo)
const INDENT_SCRIPT_URL = process.env.INDENT_SCRIPT_URL
const SHEET_NAME = "INDENT-LIFT"

// Column indices (0-based) in the INDENT-LIFT sheet
// Data starts at row 7 (skip 6 header rows → slice(6))
const COL = {
  C: 2,   // Indenter Name
  D: 3,   // Category
  E: 4,   // Item Name
  N: 13,  // Status (approve/approved)
  O: 14,  // Approved Qty
  BC: 54, // PO Raised
  BU: 72, // Remaining Qty
  BV: 73, // Pending Qty
  BW: 74, // Material In Transit
  BX: 75, // Expected date of Delivery
  J: 9,   // Payment Terms
  AK: 36, // Quotation Copy
}

export async function GET() {
  try {
    const url = `${INDENT_SCRIPT_URL}?sheet=${SHEET_NAME}`

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

    // Skip header rows (data starts at row 7 = index 6)
    const dataRows = raw.data.slice(6)

    // Map each row to named column keys
    const mapped = dataRows.map((row: any[]) => ({
      C: row[COL.C] ?? "",
      D: row[COL.D] ?? "",
      E: row[COL.E] ?? "",
      N: row[COL.N] ?? "",
      O: row[COL.O] ?? 0,
      BC: row[COL.BC] ?? 0,
      BU: row[COL.BU] ?? 0,
      BV: row[COL.BV] ?? 0,
      BW: row[COL.BW] ?? 0,
      BX: row[COL.BX] ?? "",
      J: row[COL.J] ?? "",
      AK: row[COL.AK] ?? "",
    }))

    return NextResponse.json({ success: true, data: mapped })

  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch from Apps Script" }
    )
  }
}
