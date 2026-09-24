// Shared helpers for Settings > TAT Management — keep TAT_STAGE_OPTIONS in
// sync with the seed list in Database/33_otp_stage_tat.sql and the
// STAGE_ORDER/DEFAULT_STAGES in app/api/otp-supabase/tat/route.ts.

export interface TatStageOption {
  key: string
  label: string
  // The actual pipeline column/table this stage's planned date lives on —
  // shown as helper text in the dropdown so it's clear what each TAT entry
  // is (currently reference-only; no route reads tat_minutes yet).
  plannedField: string
}

export const TAT_STAGE_OPTIONS: TatStageOption[] = [
  { key: "order_acceptable", label: "Order Acceptable", plannedField: "otp_orders.order_acceptable_planned" },
  { key: "proforma_invoice", label: "Pro-Forma Invoice", plannedField: "otp_orders_acceptable.proforma_invoice_planned" },
  { key: "debit_note", label: "Debit Note", plannedField: "otp_orders_acceptable.debit_note_planned" },
  { key: "check_inventory", label: "Check Inventory", plannedField: "otp_orders_acceptable.check_inventory_planned" },
  { key: "material_received", label: "Material Received", plannedField: "otp_material_shortage (pending rows)" },
  { key: "pre_invoice", label: "Pre-Invoice", plannedField: "otp_pre_invoice_queue (status=pending)" },
  { key: "debit_note_for_invoice", label: "Debit Note (Inv.)", plannedField: "otp_pre_invoice_queue.debit_note_planned" },
  { key: "make_invoice", label: "Make Invoice", plannedField: "otp_pre_invoice_queue.make_invoice_planned" },
  { key: "calibration", label: "Calibration Certificate", plannedField: "otp_make_invoice.calibration_planned" },
  { key: "packaging_transport", label: "Packaging and Transport", plannedField: "otp_make_invoice.packaging_transport_planned" },
  { key: "bilty_upload", label: "Bilty Upload", plannedField: "otp_packaging_transport.bilty_upload_planned" },
  { key: "client_confirmation", label: "Client Confirmation", plannedField: "otp_bilty_upload.client_confirmation_planned" },
]

export interface DHM {
  days: number
  hours: number
  minutes: number
}

export function minutesToDHM(totalMinutes: number): DHM {
  const total = Math.max(0, Math.floor(Number(totalMinutes) || 0))
  const days = Math.floor(total / 1440)
  const remainingAfterDays = total % 1440
  const hours = Math.floor(remainingAfterDays / 60)
  const minutes = remainingAfterDays % 60
  return { days, hours, minutes }
}

export function dhmToMinutes(days: number | string, hours: number | string, minutes: number | string): number {
  const d = Math.max(0, Number(days) || 0)
  const h = Math.max(0, Number(hours) || 0)
  const m = Math.max(0, Number(minutes) || 0)
  return d * 1440 + h * 60 + m
}

// "2 Days 3 Hrs 15 Mins" style label for table display.
export function formatDHM(totalMinutes: number): string {
  const { days, hours, minutes } = minutesToDHM(totalMinutes)
  if (days === 0 && hours === 0 && minutes === 0) return "Same day"
  const parts: string[] = []
  if (days > 0) parts.push(`${days} Day${days === 1 ? "" : "s"}`)
  if (hours > 0) parts.push(`${hours} Hr${hours === 1 ? "" : "s"}`)
  if (minutes > 0) parts.push(`${minutes} Min${minutes === 1 ? "" : "s"}`)
  return parts.join(" ")
}
