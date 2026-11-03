// Certificate formats. An id here is the value stored in lto_items.calibration_certificate_format
// and the key of its PDF drawer in certificates-pdf.jsx. Each format has a fixed set of fields
// (labels never change, only values are edited) and optionally a fixed-shape readings table.
export type CertificateValues = Record<string, string>

export interface CertificateField {
  key: string
  label: string
  type?: "text" | "date" | "textarea"
  hint?: string
}

// A readings table: `rows` rows, each cell an editable value stored under columns[c].key(row).
export interface TableSpec {
  rows: number
  columns: { label: string; key: (row: number) => string }[]
}

export interface CertificateFormat {
  id: string
  name: string
  thumbnail: "common" | "table"
  fields: CertificateField[]
  table?: TableSpec
  getDefaults: (itemName?: string, qty?: number) => CertificateValues
}

const YEAR = () => new Date().getFullYear()

const PARTY_FIELDS: CertificateField[] = [
  { key: "customerName", label: "Customer Name" },
  { key: "address", label: "Address", type: "textarea" },
  { key: "certificateNo", label: "Certificate No." },
  { key: "instrumentName", label: "Instrument Name" },
  { key: "calibrationDate", label: "Calibration Date", type: "date" },
  { key: "nextCalibrationDate", label: "Next Calibration Date", type: "date", hint: "Auto-set from the calibration date and Warranty Duration; editable" },
]

const PARTY_DEFAULTS = (): CertificateValues => ({
  customerName: "As per Invoice",
  address: "Invoice Shipment Add.",
  certificateNo: `DE/N-LAB/${YEAR()}/`,
  instrumentName: "As per invoice Name",
  calibrationDate: "",
  nextCalibrationDate: "",
  quantity: "01 Nos",
})

export const COMMON_FORMAT: CertificateFormat = {
  id: "common_format",
  name: "Common Format",
  thumbnail: "common",
  fields: [...PARTY_FIELDS, { key: "quantity", label: "Quantity" }, { key: "basedOn", label: "Based On" }],
  getDefaults: () => ({ ...PARTY_DEFAULTS(), basedOn: "" }),
}

// format_proving_ring_50.docx: the readings of the 50 kN proving ring.
const PROVING_RING_LOADS = [5, 10, 15, 20, 25, 30, 35, 40, 45, 50]
const PROVING_RING_READINGS = ["79.2", "154.8", "226.6", "298.8", "372.9", "448.4", "528.8", "597.9", "672.9", "752.8"]

export const PROVING_RING_50_FORMAT: CertificateFormat = {
  id: "proving_ring_50",
  name: "Proving Ring",
  thumbnail: "table",
  fields: [
    ...PARTY_FIELDS,
    { key: "serialNo", label: "Serial No." },
    { key: "quantity", label: "Quantity" },
    { key: "factor", label: "Factor of one division (kgf)" },
  ],
  table: {
    rows: PROVING_RING_LOADS.length,
    columns: [
      { label: "Actual Load Applied in KN", key: (i) => `load${i + 1}` },
      { label: "Indicated Load in DIV", key: (i) => `reading${i + 1}` },
    ],
  },
  getDefaults: () => ({
    ...PARTY_DEFAULTS(),
    serialNo: "",
    factor: "6.7",
    ...Object.fromEntries(PROVING_RING_LOADS.map((v, i) => [`load${i + 1}`, String(v)])),
    ...Object.fromEntries(PROVING_RING_READINGS.map((v, i) => [`reading${i + 1}`, v])),
  }),
}

// Compression testing machine formats (ctm_1000.docx / ctm_1500.docx / ctm_2000.docx). Same layout,
// they differ only in the machine range and the default readings. A "-" row is an unused row
// (as in the docx); a row left completely blank is dropped from the PDF.
type CtmRow = [dial: string, load: string, indicated: string, error: string, percent: string]
const UNUSED_ROW: CtmRow = ["-", "-", "-", "-", "-"]
const ZERO = (dial: string, load: string): CtmRow => [dial, load, load, "00", "0.0%"]

