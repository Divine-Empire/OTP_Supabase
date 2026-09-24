// Shared CRM Name access-control helper, used identically across every
// stage page's Pending/History lists.
//
// admin: sees everything, unrestricted (same as page access).
// user: only sees rows whose crmName is in their assignedCrmNames — rows
//       with no crmName at all still show (nothing to restrict on).
export interface CrmAccessUser {
  role?: string
  assignedCrmNames?: string[]
}

export function filterByCrmAccess<T extends { crmName?: string }>(rows: T[], currentUser: CrmAccessUser | null | undefined): T[] {
  if (!currentUser || currentUser.role === "admin") return rows

  const allowed = new Set(currentUser.assignedCrmNames || [])
  return rows.filter((row) => !row.crmName || allowed.has(row.crmName))
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
