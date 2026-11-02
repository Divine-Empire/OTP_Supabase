// Unified "Test Sieve" layout (test_sieve; GI 300, GI 450 and Brass 200 sieves share it).
// Displays party details, certificate details (no readings table), traceable standard certification,
// the sieve specification/aperture size, standard reference, result, and 4 notes.
// k is the adaptive spacing factor (see drawFitted in pdf-shared.jsx): a long aperture list
// tightens the spacing instead of running into the seal.
import { FONT, drawDetails, drawNotes, drawPageStart, drawSignOff, filled, fmtDate, fontFactor, pageBox } from "./pdf-shared.jsx"

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

export function drawTestSieveGi300Page(doc, values, assets, k = 1) {
  const { M, RIGHT } = pageBox(doc)
  const f = fontFactor(k)
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
    ],
    { k }
  )

  y += 7 * k
  doc.setFont(FONT, "normal")
  doc.setFontSize(11 * f)
  const intro = "This is to certify that your instruments / products have been tested / calibrated using standard whose accuracies are traceable to the Indian Standard."
  const introLines = doc.splitTextToSize(intro, RIGHT - M)
  doc.text(introLines, M, y)
  y += introLines.length * 5.2 * f

  if (filled(values.sieveSpecification)) {
    y += 5 * k
    doc.setFont(FONT, "bold")
    doc.setFontSize(11 * f)
    const specLines = doc.splitTextToSize(String(values.sieveSpecification).trim(), RIGHT - M)
    doc.text(specLines, M, y)
    y += specLines.length * 5.2 * f
  }

  y += 5 * k
  doc.setFont(FONT, "normal")
  doc.setFontSize(11 * f)
  const stdLead = "This performance observed as per standard "
  doc.text(stdLead, M, y)
  const standardVal = filled(values.basedOn) ? String(values.basedOn).trim() : "IS: 460 Part-I, Part-II & Part-III"
  doc.setFont(FONT, "bold")
  doc.text(standardVal, M + doc.getTextWidth(stdLead), y)

  y += 8 * k
  doc.setFont(FONT, "bold")
  doc.setFontSize(11.5 * f)
  doc.text("Result:", M, y)
  y += 5.5 * k
  doc.setFont(FONT, "bolditalic")
  doc.setFontSize(11 * f)
  const res = "The instrument/equipment was found satisfactory with respect to the specified requirements"
  const resLines = doc.splitTextToSize(res, RIGHT - M)
  doc.text(resLines, M, y)
  y += (resLines.length - 1) * 5.2 * f

  y += 10 * k
  doc.setFont(FONT, "bold")
  doc.setFontSize(11 * f)
  doc.text("Note :", M, y)

  y = drawNotes(doc, y + 6 * k, NOTES, { fontSize: 10, lineHeight: 4.8, gap: 2, k })
  drawSignOff(doc, assets)
  return y
}