const CTM_ROWS: Record<1000 | 1500 | 2000, CtmRow[]> = {
  1000: [ZERO("107.3", "200"), ZERO("218.5", "400"), ZERO("330.1", "600"), ZERO("440.5", "800"), ["554.7", "1000", "Cut Off", "-", "-"]],
  1500: [
    ZERO("107.3", "200"), ZERO("218.5", "400"), ZERO("330.1", "600"), ZERO("440.5", "800"),
    ZERO("554.7", "1000"), ZERO("669.0", "1200"), ZERO("783.7", "1400"), ["900.8", "1600", "Cut Off", "-", "-"],
  ],
  2000: [
    ZERO("107.3", "200"), ZERO("218.5", "400"), ZERO("330.1", "600"), ZERO("440.5", "800"),
    ZERO("554.7", "1000"), ZERO("669.0", "1200"), ZERO("783.7", "1400"),
    ["900.8", "1600", "1610", "10", "0.6%"], ["1019.2", "1800", "1810", "10", "0.5%"], ["1141.1", "2000", "Cut Off", "-", "-"],
  ],
}
export const CTM_TABLE_ROWS = 10
const CTM_COLUMN_KEYS = ["dial", "load", "indicated", "error", "percent"]

function createCtmFormat(range: 1000 | 1500 | 2000): CertificateFormat {
  return {
    id: `ctm_${range}`,
    name: `CTM ${range} kN`,
    thumbnail: "table",
    fields: [
      { key: "customerName", label: "Customer Name" },
      { key: "address", label: "Address", type: "textarea" },
      { key: "instrumentName", label: "Item Name" },
      { key: "certificateNo", label: "Certificate No." },
      { key: "serialNo", label: "SRN" },
      { key: "calibrationDate", label: "Date of Calibration", type: "date" },
      { key: "nextCalibrationDate", label: "Next Calibration Due on", type: "date", hint: "Auto-set from the calibration date and Warranty Duration; editable" },
      { key: "provingRingNo", label: "Proving Ring No." },
      { key: "basedOn", label: "Based On" },
    ],
    table: {
      rows: CTM_TABLE_ROWS,
      columns: [
        { label: "Standard Dial Gauge Division", key: (i) => `dial${i + 1}` },
        { label: "Actual Load Applied in KN", key: (i) => `load${i + 1}` },
        { label: "Indicated Load in KN", key: (i) => `indicated${i + 1}` },
        { label: "Error Load", key: (i) => `error${i + 1}` },
        { label: "Percentage Error", key: (i) => `percent${i + 1}` },
      ],
    },
    getDefaults: () => {
      const rows = Array.from({ length: CTM_TABLE_ROWS }, (_, i) => CTM_ROWS[range][i] ?? UNUSED_ROW)
      return {
        customerName: "As per Invoice",
        address: "Invoice Shipment Add.",
        instrumentName: "Compression Testing Machine", // the batch dialog replaces it with the full item name
        certificateNo: `DE/N-LAB/${YEAR()}/`,
        serialNo: "",
        calibrationDate: "",
        nextCalibrationDate: "",
        provingRingNo: "2000KN.0314",
        basedOn: "IS:1828 Part 1:2022 (ISO 7500-1:2018)",
        quantity: "01 Nos", // only drives how many certificates are made, not printed
        ...Object.fromEntries(rows.flatMap((row, i) => CTM_COLUMN_KEYS.map((k, c) => [`${k}${i + 1}`, row[c]]))),
      }
    },
  }
}

export const CTM_1000_FORMAT = createCtmFormat(1000)
export const CTM_1500_FORMAT = createCtmFormat(1500)
export const CTM_2000_FORMAT = createCtmFormat(2000)

// Weighing balance readings by capacity.
// Each capacity defines its unit ("kg" or "g") and default rows [std, obs, err, unc].
export type WbRow = [std: string, obs: string, err: string, unc: string]

