// Packaging and Dispatch's Transport Mode drives an 11-way (+2 legacy)
// branch of the process form. Both the page (which fields to render) and
// the route (never trust the client's choice — re-derive independently)
// read from this single FIELD_DEFS catalogue so the two can never drift
// apart on which fields a mode has or which ones are required.
//
// Downstream is only ever 2-way though: every section except
// "Customer Pickup / Self Pickup" still goes through Bilty Upload — only
// Customer Pickup skips it and sets client_confirmation_planned directly
// (confirmed with the user — not, e.g., Door Delivery, which still has its
// own POD field but goes through Bilty Upload like every freight mode).
//
// The 2 "legacy_receiving" modes (By Hand Maniquip Store / By Hand-
// Warehouse) are a temporary staging shim: kept only because real pending
// orders still carry those exact otp_orders.transport_mode values from
// before this 11-way rollout (Database/62_dispatch_mode_11way.sql) — they
// reuse the OLD simple Receiving's Section UI (just a Receiving's Copy) and
// OLD skip-bilty downstream, unchanged from Database/59. Remove
// LEGACY_RECEIVING_MODES (and its FIELD_DEFS/MODE_TO_SECTION entries) once
// every such pending order has been processed — check with:
//   select o.transport_mode, count(*) from otp_make_invoice mi
//   join otp_orders o on o.id = mi.order_id
//   left join otp_packaging_transport pt on pt.make_invoice_id = mi.id
//   where mi.packaging_transport_planned is not null
//     and (pt.id is null or pt.status = 'draft')
//   group by o.transport_mode;

export type FieldKey =
  | "vehicle_type"
  | "driver_name"
  | "driver_mobile"
  | "vehicle_no"
  | "reference_no"
  | "carrier_name"
  | "carrier_branch"
  | "route_info"
  | "carrier_driver_name"
  | "carrier_driver_mobile"
  | "weight"
  | "packages_count"
  | "event_datetime"
  | "expense_amount"
  | "receiving_copy_url"

export interface FieldDef {
  key: FieldKey
  label: string
  required?: boolean
  type?: "text" | "number" | "datetime-local" | "file"
}

export type SectionKey =
  | "legacy_receiving"
  | "local_vehicle"
  | "auto"
  | "bike_rider"
  | "courier"
  | "transport"
  | "bus_parcel"
  | "air_cargo"
  | "railway_parcel"
  | "door_delivery"
  | "direct_dispatch"
  | "customer_pickup"

const LEGACY_RECEIVING_MODES = new Set(["by hand maniquip store", "by hand-warehouse"])

const MODE_TO_SECTION: Record<string, SectionKey> = {
  "local vehicle": "local_vehicle",
  "auto": "auto",
  "bike/rider": "bike_rider",
  "courier": "courier",
  "transport": "transport",
  "bus parcel": "bus_parcel",
  "air cargo": "air_cargo",
  "railway parcel": "railway_parcel",
  "door delivery": "door_delivery",
  "direct dispatch": "direct_dispatch",
  "customer pickup / self pickup": "customer_pickup",
}

export function getSectionForMode(transportMode: string | null | undefined): SectionKey {
  const norm = (transportMode || "").trim().toLowerCase()
  if (LEGACY_RECEIVING_MODES.has(norm)) return "legacy_receiving"
  if (MODE_TO_SECTION[norm]) return MODE_TO_SECTION[norm]
  // Unrecognized / stale dropdown value (e.g. an order scanned before this
  // rollout under one of the old generic "By Transport"/"By Auto"/"By Bus"
  // values) — fall back to the generic Transport section rather than crash.
  return "transport"
}

export function isReceivingSection(section: SectionKey): boolean {
  return section === "legacy_receiving" || section === "customer_pickup"
}

// Back-compat for any remaining direct transportMode check.
export function isReceivingSectionMode(transportMode: string | null | undefined): boolean {
  return isReceivingSection(getSectionForMode(transportMode))
}

