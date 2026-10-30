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
  getDefaults: () => CertificateValues
}

const YEAR = () => new Date().getFullYear()

const PARTY_FIELDS: CertificateField[] = [
  { key: "customerName", label: "Customer Name" },
  { key: "address", label: "Address", type: "textarea" },
  { key: "certificateNo", label: "Certificate No." },
  { key: "instrumentName", label: "Instrument Name" },
  { key: "calibrationDate", label: "Calibration Date", type: "date" },
  { key: "nextCalibrationDate", label: "Next Calibration Date", type: "date", hint: "Auto-set to 6 months after the calibration date; editable" },
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
  name: "Proving Ring 50 kN",
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

export const CERTIFICATE_FORMATS: CertificateFormat[] = [COMMON_FORMAT, PROVING_RING_50_FORMAT]

export const getCertificateFormat = (id: string | null | undefined) => CERTIFICATE_FORMATS.find((f) => f.id === id) ?? null

export function addMonths(isoDate: string, months: number): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate)
  if (!m) return ""
  const d = new Date(Number(m[1]), Number(m[2]) - 1 + months, Number(m[3]))
  // Jan 31 + 1 month would roll into March; clamp to the last day of the target month.
  if (d.getDate() !== Number(m[3])) d.setDate(0)
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}