export const WB_READINGS_BY_CAPACITY: Record<string, { unit: "kg" | "g"; rows: WbRow[] }> = {
  "5kg": {
    unit: "kg",
    rows: [
      ["0", "0.000", "0.000", "0.01"],
      ["1", "1.002", "+0.002", "0.01"],
      ["2", "2.003", "+0.003", "0.01"],
      ["3", "3.004", "+0.004", "0.02"],
      ["4", "4.005", "+0.005", "0.02"],
      ["5", "5.007", "+0.007", "0.02"],
    ],
  },
  "10kg": {
    unit: "kg",
    rows: [
      ["0", "0.000", "0.000", "0.01"],
      ["2", "2.002", "+0.002", "0.01"],
      ["4", "4.004", "+0.004", "0.02"],
      ["6", "6.005", "+0.005", "0.02"],
      ["8", "8.006", "+0.006", "0.03"],
      ["10", "10.008", "+0.008", "0.03"],
    ],
  },
  "15kg": {
    unit: "kg",
    rows: [
      ["0", "0.000", "0.000", "0.02"],
      ["3", "3.003", "+0.003", "0.02"],
      ["6", "6.005", "+0.005", "0.02"],
      ["9", "9.006", "+0.006", "0.03"],
      ["12", "12.008", "+0.008", "0.03"],
      ["15", "15.010", "+0.010", "0.04"],
    ],
  },
  "30kg": {
    unit: "kg",
    rows: [
      ["0", "0.000", "0.000", "0.02"],
      ["5", "5.004", "+0.004", "0.02"],
      ["10", "10.006", "+0.006", "0.03"],
      ["15", "15.008", "+0.008", "0.03"],
      ["20", "20.010", "+0.010", "0.04"],
      ["30", "30.015", "+0.015", "0.05"],
    ],
  },
  "50kg": {
    unit: "kg",
    rows: [
      ["0", "0.000", "0.000", "0.02"],
      ["10", "10.006", "+0.006", "0.03"],
      ["20", "20.010", "+0.010", "0.04"],
      ["30", "30.012", "+0.012", "0.04"],
      ["40", "40.015", "+0.015", "0.05"],
      ["50", "50.020", "+0.020", "0.05"],
    ],
  },
  "100kg": {
    unit: "kg",
    rows: [
      ["0", "0.000", "0.000", "0.03"],
      ["20", "20.010", "+0.010", "0.04"],
      ["40", "40.015", "+0.015", "0.05"],
      ["60", "60.020", "+0.020", "0.05"],
      ["80", "80.025", "+0.025", "0.06"],
      ["100", "100.030", "+0.030", "0.06"],
    ],
  },
  "150kg": {
    unit: "kg",
    rows: [
      ["0", "0.000", "0.000", "0.03"],
      ["30", "30.012", "+0.012", "0.04"],
      ["60", "60.018", "+0.018", "0.05"],
      ["90", "90.022", "+0.022", "0.06"],
      ["120", "120.028", "+0.028", "0.06"],
      ["150", "150.035", "+0.035", "0.07"],
    ],
  },
  "220g": {
    unit: "g",
    rows: [
      ["0", "0.000", "0.000", "0.002"],
      ["50", "50.002", "+0.002", "0.002"],
      ["100", "100.003", "+0.003", "0.003"],
      ["150", "150.004", "+0.004", "0.003"],
      ["200", "200.005", "+0.005", "0.004"],
      ["220", "220.006", "+0.006", "0.004"],
    ],
  },
  "300kg": {
    unit: "kg",
    rows: [
      ["0", "0.00", "0.00", "0.02"],
      ["50", "50.01", "+0.01", "0.02"],
      ["100", "100.02", "+0.02", "0.02"],
      ["150", "150.01", "+0.01", "0.03"],
      ["200", "200.03", "+0.03", "0.03"],
      ["250", "250.02", "+0.02", "0.04"],
      ["300", "300.04", "+0.04", "0.04"],
    ],
  },
  "500g": {
    unit: "g",
    rows: [
      ["0", "0.000", "0.000", "0.005"],
      ["100", "100.005", "+0.005", "0.005"],
      ["200", "200.006", "+0.006", "0.006"],
      ["300", "300.007", "+0.007", "0.007"],
      ["400", "400.008", "+0.008", "0.008"],
      ["500", "500.010", "+0.010", "0.008"],
    ],
  },
  "600g": {
    unit: "g",
    rows: [
      ["0", "0.000", "0.000", "0.005"],
      ["100", "100.005", "+0.005", "0.005"],
      ["200", "200.006", "+0.006", "0.006"],
      ["300", "300.008", "+0.008", "0.007"],
      ["400", "400.009", "+0.009", "0.008"],
      ["600", "600.012", "+0.012", "0.010"],
    ],
  },
}

export const WB_COLUMN_KEYS = ["std", "obs", "err", "unc"]

export function resolveWeightBalanceCapacity(itemName: string): string | null {
  const m = itemName.match(/(\d+(?:\.\d+)?)\s*(kg|kilogram|g|gm|gms|gram)\b/i)
  if (!m) return null
  const num = m[1]
  const unit = m[2].toLowerCase().startsWith("k") ? "kg" : "g"
  const key = `${num}${unit}`
  return WB_READINGS_BY_CAPACITY[key] ? key : null
}

