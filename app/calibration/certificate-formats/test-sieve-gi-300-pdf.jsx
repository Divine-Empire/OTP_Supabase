// "Test Sieve GI 300 Dia" (TEST SIEVE-GI-300 DIA.docx).
// Displays party details, certificate details (no readings table), traceable standard certification,
// the sieve specification/aperture size, standard reference, result, and 4 notes.
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

export function drawTestSieveGi300Page(doc, values, assets) {
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
    ]
  )

  y += 7
  doc.setFont(FONT, "normal")
  doc.setFontSize(11)
  const intro = "This is to certify that your instruments / products have been tested / calibrated using standard whose accuracies are traceable to the Indian Standard."
  const introLines = doc.splitTextToSize(intro, RIGHT - M)
  doc.text(introLines, M, y)
  y += introLines.length * 5.2

  if (filled(values.sieveSpecification)) {
    y += 5
    doc.setFont(FONT, "bold")
    doc.setFontSize(11)
    const specLines = doc.splitTextToSize(String(values.sieveSpecification).trim(), RIGHT - M)
    doc.text(specLines, M, y)
    y += specLines.length * 5.2
  }

  y += 5
  doc.setFont(FONT, "normal")
  doc.setFontSize(11)
  const stdLead = "This performance observed as per standard "
  doc.text(stdLead, M, y)
  const standardVal = filled(values.basedOn) ? String(values.basedOn).trim() : "IS: 460 Part-I, Part-II & Part-III"
  doc.setFont(FONT, "bold")
  doc.text(standardVal, M + doc.getTextWidth(stdLead), y)

  y += 8
  doc.setFont(FONT, "bold")
  doc.setFontSize(11.5)
  doc.text("Result:", M, y)
  y += 5.5
  doc.setFont(FONT, "bolditalic")
  doc.setFontSize(11)
  const res = "The instrument/equipment was found satisfactory with respect to the specified requirements"
  const resLines = doc.splitTextToSize(res, RIGHT - M)
  doc.text(resLines, M, y)
  y += (resLines.length - 1) * 5.2

  y += 10
  doc.setFont(FONT, "bold")
  doc.setFontSize(11)
  doc.text("Note :", M, y)

  y = drawNotes(doc, y + 6, NOTES, { fontSize: 10, lineHeight: 4.8, gap: 2 })
  drawSignOff(doc, assets)
  return y
}

