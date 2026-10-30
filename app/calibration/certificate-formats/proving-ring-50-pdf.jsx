// "Proving Ring 50 kN" (format_proving_ring_50.docx): details, a load / indicated-reading table,
// the ring factor, result and notes. Rows of the table with no value are left off and the
// Sl. No. column renumbers.
import { FONT, drawDetails, drawNotes, drawPageStart, drawSignOff, filled, fmtDate, pageBox } from "./pdf-shared.jsx"

const NOTES = [
  [{ t: "M/s Divine Empire India pvt.ltd..is not responsible for any in calibration report I the gauge is tempered." }],
  [{ t: "The reading given above refers to the gauge calibrated." }],
  [{ t: "The reading obtained is on the day of calibration." }],
  [{ t: "This report is not valid if the machine is shifted from one place to other or site." }],
  [{ t: "The obtained correct result positive (+) error to be subtracted, negative (-) error to be added to the indicated load reading or gauge." }],
  [{ t: "This report cannot used as an evidence in the court of law and cannot be used in part of full in any media without prior permission." }],
  [
    { t: "This is a " },
    { t: "Non-NABL", b: true },
    { t: " Certificate issued based on the performance evaluation and review of the equipment/instrument. The results are intended for functional/internal assessment purposes only and are not covered under NABL accreditation." },
  ],
]

const ROWS = 10

// async: jspdf-autotable is loaded on demand so it stays out of the page bundle.
export async function drawProvingRing50Page(doc, values, assets) {
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
      ["Serial No.", values.serialNo],
      ["Quantity", values.quantity],
    ],
    { compact: true }
  )

  const body = []
  for (let i = 1; i <= ROWS; i++) {
    const load = String(values[`load${i}`] ?? "").trim()
    const reading = String(values[`reading${i}`] ?? "").trim()
    if (load || reading) body.push([String(body.length + 1), load, reading])
  }
  if (body.length) {
    autoTable(doc, {
      startY: y + 3,
      margin: { left: M, right: doc.internal.pageSize.getWidth() - RIGHT },
      head: [["Sl. No.", "Actual Load Applied in KN", "Indicated Load in DIV"]],
      body,
      theme: "grid",
      styles: { font: FONT, fontSize: 9, textColor: 0, lineColor: 0, lineWidth: 0.2, cellPadding: 0.9, halign: "center" },
      headStyles: { fillColor: 255, textColor: 0, fontStyle: "normal" },
    })
    y = doc.lastAutoTable.finalY
  }

  if (filled(values.factor)) {
    y += 5
    doc.setFont(FONT, "normal")
    doc.setFontSize(10)
    const lead = "The factor of proving ring of one division = "
    doc.text(lead, M + 2, y)
    doc.setFont(FONT, "bold")
    doc.text(`${String(values.factor).trim()} kgf`, M + 2 + doc.getTextWidth(lead), y)
  }

  y += 5.5
  doc.setFont(FONT, "bold")
  doc.setFontSize(10.5)
  doc.text("Result:", M, y)
  y += 4.5
  doc.setFont(FONT, "italic")
  doc.setFontSize(10)
  doc.text("The instrument/equipment was found satisfactory with respect to the specified requirements.", M, y)

  y += 6
  doc.setFont(FONT, "bold")
  doc.setFontSize(11)
  doc.text("Note:-", M, y)
  doc.line(M, y + 1, M + doc.getTextWidth("Note:-"), y + 1)

  y = drawNotes(doc, y + 4.5, NOTES, { fontSize: 9, lineHeight: 3.9, gap: 1.1 })
  drawSignOff(doc, assets)
  return y
}