export function getWeightBalanceDefaults(itemName?: string): CertificateValues {
  const key = itemName ? resolveWeightBalanceCapacity(itemName) : null
  // A capacity with no table (e.g. 6 kg, 20 kg, 60 kg) starts with an empty readings table to be
  // filled in by hand. It never borrows another capacity's readings, which would print wrong numbers.
  // The blank Certificate tool (no item) shows the 5 kg sample from the docx.
  const spec = !itemName ? WB_READINGS_BY_CAPACITY["5kg"] : key ? WB_READINGS_BY_CAPACITY[key] : undefined
  const rows = spec?.rows ?? []
  const unit = spec?.unit ?? (itemName && /\d\s*(?:gm|gms|gram|g)\b/i.test(itemName) && !/kg/i.test(itemName) ? "g" : "kg")
  return {
    ...PARTY_DEFAULTS(),
    instrumentName: itemName || "WEIGHING BALANCE",
    idNo: "",
    wbUnit: unit,
    basedOn: "IS OIML R-76-1",
    ...Object.fromEntries(
      Array.from({ length: 10 }, (_, i) => WB_COLUMN_KEYS.map((k, c) => [`${k}${i + 1}`, rows[i]?.[c] ?? ""])).flat()
    ),
  }
}

export const WEIGHT_BALANCE_FORMAT: CertificateFormat = {
  id: "weight_balance",
  name: "Weight Balance",
  thumbnail: "table",
  fields: [
    ...PARTY_FIELDS,
    { key: "quantity", label: "Quantity" },
    { key: "idNo", label: "Id No.", hint: "Short name of company / short name of instrument / quantity start to end" },
    { key: "basedOn", label: "Based On" },
  ],
  table: {
    rows: 10,
    columns: [
      { label: "Standard", key: (i) => `std${i + 1}` },
      { label: "Observed", key: (i) => `obs${i + 1}` },
      { label: "Error", key: (i) => `err${i + 1}` },
      { label: "Uncertainty (±)", key: (i) => `unc${i + 1}` },
    ],
  },
  getDefaults: (itemName?: string) => getWeightBalanceDefaults(itemName),
}

// Unified sieve template: auto-detects material/dia from item name to set the spec line.
// Replaces the old test_sieve_GI_300, test_sieve_GI_450, test_sieve_brass formats.
const SIEVE_FIELDS: CertificateField[] = [
  { key: "customerName", label: "Customer Name" },
  { key: "address", label: "Address", type: "textarea" },
  { key: "certificateNo", label: "Certificate No." },
  { key: "instrumentName", label: "Instrument Name" },
  { key: "calibrationDate", label: "Calibration Date", type: "date" },
  { key: "nextCalibrationDate", label: "Next Calibration Date", type: "date", hint: "Auto-set from the calibration date and Warranty Duration; editable" },
  { key: "quantity", label: "Quantity" },
  { key: "sieveSpecification", label: "Sieve Specification / Sizes", type: "textarea", hint: "Appears bold below the certification statement" },
  { key: "basedOn", label: "Standard / Based On" },
]

export function cleanSieveInstrumentName(itemName: string): string {
  const m = itemName.match(/^(.+?\bDIA\b)/i)
  return m ? m[1].trim() : itemName
}

export function extractSieveAperture(itemName: string): string | null {
  const m = itemName.match(/\bDIA\b\s*[-–:]?\s*(.+)$/i)
  return m ? m[1].trim() : null
}

