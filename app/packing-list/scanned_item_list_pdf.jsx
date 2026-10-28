"use client"

import { Button } from "@/components/ui/button"
import { FileDown } from "lucide-react"

// Same header as Lead-To-Order's quotation PDF (Divine logo, company title, ManiQuip logo),
// then "Scanned Item List" on the left with Company Name / Quotation No stacked on the
// right, then a Serial / Item Code / Item Name / Qty table. Serial No. is the row number.
// jspdf is loaded on click so it stays out of the page's initial bundle.
const BLUE = [34, 116, 184] // #2274B8, the series quotation PDF's title colour
const BLUE_TINT = [240, 246, 252] // #F0F6FC, its table-header tint
const LOGO_LEFT = { src: "/pdf/divine-logo.jpeg", format: "JPEG", h: 17 }
const LOGO_RIGHT = { src: "/pdf/maniquip-logo.png", format: "PNG", h: 17 }

async function loadImage(src) {
  try {
    const blob = await (await fetch(src)).blob()
    const dataUrl = await new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result)
      reader.onerror = reject
      reader.readAsDataURL(blob)
    })
    const { width, height } = await new Promise((resolve, reject) => {
      const img = new Image()
      img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight })
      img.onerror = reject
      img.src = dataUrl
    })
    return { dataUrl, ratio: width / height }
  } catch {
    return null // a missing logo must not block the export
  }
}

// createdBy: full name of whoever created the wave ("NA" when unknown).
// items: [{ itemCode, itemName, qty }] — only qty > 0 rows are printed.
export async function generateScannedItemListPdf({ companyName, quotationNo, createdBy, items }) {
  const [{ jsPDF }, { default: autoTable }, left, right] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
    loadImage(LOGO_LEFT.src),
    loadImage(LOGO_RIGHT.src),
  ])

  const rows = (items || []).filter((it) => Number(it.qty) > 0)
  const doc = new jsPDF({ unit: "mm", format: "a4" })
  const pageWidth = doc.internal.pageSize.getWidth()
  const margin = 14
  const top = 12

  if (left) doc.addImage(left.dataUrl, LOGO_LEFT.format, margin, top, LOGO_LEFT.h * left.ratio, LOGO_LEFT.h)
  if (right) {
    const w = LOGO_RIGHT.h * right.ratio
    doc.addImage(right.dataUrl, LOGO_RIGHT.format, pageWidth - margin - w, top, w, LOGO_RIGHT.h)
  }

  doc.setFont("helvetica", "bold")
  doc.setTextColor(...BLUE)
  doc.setFontSize(17)
  doc.text("DIVINE EMPIRE INDIA", pageWidth / 2, top + 8, { align: "center" })
  doc.setFontSize(13)
  doc.text("( PVT. LTD. )", pageWidth / 2, top + 15, { align: "center" })

  const ruleY = top + LOGO_LEFT.h + 4
  doc.setDrawColor(0)
  doc.setLineWidth(0.4)
  doc.line(margin, ruleY, pageWidth - margin, ruleY)

  const titleY = ruleY + 11
  doc.setTextColor(0)
  doc.setFontSize(17)
  doc.text("Scanned Item List", margin, titleY)

  // Right-hand stack; a long company name wraps within the space left of the title.
  doc.setFontSize(10)
  const rightX = pageWidth - margin
  const maxWidth = pageWidth - 2 * margin - 70
  const lines = [
    ...doc.splitTextToSize(`Company Name: ${String(companyName || "-")}`, maxWidth),
    `Quotation No: ${String(quotationNo || "-")}`,
    // Waves processed before created_by was recorded have none: "NA".
    `Created By: ${String(createdBy || "").trim() || "NA"}`,
  ]
  const lineHeight = 5
  lines.forEach((line, i) => doc.text(line, rightX, titleY - 3 + i * lineHeight, { align: "right" }))
  const blockBottom = titleY - 3 + (lines.length - 1) * lineHeight

  autoTable(doc, {
    startY: Math.max(titleY, blockBottom) + 8,
    margin: { left: margin, right: margin },
    head: [["Serial No.", "Item Code", "Item Name", "Qty"]],
    body: rows.map((it, i) => [String(i + 1), String(it.itemCode || "-"), String(it.itemName || ""), String(it.qty)]),
    theme: "grid",
    styles: { font: "helvetica", fontSize: 9.5, textColor: 30, lineColor: [203, 213, 225], lineWidth: 0.2, cellPadding: 2.5 },
    headStyles: { fillColor: BLUE, textColor: 255, fontStyle: "bold" },
    alternateRowStyles: { fillColor: BLUE_TINT },
    columnStyles: {
      0: { cellWidth: 22, halign: "center" },
      1: { cellWidth: 34 },
      3: { cellWidth: 20, halign: "center", fontStyle: "bold" },
    },
  })

  const safe = (s) => String(s || "").replace(/[^a-z0-9]+/gi, "_").replace(/^_|_$/g, "")
  doc.save(`Scanned_Items_${safe(quotationNo) || safe(companyName) || "list"}.pdf`)
}

export function ScannedItemListPdfButton({ companyName, quotationNo, createdBy, items, disabled }) {
  return (
    <Button
      type="button"
      size="sm"
      variant="outline"
      className="gap-1.5"
      disabled={disabled}
      onClick={() => generateScannedItemListPdf({ companyName, quotationNo, createdBy, items })}
    >
      <FileDown className="h-3.5 w-3.5" />
      PDF
    </Button>
  )
}
