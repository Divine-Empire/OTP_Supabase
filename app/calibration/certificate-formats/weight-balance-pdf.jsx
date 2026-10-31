// "Weight Balance" (WB 5 kg.docx): the common details block, a Standard / Observed / Error /
// Uncertainty table, three certification statements, "BASED ON" and four notes.
// Anything left blank in the form is left off the certificate; fully blank table rows are dropped.
import { FONT, drawDetails, drawNotes, drawPageStart, drawSignOff, filled, fmtDate, pageBox } from "./pdf-shared.jsx"

const NOTES = [
  [{ t: "This Certificated refers to the Particular item submitted for calibration." }],
  [{ t: "This certificate shall not be reproduced expect in full unless written permission for publication of an approved abstract has been obtained from DIVINE EMPIRE INDIA PVT. LTD. RAIPUR." }],
  [{ t: "This Calibration shall not be referred to or linked with issue coming under the preview of LEGAL Metrology" }],
  [
    { t: "This is a " },
    { t: "Non-NABL", b: true },
    { t: " Certificate issued based on the performance evaluation and review of the equipment/instrument. The results are intended for functional/internal assessment purposes only and are not covered under NABL accreditation." },
  ],
]

const STATEMENTS = [
  "The instrument has been calibrated and found within acceptable limits.",
  "This is to certify that the instrument has been calibrated using standards traceable to national standards.",
  "We certify that the above-mentioned product/Instrument has been repaired and tested by us for performances / accuracy and found to be satisfactory.",
]

const ROWS = 10
const COLUMNS = ["std", "obs", "err", "unc"]
const text = (v) => String(v ?? "").trim()

// async: jspdf-autotable is loaded on demand so it stays out of the page bundle.
export async function drawWeightBalancePage(doc, values, assets) {
  const { default: autoTable } = await import("jspdf-autotable")
  const { M, RIGHT } = pageBox(doc)
  let y = drawPageStart(doc, assets)

  y = drawDetails(
    doc,
    y,
    [
      ["Customer Name", values.customerName],
      ["Address", values.address],
    ],
    [
      ["Certificate No.", values.certificateNo],
      ["Instrument Name", values.instrumentName],
      ["Calibration Date", fmtDate(values.calibrationDate)],
      ["Next Calibration Date", fmtDate(values.nextCalibrationDate)],
      ["Quantity", values.quantity],
      ["Id No.", values.idNo],
    ],
    { compact: true }
  )

  const unit = values.wbUnit === "g" || (/(?:gm|gram|g)\b/i.test(values.instrumentName || "") && !/kg/i.test(values.instrumentName || "")) ? "g" : "kg"
  const body = []
  for (let i = 1; i <= ROWS; i++) {
    const cells = COLUMNS.map((k) => text(values[`${k}${i}`]))
    if (cells.some(Boolean)) body.push(cells)
  }
  if (body.length) {
    autoTable(doc, {
      startY: y + 4,
      margin: { left: M, right: doc.internal.pageSize.getWidth() - RIGHT },
      head: [[`Standard (${unit})`, `Observed (${unit})`, `Error (${unit})`, `Uncertainty (± ${unit})`]],
      body,
      theme: "grid",
      styles: { font: FONT, fontSize: 9.5, textColor: 0, lineColor: 0, lineWidth: 0.2, cellPadding: 0.8, halign: "center" },
      headStyles: { fillColor: 255, textColor: 0, fontStyle: "normal", fontSize: 10 },
    })
    y = doc.lastAutoTable.finalY
  }

  doc.setFont(FONT, "normal")
  doc.setFontSize(10)
  STATEMENTS.forEach((line, i) => {
    y += i === 0 ? 5 : 3.5
    const lines = doc.splitTextToSize(line, RIGHT - M)
    doc.text(lines, M, y)
    y += (lines.length - 1) * 4.2
  })

  if (filled(values.basedOn)) {
    y += 7
    doc.setFontSize(10.5)
    const b = text(values.basedOn).replace(/^\s*based\s*on\s*[:\-]?\s*/i, "")
    doc.text(`BASED ON : ${b}`, M, y)
  }

  y += 9
  doc.setFont(FONT, "bold")
  doc.setFontSize(11)
  doc.text("Note :", M, y)

  y = drawNotes(doc, y + 5.5, NOTES, { fontSize: 9.5, lineHeight: 4.2, gap: 1.6 })
  drawSignOff(doc, assets)
  return y
}
