import { NextResponse, type NextRequest } from "next/server"
import { readSessionFromRequest } from "@/lib/session"

// Gate for every /api/otp-supabase/* route: no valid signed session cookie
// (set at login, lib/session.ts) -> 401, before the route runs. Before this
// the API was open to anyone who could reach the server.
//
// Not covered here, on purpose:
//   * /api/otp-supabase/users — it serves login/logout itself (the caller has
//     no cookie yet) and checks the session per action inside the route.
//   * the other /api/* routes (order-ingest, sheets-proxy, ...) — external
//     callers (Apps Script, webhooks) use them without a browser session.
//
// This only proves "a logged-in user is calling". What that user may see
// (CRM / location) is decided per request in lib/request-access.ts.
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  if (pathname === "/api/otp-supabase/users" || pathname.startsWith("/api/otp-supabase/users/")) return NextResponse.next()
  if (!readSessionFromRequest(request)) {
    return NextResponse.json({ success: false, error: "Not signed in" }, { status: 401 })
  }
  return NextResponse.next()
}

export const config = {
  matcher: ["/api/otp-supabase/:path*"],
}
