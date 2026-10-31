// Compression testing machine certificates (ctm_1000 / ctm_1500 / ctm_2000). One layout; the
// formats differ only in the range and readings they start with (see formats.ts).
// Addressee on the left, item name / certificate no. / SRN / dates on the right, a six-column readings table, the proving
// ring statement, "Based On", the next due date and the notes. Anything left blank in the form
// is left off the certificate, and fully blank table rows are dropped.
import { FONT, drawNotes, drawPageStart, drawSignOff, filled, fmtDate, pageBox } from "./pdf-shared.jsx"

const NOTES = [
  [{ t: "M/s Divine Empire India Pvt. Ltd. is not responsible for any in calibration report I the gauge is tempered." }],
  [{ t: "The reading given above refers to the gauge calibrated." }],
  [{ t: "The reading obtained is on the day of calibration." }],
  [{ t: "This report is not valid if the machine is shifted from one place to other or site." }],
  [{ t: "The obtained correct result positive (+) error to be subtracted, negative (-) error to be added to the indicated load reading or gauge." }],
  [{ t: "This report cannot used as an evidence in the court of law and cannot be used in part of full in any media without prior permission" }],
  [
    { t: "This is a " },
    { t: "Non-NABL", b: true },
    { t: " Certificate issued based on the performance evaluation and review of the equipment/instrument. The results are intended for functional/internal assessment purposes only and are not covered under NABL accreditation." },
  ],
]

const ROWS = 10
const COLUMNS = ["dial", "load", "indicated", "error", "percent"]
const text = (v) => String(v ?? "").trim()

// async: jspdf-autotable is loaded on demand so it stays out of the page bundle.
export async function drawCtmPage(doc, values, assets) {
  const { default: autoTable } = await import("jspdf-autotable")
  const { M, RIGHT } = pageBox(doc)
  const titleY = drawPageStart(doc, assets)
  const top = titleY + 12

  // Addressee (left).
  doc.setFont(FONT, "normal")
  doc.setFontSize(11)
  let leftY = top
  const party = [values.customerName, values.address].filter(filled)
  if (party.length) {
    doc.text("To,", M, leftY)
    leftY += 9
    party.forEach((t) => {
      const lines = doc.splitTextToSize(text(t), 66)
      doc.text(lines, M + 8, leftY)
      leftY += lines.length * 4.8 + 4
    })
  }

  // Machine details (right).
  const rightX = 108
  const details = [
    filled(values.instrumentName) ? text(values.instrumentName) : null, // the full item name
    filled(values.certificateNo) ? `Certificate No: ${text(values.certificateNo)}` : null,
    filled(values.serialNo) ? `SRN : ${text(values.serialNo)}` : null,
    filled(values.calibrationDate) ? `Date of Calibration: ${fmtDate(values.calibrationDate)}` : null,
    filled(values.nextCalibrationDate) ? `Next Calibration Due on: ${fmtDate(values.nextCalibrationDate)}` : null,
  ].filter(Boolean)
  doc.setFontSize(10.5)
  let rightY = top
  details.forEach((line) => {
    const lines = doc.splitTextToSize(line, RIGHT - rightX)
    doc.text(lines, rightX, rightY)
    rightY += lines.length * 4.8
  })

  let y = Math.max(leftY, rightY) + 4

  // Readings.
  const body = []
  for (let i = 1; i <= ROWS; i++) {
    const cells = COLUMNS.map((k) => text(values[`${k}${i}`]))
    if (cells.some(Boolean)) body.push([String(body.length + 1), ...cells])
  }
  if (body.length) {
    autoTable(doc, {
      startY: y,
      margin: { left: M, right: doc.internal.pageSize.getWidth() - RIGHT },
      head: [["Sl. No.", "Standard Dial Gauge Division", "Actual Load Applied in KN", "Indicated Load in KN", "Error Load", "Percentage Error"]],
      body,
      theme: "grid",
      styles: { font: FONT, fontSize: 9, textColor: 0, lineColor: 0, lineWidth: 0.2, cellPadding: 0.9, halign: "center", valign: "middle" },
      headStyles: { fillColor: 255, textColor: 0, fontStyle: "normal" },
      columnStyles: { 0: { cellWidth: 14 } },
    })
    y = doc.lastAutoTable.finalY
  }

  // Proving ring statement, with the ring number in bold.
  if (filled(values.provingRingNo)) {
    y += 6
    doc.setFontSize(10)
    const lead = "This Machine is calibrated by Certified Proving Ring No. "
    const ring = text(values.provingRingNo)
    const tail = " by CSIR National Physical Laboratory."
    doc.setFont(FONT, "normal")
    const leadW = doc.getTextWidth(lead)
    doc.setFont(FONT, "bold")
    const ringW = doc.getTextWidth(ring)
    doc.setFont(FONT, "normal")
    doc.text(lead, M, y)
    doc.setFont(FONT, "bold")
    doc.text(ring, M + leadW, y)
    doc.setFont(FONT, "normal")
    doc.text(tail, M + leadW + ringW, y)
  }

  if (filled(values.basedOn)) {
    y += 6
    doc.setFont(FONT, "bold")
    doc.setFontSize(10.5)
    doc.text(`Based On ${text(values.basedOn)}`, M + 1, y)
  }

  if (filled(values.nextCalibrationDate)) {
    y += 7
    doc.setFont(FONT, "normal")
    doc.setFontSize(11.5)
    const lead = "Next Calibration Due on: "
    doc.text(lead, M, y)
    doc.setFont(FONT, "bold")
    doc.text(fmtDate(values.nextCalibrationDate), M + doc.getTextWidth(lead), y)
  }

  y += 9
  doc.setFont(FONT, "bold")
  doc.setFontSize(11)
  doc.text("Note:", M, y)

  y = drawNotes(doc, y + 5.5, NOTES, { fontSize: 9, lineHeight: 3.9, gap: 1.1 })
  drawSignOff(doc, assets)
  // The docx carries "Checked" bottom-left, opposite the seal and signature.
  doc.setFont(FONT, "bolditalic")
  doc.setFontSize(12)
  doc.text("Checked", M, 263)
  return y
}
