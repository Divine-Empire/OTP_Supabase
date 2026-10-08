import { createHmac, timingSafeEqual } from "crypto"

// Minimal server-verifiable session: an HMAC-signed httpOnly cookie set at
// login. The client-side user object (localStorage) can be edited by
// anyone, so anything sensitive must be gated on this cookie instead.
// Server-only — never import from a "use client" file.
export const SESSION_COOKIE = "otp_session"
export const SESSION_MAX_AGE_SECONDS = 30 * 24 * 60 * 60

interface SessionPayload {
  uid: string
  role: string
  exp: number
}

// Dedicated secret if configured; otherwise the service-role key, which is
// already a required server-only secret, so no new deploy config is needed.
function secret(): string {
  const s = process.env.OTP_SESSION_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!s) throw new Error("No session signing secret configured")
  return s
}

function sign(data: string): string {
  return createHmac("sha256", secret()).update(data).digest("base64url")
}

export function createSessionToken(uid: string, role: string): string {
  const payload: SessionPayload = { uid, role, exp: Date.now() + SESSION_MAX_AGE_SECONDS * 1000 }
  const data = Buffer.from(JSON.stringify(payload)).toString("base64url")
  return `${data}.${sign(data)}`
}

export function readSessionToken(token: string | undefined | null): SessionPayload | null {
  if (!token) return null
  const [data, sig] = token.split(".")
  if (!data || !sig) return null
  const expected = Buffer.from(sign(data))
  const given = Buffer.from(sig)
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null
  try {
    const payload = JSON.parse(Buffer.from(data, "base64url").toString()) as SessionPayload
    return payload.exp > Date.now() ? payload : null
  } catch {
    return null
  }
}

export function readSessionFromRequest(request: Request): SessionPayload | null {
  const cookie = request.headers.get("cookie") || ""
  const match = cookie.split(/;\s*/).find((c) => c.startsWith(`${SESSION_COOKIE}=`))
  return readSessionToken(match ? decodeURIComponent(match.slice(SESSION_COOKIE.length + 1)) : null)
}