export function getSieveSpec(itemName: string, qty: number = 1): string {
  const aperture = extractSieveAperture(itemName)
  const repeatCount = Math.max(1, qty || 1)
  const aperturesText = aperture ? Array(repeatCount).fill(aperture).join(", ") : ""

  if (/GI[- ]*300/i.test(itemName)) {
    return aperturesText
      ? `GI Sieves 300 mm Dia– ${aperturesText}`
      : "GI Sieves 300 mm Dia– 37.5mm, 31.5mm, 22.4mm, 16mm, 13.2mm, 12.50mm, 11.2mm, 10mm, 9.5mm, 2.36mm, 2.36mm"
  }
  if (/GI[- ]*450/i.test(itemName)) {
    return aperturesText
      ? `GI Sieves 450 mm Dia– ${aperturesText}`
      : "GI Sieves 450 mm Dia– 37.5mm, 31.5mm, 22.4mm, 16mm, 13.2mm, 12.50mm, 11.2mm, 10mm, 9.5mm, 2.36mm, 2.36mm"
  }
  if (/BRASS/i.test(itemName)) {
    return aperturesText
      ? `Brass Sieves 200 mm Dia– ${aperturesText}`
      : "Brass Sieves 200 mm Dia – 4.75mm, 2mm, 2mm, 1.7mm, 1mm, 1mm, 1mm, 1mm, 600 micron, 600 micron, 600 micron, 600 micron, 425 micron, 425 micron, 425 micron, 212 micron, 212 micron, 90 micron, 90 micron, 500 micron"
  }
  return aperturesText
}

// One sieve's aperture as a number of mm, for ordering ("2.36MM" -> 2.36, "600 micron" -> 0.6).
function apertureMm(aperture: string): number {
  const n = parseFloat(aperture.replace(/,/g, ""))
  if (!Number.isFinite(n)) return -1
  return /micron|µ/i.test(aperture) ? n / 1000 : n
}

// Sieve Specification for ONE certificate covering several sieve items of the same kind
// (e.g. GI-450 sieves of different apertures): the kind's heading once, then every aperture,
// biggest first, each repeated by its item's qty. The heading comes from the first item.
export function getMergedSieveSpec(items: { itemName: string; qty: number }[]): string {
  const apertures = items.flatMap((it) => {
    const a = extractSieveAperture(it.itemName)
    return a ? Array(Math.max(1, it.qty || 1)).fill(a) : []
  })
  apertures.sort((a, b) => apertureMm(b) - apertureMm(a))
  const heading = items.length ? sieveHeading(items[0].itemName) : ""
  return heading ? `${heading}– ${apertures.join(", ")}` : apertures.join(", ")
}

function sieveHeading(itemName: string): string {
  if (/GI[- ]*300/i.test(itemName)) return "GI Sieves 300 mm Dia"
  if (/GI[- ]*450/i.test(itemName)) return "GI Sieves 450 mm Dia"
  if (/BRASS/i.test(itemName)) return "Brass Sieves 200 mm Dia"
  return ""
}

export const TEST_SIEVE_FORMAT: CertificateFormat = {
  id: "test_sieve",
  name: "Test Sieve",
  thumbnail: "common",
  fields: SIEVE_FIELDS,
  getDefaults: (itemName?: string, qty?: number) => ({
    ...PARTY_DEFAULTS(),
    instrumentName: itemName ? cleanSieveInstrumentName(itemName) : "TEST SIEVE",
    sieveSpecification: itemName ? getSieveSpec(itemName, qty) : "",
    basedOn: "IS: 460 Part-I, Part-II & Part-III",
  }),
}

export const CERTIFICATE_FORMATS: CertificateFormat[] = [
  COMMON_FORMAT,
  PROVING_RING_50_FORMAT,
  CTM_1000_FORMAT,
  CTM_1500_FORMAT,
  CTM_2000_FORMAT,
  WEIGHT_BALANCE_FORMAT,
  TEST_SIEVE_FORMAT,
]

export const getCertificateFormat = (id: string | null | undefined) => CERTIFICATE_FORMATS.find((f) => f.id === id) ?? null

// Warranty Duration choices of the Generate Certificate dialogs; 6 months is the default.
export const WARRANTY_OPTIONS = [
  { label: "3 month", months: 3 },
  { label: "6 month", months: 6 },
  { label: "1 year", months: 12 },
  { label: "2 year", months: 24 },
]
export const DEFAULT_WARRANTY_MONTHS = 6

// Next Calibration Date = calibration date + the warranty duration - 1 day
// (3 months from 10-05-2026 is 09-08-2026, not 10-08-2026).
export function calibrationDueDate(isoDate: string, months: number): string {
  const start = addMonths(isoDate, months)
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(start)
  if (!m) return ""
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]) - 1)
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function addMonths(isoDate: string, months: number): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate)
  if (!m) return ""
  const d = new Date(Number(m[1]), Number(m[2]) - 1 + months, Number(m[3]))
  // Jan 31 + 1 month would roll into March; clamp to the last day of the target month.
  if (d.getDate() !== Number(m[3])) d.setDate(0)
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}
