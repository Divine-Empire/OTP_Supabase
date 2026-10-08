import { ALL_LOCATIONS } from "@/lib/locations"

// Shared row-level access helper, used identically across every stage
// page's Pending/History lists. Two independent checks, both must pass:
//
// CRM — user only sees rows whose crmName is in their assignedCrmNames.
// Location — user only sees rows whose orderLocation equals their own
//   otp_users.location.
//
// admin is unrestricted on both. A row with no crmName / no orderLocation
// (e.g. orders converted before Database/63_order_location.sql) is visible
// to everyone until an admin fills it in. A user with no location assigned
// yet is likewise unrestricted by location, so rolling this out never
// blanks anyone's screen before Settings has been filled in.
//
// NOTE: this runs in the browser on already-fetched rows — it scopes what
// a user works on, it is not a security boundary (the API routes don't
// know who's calling).
export interface AccessUser {
  role?: string
  assignedCrmNames?: string[]
  location?: string | null
}

export function canSeeLocation(rowLocation: string | null | undefined, currentUser: AccessUser | null | undefined): boolean {
  if (!currentUser || currentUser.role === "admin") return true
  const userLocation = currentUser.location
  if (!userLocation || userLocation === ALL_LOCATIONS) return true
  return !rowLocation || rowLocation === userLocation
}

export function filterByAccess<T extends { crmName?: string; orderLocation?: string }>(
  rows: T[],
  currentUser: AccessUser | null | undefined
): T[] {
  if (!currentUser || currentUser.role === "admin") return rows

  const allowedCrm = new Set(currentUser.assignedCrmNames || [])
  return rows.filter(
    (row) => (!row.crmName || allowedCrm.has(row.crmName)) && canSeeLocation(row.orderLocation, currentUser)
  )
}

// Unique crmName values present in a (already access-filtered) row set —
// feeds each stage's own CRM Name filter dropdown options.
export function crmNameOptionsFrom(rows: { crmName?: string }[]): string[] {
  const options = new Set<string>()
  rows.forEach((row) => {
    if (row.crmName) options.add(row.crmName)
  })
  return Array.from(options).sort()
}