export const FIELD_DEFS: Record<SectionKey, FieldDef[]> = {
  legacy_receiving: [{ key: "receiving_copy_url", label: "Receiving's Copy", required: true, type: "file" }],
  customer_pickup: [
    { key: "driver_name", label: "Pickup Person Name", required: true },
    { key: "driver_mobile", label: "Mobile" },
    { key: "vehicle_no", label: "Vehicle No." },
    { key: "event_datetime", label: "Pickup Date & Time", type: "datetime-local" },
    { key: "receiving_copy_url", label: "Handover Proof", required: true, type: "file" },
  ],
  local_vehicle: [
    { key: "vehicle_type", label: "Vehicle Type", required: true },
    { key: "driver_name", label: "Driver Name", required: true },
    { key: "driver_mobile", label: "Driver Mobile" },
    { key: "event_datetime", label: "Pickup Date & Time", type: "datetime-local" },
    { key: "expense_amount", label: "Freight", type: "number" },
  ],
  auto: [
    { key: "reference_no", label: "Auto No." },
    { key: "driver_name", label: "Driver Name", required: true },
    { key: "driver_mobile", label: "Driver Mobile" },
    { key: "event_datetime", label: "Pickup Date & Time", type: "datetime-local" },
    { key: "expense_amount", label: "Fare", type: "number" },
  ],
  bike_rider: [
    { key: "driver_name", label: "Rider Name", required: true },
    { key: "driver_mobile", label: "Rider Mobile" },
    { key: "vehicle_no", label: "Bike No." },
    { key: "carrier_name", label: "App/Company" },
    { key: "reference_no", label: "Booking ID" },
    { key: "expense_amount", label: "Fare", type: "number" },
  ],
  courier: [
    { key: "driver_name", label: "Our Driver Name" },
    { key: "driver_mobile", label: "Our Driver Mobile" },
    { key: "carrier_name", label: "Courier Name", required: true },
    { key: "carrier_branch", label: "Branch" },
    { key: "reference_no", label: "AWB/Docket No.", required: true },
    { key: "expense_amount", label: "Freight", type: "number" },
  ],
  transport: [
    { key: "driver_name", label: "Our Driver Name" },
    { key: "driver_mobile", label: "Our Driver Mobile" },
    { key: "carrier_name", label: "Transporter Name", required: true },
    { key: "carrier_branch", label: "Branch" },
    { key: "reference_no", label: "LR No.", required: true },
    { key: "vehicle_no", label: "Transport Vehicle No." },
    { key: "carrier_driver_name", label: "Transport Driver Name" },
    { key: "carrier_driver_mobile", label: "Transport Driver Mobile" },
    { key: "expense_amount", label: "Freight", type: "number" },
  ],
  bus_parcel: [
    { key: "driver_name", label: "Our Driver Name" },
    { key: "driver_mobile", label: "Our Driver Mobile" },
    { key: "carrier_name", label: "Bus/Operator Name", required: true },
    { key: "route_info", label: "Route/Bus No." },
    { key: "reference_no", label: "Parcel Receipt No.", required: true },
    { key: "expense_amount", label: "Freight", type: "number" },
  ],
  air_cargo: [
    { key: "driver_name", label: "Our Driver Name" },
    { key: "driver_mobile", label: "Our Driver Mobile" },
    { key: "carrier_name", label: "Cargo/Airline Name", required: true },
    { key: "reference_no", label: "AWB No.", required: true },
    { key: "route_info", label: "Airport" },
    { key: "vehicle_no", label: "Flight No." },
    { key: "weight", label: "Weight" },
    { key: "expense_amount", label: "Freight", type: "number" },
  ],
  railway_parcel: [
    { key: "driver_name", label: "Our Driver Name" },
    { key: "driver_mobile", label: "Our Driver Mobile" },
    { key: "carrier_branch", label: "Parcel Office" },
    { key: "reference_no", label: "Parcel Booking No.", required: true },
    { key: "vehicle_no", label: "Train No." },
    { key: "route_info", label: "Origin/Destination Station" },
    { key: "packages_count", label: "Packages" },
    { key: "weight", label: "Weight" },
    { key: "expense_amount", label: "Freight", type: "number" },
  ],
  door_delivery: [
    { key: "driver_name", label: "Our Driver Name", required: true },
    { key: "driver_mobile", label: "Driver Mobile" },
    { key: "vehicle_no", label: "Company Vehicle No." },
    { key: "event_datetime", label: "Delivery Date & Time", type: "datetime-local" },
    { key: "receiving_copy_url", label: "POD", type: "file" },
  ],
  direct_dispatch: [
    { key: "carrier_name", label: "Vendor Name", required: true },
    { key: "carrier_branch", label: "Vendor Location" },
    { key: "reference_no", label: "Docket/LR/Delivery Challan No.", required: true },
    { key: "vehicle_no", label: "Vendor Vehicle No." },
    { key: "carrier_driver_name", label: "Vendor Driver Name" },
    { key: "carrier_driver_mobile", label: "Vendor Driver Mobile" },
    { key: "event_datetime", label: "Dispatch Date & Time", type: "datetime-local" },
  ],
}

// Maps each generic FieldKey to the actual otp_packaging_transport column
// it's stored in. driver_name/driver_mobile/expense_amount/receiving_copy_url
// reuse the 4 columns that already existed pre-rollout — every other key
// gets its own new column (Database/62_dispatch_mode_11way.sql).
export const FIELD_DB_COLUMN: Record<FieldKey, string> = {
  vehicle_type: "vehicle_type",
  driver_name: "transporter_name",
  driver_mobile: "transporter_contact",
  vehicle_no: "vehicle_no",
  reference_no: "reference_no",
  carrier_name: "carrier_name",
  carrier_branch: "carrier_branch",
  route_info: "route_info",
  carrier_driver_name: "carrier_driver_name",
  carrier_driver_mobile: "carrier_driver_mobile",
  weight: "weight",
  packages_count: "packages_count",
  event_datetime: "event_datetime",
  expense_amount: "expense_amount",
  receiving_copy_url: "receiving_copy_url",
}

// Every db column any section can write to a dynamic field through —
// used to null out columns a given submission's section doesn't use, so a
// later re-submit under a different mode never leaves stale data behind.
export const ALL_DYNAMIC_DB_COLUMNS = Array.from(new Set(Object.values(FIELD_DB_COLUMN)))
