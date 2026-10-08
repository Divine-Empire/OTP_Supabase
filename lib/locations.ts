// Single source of truth for order locations. The label is what's stored
// everywhere (otp_orders.order_location, otp_users.location, both dropdown
// tables — see Database/63_order_location.sql). Every other system's name
// for the same physical place is derived from here, never re-typed:
//   imsCode   — IMS-Supabase's ims_location_master.locationCode
//   subGodown — the existing per-wave otp_pre_invoice_queue.sub_godown value
//               (CG sub-stores only; NE has none), which IMS's sync-sales
//               already reads (Database/54_cg_sub_godown_tracking.sql).
export const ORDER_LOCATIONS = [
  { label: "Warehouse-CG", imsCode: "CG-WAREHOUSE", subGodown: "Warehouse" },
  { label: "Head-Office-CG", imsCode: "HO", subGodown: "Head Office" },
  { label: "Service-Inbound-CG", imsCode: "CG-SERVICE-INBOUND", subGodown: "Service Inbound" },
  { label: "Maniquip-CG", imsCode: "MANIQUIP", subGodown: "Maniquip" },
  { label: "Warehouse-NE", imsCode: "NE", subGodown: null },
] as const

// Admin's otp_users.location value — sees every location.
export const ALL_LOCATIONS = "all"

function find(label: string | null | undefined) {
  return ORDER_LOCATIONS.find((l) => l.label === label)
}

export function imsCodeFor(label: string | null | undefined): string | null {
  return find(label)?.imsCode ?? null
}

export function subGodownFor(label: string | null | undefined): string | null {
  return find(label)?.subGodown ?? null
}
