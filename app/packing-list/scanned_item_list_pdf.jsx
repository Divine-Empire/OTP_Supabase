"use client"

import { Button } from "@/components/ui/button"
import { FileDown } from "lucide-react"

// Black & white scanned-item list: header (Company Name, Quotation No.) and a
// Serial No. / Item Name / Qty table. Serial No. is just the row number.
// jspdf is loaded on click so it stays out of the page's initial bundle.
export async function generateScannedItemListPdf({ companyName, quotationNo, items }) {
  const [{ jsPDF }, { default: autoTable }] = await Promise.all([import("jspdf"), import("jspdf-autotable")])

  const rows = (items || []).filter((it) => Number(it.qty) > 0)
  const doc = new jsPDF({ unit: "mm", format: "a4" })
  const pageWidth = doc.internal.pageSize.getWidth()

  doc.setTextColor(0)
  doc.setFont("helvetica", "bold")
  doc.setFontSize(14)
  doc.text("Scanned Item List", pageWidth / 2, 15, { align: "center" })

  doc.setFontSize(11)
  doc.text("Company Name:", 14, 26)
  doc.text("Quotation No:", 14, 33)
  doc.setFont("helvetica", "normal")
  doc.text(String(companyName || "-"), 46, 26)
  doc.text(String(quotationNo || "-"), 46, 33)

  autoTable(doc, {
    startY: 39,
    head: [["Serial No.", "Item Name", "Qty"]],
    body: rows.map((it, i) => [String(i + 1), String(it.itemName || ""), String(it.qty)]),
    theme: "grid",
    styles: { font: "helvetica", fontSize: 10, textColor: 0, lineColor: 0, lineWidth: 0.2, cellPadding: 2.5 },
    headStyles: { fillColor: 255, textColor: 0, fontStyle: "bold", lineColor: 0, lineWidth: 0.2 },
    columnStyles: { 0: { cellWidth: 25, halign: "center" }, 2: { cellWidth: 25, halign: "center" } },
  })

  const safe = (s) => String(s || "").replace(/[^a-z0-9]+/gi, "_").replace(/^_|_$/g, "")
  doc.save(`Scanned_Items_${safe(quotationNo) || safe(companyName) || "list"}.pdf`)
}

// items: [{ itemName, qty }] — only qty > 0 rows are printed.
export function ScannedItemListPdfButton({ companyName, quotationNo, items, disabled }) {
  return (
    <Button
      type="button"
      size="sm"
      variant="outline"
      className="gap-1.5"
      disabled={disabled}
      onClick={() => generateScannedItemListPdf({ companyName, quotationNo, items })}
    >
      <FileDown className="h-3.5 w-3.5" />
      PDF
    </Button>
  )
}
