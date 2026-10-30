// "Common Format" (format_common.docx).
import { FONT, drawDetails, drawNotes, drawPageStart, drawSignOff, filled, fmtDate, pageBox } from "./pdf-shared.jsx"

const NOTES = [
  [{ t: "This certificate refers to the particular item submitted for Calibration." }],
  [{ t: "This certificate shall not be reproduced expect in full unless written permission for publication of an approved abstract has been obtained from DIVINE EMPIRE INDIA PVT. LTD. RAIPUR." }],
  [{ t: "This calibration shall not be referred to or linked with issues coming under the preview of LEGAL Metrology." }],
  [
    { t: "This is a " },
    { t: "Non-NABL", b: true },
    { t: " Certificate issued based on the performance evaluation and review of the equipment/instrument. The results are intended for functional/internal assessment purposes only and are not covered under NABL accreditation." },
  ],
]

export function drawCommonPage(doc, values, assets) {
  const { M } = pageBox(doc)
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
    ]
  )

  y += 8
  doc.setFont(FONT, "bold")
  doc.setFontSize(12)
  doc.text("RESULT / CONCLUSION:", M, y)
  y += 8
  doc.setFontSize(11)
  doc.text("The instrument was inspected and evaluated against the specified requirements.", M, y)
  y += 8
  doc.text("The result is stated Limit.", M, y)

  if (filled(values.basedOn)) {
    const basedOn = String(values.basedOn).trim()
    y += 10
    doc.setFontSize(13)
    doc.text("Based On", M, y)
    const bx = M + doc.getTextWidth("Based On") + 3
    doc.text(basedOn, bx, y)
    doc.line(bx, y + 1, bx + Math.max(doc.getTextWidth(basedOn), 20), y + 1)
  }

  y += 11
  doc.setFontSize(12.5)
  doc.text("Note:-", M, y)
  doc.line(M, y + 1, M + doc.getTextWidth("Note:-"), y + 1)

  y = drawNotes(doc, y + 7, NOTES)
  drawSignOff(doc, assets)
  return y
}
