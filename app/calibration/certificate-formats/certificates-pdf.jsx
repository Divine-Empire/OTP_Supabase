// Builds calibration certificate PDFs: any number of certificates, one per page, in a single
// document. The preview iframe and the downloaded/uploaded file come from the same function,
// so they can never differ. A format's id (see formats.ts) selects its page layout here.
import { drawCommonPage } from "./common-format-pdf.jsx"
import { drawProvingRing50Page } from "./proving-ring-50-pdf.jsx"
import { loadAssets } from "./pdf-shared.jsx"

export const DRAWERS = {
  common_format: drawCommonPage,
  proving_ring_50: drawProvingRing50Page,
}

// certs: [{ formatId, values }] -> jsPDF document.
export async function buildCertificatesPdf(certs) {
  const [{ jsPDF }, assets] = await Promise.all([import("jspdf"), loadAssets()])
  const doc = new jsPDF({ unit: "mm", format: "a4", compress: true })
  for (const [i, cert] of certs.entries()) {
    if (i > 0) doc.addPage()
    const draw = DRAWERS[cert.formatId]
    if (!draw) throw new Error(`No certificate layout for format "${cert.formatId}"`)
    await draw(doc, cert.values, assets)
  }
  return doc
}

export async function certificatesPdfBlob(certs) {
  return (await buildCertificatesPdf(certs)).output("blob")
}

export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
