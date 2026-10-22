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
  isAdmin: boolean
  restricted: boolean
  crmNames: string[]
  location: string // "" = no location filter
}

// Fail closed: no session, unknown or disabled user -> restricted to rows that
// carry no CRM and no location.
const DENIED: RequestAccess = { userId: null, isAdmin: false, restricted: true, crmNames: [], location: "" }

export async function requestAccess(request: Request): Promise<RequestAccess> {
  const session = readSessionFromRequest(request)
  if (!session) return DENIED
  const { data: user } = await getSupabaseAdmin()
    .from("otp_users")
    .select("role, is_active, assigned_crm_names, location")
    .eq("id", session.uid)
    .maybeSingle()
  if (!user || !user.is_active) return DENIED
  if (user.role === "admin") return { userId: session.uid, isAdmin: true, restricted: false, crmNames: [], location: "" }
  const location = user.location && user.location !== ALL_LOCATIONS ? user.location : ""
  return { userId: session.uid, isAdmin: false, restricted: true, crmNames: user.assigned_crm_names || [], location }
}

// For endpoints that scope by location (pending-counts, dashboard): a restricted
// user is pinned to their own location; an admin may pass ?location= to narrow the view.
export function scopeLocation(access: RequestAccess, requested: string | null): string | null {
  if (access.restricted) return access.location || null
  return requested || null
}
