import { getSupabaseAdmin } from "@/lib/supabase"
import { readSessionFromRequest } from "@/lib/session"
import { ALL_LOCATIONS } from "@/lib/locations"

// Who is calling and what they may see — decided on the server from the signed
// session cookie, never from query params the browser can edit. The user row is
// re-read from the DB on every call, so a demoted / disabled / re-assigned user
// is affected immediately. Same rules as lib/access.ts (which only scopes the UI):
// admin is unrestricted; others see rows with no CRM / no location plus their own.
export interface RequestAccess {
  userId: string | null
  // Display name written to created_by / cancelled_by on writes. Always taken from the
  // session user's row — never from the request body, which the browser can edit.
  actorName: string | null
  isAdmin: boolean
  restricted: boolean
  crmNames: string[]
  location: string // "" = no location filter
}

// Fail closed: no session, unknown or disabled user -> restricted to rows that
// carry no CRM and no location.
const DENIED: RequestAccess = { userId: null, actorName: null, isAdmin: false, restricted: true, crmNames: [], location: "" }

export async function requestAccess(request: Request): Promise<RequestAccess> {
  const session = readSessionFromRequest(request)
  if (!session) return DENIED
  const { data: user } = await getSupabaseAdmin()
    .from("otp_users")
    .select("role, is_active, assigned_crm_names, location, full_name, username")
    .eq("id", session.uid)
    .maybeSingle()
  if (!user || !user.is_active) return DENIED
  const actorName = user.full_name || user.username || null
  if (user.role === "admin") return { userId: session.uid, actorName, isAdmin: true, restricted: false, crmNames: [], location: "" }
  const location = user.location && user.location !== ALL_LOCATIONS ? user.location : ""
  return { userId: session.uid, actorName, isAdmin: false, restricted: true, crmNames: user.assigned_crm_names || [], location }
}

// For endpoints that scope by location (pending-counts, dashboard): a restricted
// user is pinned to their own location; an admin may pass ?location= to narrow the view.
export function scopeLocation(access: RequestAccess, requested: string | null): string | null {
  if (access.restricted) return access.location || null
  return requested || null
}

// Pending lists are not paged and their views carry no CRM/location column of their own:
// each row embeds its order (`row.order.crm_name / order_location`) or, for views built on
// the order itself, carries them directly. Apply the same rule as lib/access.ts filterByAccess
// on the server so a restricted user cannot read other CRMs' / locations' pending rows by
// calling the API directly. A row with no CRM / no location stays visible to everyone.
export function scopeRowsByAccess<T>(rows: T[], access: RequestAccess): T[] {
  if (!access.restricted) return rows
  const allowedCrm = new Set(access.crmNames)
  return rows.filter((row) => {
    const r = row as any
    const crm = r?.order?.crm_name ?? r?.crm_name ?? r?.crmName ?? null
    const loc = r?.order?.order_location ?? r?.order_location ?? r?.orderLocation ?? null
    return (!crm || allowedCrm.has(crm)) && (!access.location || !loc || loc === access.location)
  })
}
