// Pieces every certificate layout shares: the letterhead page, the title, "label : value" rows,
// numbered notes, and the sign-off (seal + signature + company name + END) at the foot.
// A layout file (common-format-pdf.jsx, proving-ring-50-pdf.jsx) only decides what goes between.
export const LETTERHEAD = { src: "/certificate_letterhead.png", alias: "letterhead", maxPx: 1240, mime: "image/jpeg" }
export const SEAL = { src: "/seal.png", alias: "seal", maxPx: 320, mime: "image/png", h: 26 }
export const SIGNATURE = { src: "/signature.png", alias: "signature", maxPx: 360, mime: "image/png", h: 22 }

// Letterhead artwork occupies the top ~30 mm, the bottom ~26 mm and a strip down the right
// edge (x > 192 mm), so the text lives inside this box.
export const MARGIN_LEFT = 20
export const MARGIN_RIGHT = 22
export const CONTENT_TOP = 40
export const FONT = "times"
// Content must end above the seal, which starts at ~232 mm.
export const CONTENT_BOTTOM = 229

// Images are redrawn at the size they are printed at rather than embedded as supplied: the
// letterhead, seal and signature are large files and would otherwise bloat every PDF.
// The letterhead becomes a JPEG; seal and signature stay PNG so their edges stay clean.
async function loadAsset({ src, maxPx, mime }) {
  try {
    const blob = await (await fetch(src)).blob()
    const bitmap = await createImageBitmap(blob)
    const scale = Math.min(1, maxPx / bitmap.width)
    const w = Math.round(bitmap.width * scale)
    const h = Math.round(bitmap.height * scale)
    const canvas = document.createElement("canvas")
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext("2d")
    if (mime === "image/jpeg") {
      ctx.fillStyle = "#fff" // JPEG has no alpha
      ctx.fillRect(0, 0, w, h)
    }
    ctx.drawImage(bitmap, 0, 0, w, h)
    return { dataUrl: canvas.toDataURL(mime, 0.85), format: mime === "image/jpeg" ? "JPEG" : "PNG", ratio: bitmap.width / bitmap.height }
  } catch {
    return null // a missing image must not block the certificate
  }
}

export async function loadAssets() {
  const [letterhead, seal, signature] = await Promise.all([loadAsset(LETTERHEAD), loadAsset(SEAL), loadAsset(SIGNATURE)])
  return { letterhead, seal, signature }
}

export const filled = (v) => String(v ?? "").trim() !== ""

export function fmtDate(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || "")
  return m ? `${m[3]}-${m[2]}-${m[1]}` : ""
}

export const pageBox = (doc) => {
  const W = doc.internal.pageSize.getWidth()
  return { W, H: doc.internal.pageSize.getHeight(), M: MARGIN_LEFT, RIGHT: W - MARGIN_RIGHT }
}

// Letterhead background + the centred title. Returns the y of the title baseline.
export function drawPageStart(doc, assets) {
  const { W, H, M, RIGHT } = pageBox(doc)
  if (assets.letterhead) doc.addImage(assets.letterhead.dataUrl, assets.letterhead.format, 0, 0, W, H, LETTERHEAD.alias, "FAST")
  doc.setTextColor(0)
  doc.setDrawColor(0)
  doc.setLineWidth(0.3)
  doc.setFont(FONT, "bolditalic")
  doc.setFontSize(20)
  doc.text("Calibration Certificate", (M + RIGHT) / 2, CONTENT_TOP, { align: "center" })
  return CONTENT_TOP
}

// Customer / address, then the numbered detail rows. A field left blank in the form is
// left off the certificate entirely and the numbered rows renumber themselves.
// compact tightens line height and spacing for layouts that carry a table.
export function drawDetails(doc, startY, party, details, { compact = false } = {}) {
  const { M, RIGHT } = pageBox(doc)
  const LH = compact ? 4.3 : 5.4
  let y = startY
  const row = (label, value, labelX, colonX, valueX) => {
    doc.setFont(FONT, "normal")
    doc.setFontSize(compact ? 10.5 : 11.5)
    doc.text(label, labelX, y)
    doc.text(":", colonX, y)
    const lines = doc.splitTextToSize(String(value).trim(), RIGHT - valueX)
    doc.text(lines, valueX, y)
    y += lines.length * LH
  }

  const p = party.filter(([, v]) => filled(v))
  if (p.length) y += compact ? 8 : 13
  p.forEach(([label, v], i) => {
    if (i > 0) y += compact ? 1.5 : 4
    row(label, v, M + 2, M + 42, M + 50)
  })

  const d = details.filter(([, v]) => filled(v))
  const colon = M + 55
  if (d.length) y += p.length ? (compact ? 4.5 : 8) : compact ? 8 : 13
  d.forEach(([label, v], i) => row(`${i + 1}. ${label}`, v, M, colon, colon + 8))
  return y
}

// notes: [[{ t, b? }, ...], ...]; segments allow a bold word inside a wrapped paragraph.
export function drawNotes(doc, startY, notes, { fontSize = 10.5, lineHeight = 5.4, gap = 2.5 } = {}) {
  const { M, RIGHT } = pageBox(doc)
  let y = startY
  doc.setFontSize(fontSize)
  const indent = M + 8
  const maxW = RIGHT - indent
  notes.forEach((segs, i) => {
    doc.setFont(FONT, "normal")
    doc.text(`${i + 1}.`, M + 3, y)
    let x = indent
    segs.forEach((seg) => {
      doc.setFont(FONT, seg.b ? "bold" : "normal")
      seg.t.split(/(\s+)/).forEach((word) => {
        if (!word) return
        const w = doc.getTextWidth(word)
        if (x + w > indent + maxW && word.trim()) {
          x = indent
          y += lineHeight
        }
        if (x === indent && !word.trim()) return
        doc.text(word, x, y)
        x += w
      })
    })
    y += lineHeight + gap
  })
  return y
}

// Seal and signature side by side (right-aligned) with the company name just under them,
// and "END" centred above the letterhead footer so a stack of certificates shows where each ends.
export function drawSignOff(doc, assets) {
  const { W, RIGHT } = pageBox(doc)
  const nameY = 263
  const imgBottom = nameY - 5
  let right = RIGHT
  if (assets.signature) {
    const w = SIGNATURE.h * assets.signature.ratio
    right -= w
    doc.addImage(assets.signature.dataUrl, assets.signature.format, right, imgBottom - SIGNATURE.h, w, SIGNATURE.h, SIGNATURE.alias, "FAST")
    right -= 4
  }
  if (assets.seal) {
    const w = SEAL.h * assets.seal.ratio
    right -= w
    doc.addImage(assets.seal.dataUrl, assets.seal.format, right, imgBottom - SEAL.h, w, SEAL.h, SEAL.alias, "FAST")
  }
  doc.setFont(FONT, "normal")
  doc.setFontSize(13)
  doc.text("Divine Empire India Pvt. Ltd.", RIGHT, nameY, { align: "right" })

  doc.setFont(FONT, "bold")
  doc.setFontSize(10)
  doc.text("END", W / 2, 268, { align: "center" })
}
