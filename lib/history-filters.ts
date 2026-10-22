// Server half of the History tab's paging + filtering (hooks/use-stage-list.ts is
// the client half). A History route reads ?page=&pageSize=&search=&crmName=
// &restricted=&crmNames=&location=&<extra filter> via parseHistoryParams, adds the
// filters with applyHistoryFilters and answers with pageJson.
//
// It queries a flat `otp_v_<stage>_history` view (Database/74+) rather than a table
// with embeds, because PostgREST cannot put an embedded column inside a top-level
// or=(...). Each view exposes: the stage row's columns, the same `"order"` (and other
// joined) JSON objects the old embed returned, plus flat `search_text` (lower-cased
// concat of the key searchable columns), `crm_name`, `order_location` and any
// stage-specific filter column.
import { NextResponse } from "next/server"

export const MAX_PAGE_SIZE = 200

export interface HistoryParams {
  page: number
  pageSize: number
  offset: number
  to: number
  search: string
  crmName: string // "" = no filter
  restricted: boolean // role=user: apply the access rules below
  crmNames: string[] // restricted users: CRMs they may see (rows with no CRM are always visible)
  location: string // restricted users with a location set; "" = no location filter
  extra: Record<string, string>
}

export interface HistoryFilterSpec {
  // ?<param>=value -> .eq(column, value), e.g. { calibrationType: "calibration_type" }
  extraEq?: Record<string, string>
  // The access rule is location-only for this list (Order Cancel log): skip the CRM part.
  skipCrmAccess?: boolean
}

export function parseHistoryParams(sp: URLSearchParams, extraKeys: string[] = []): HistoryParams {
  const pageSize = Math.min(Math.max(Number(sp.get("pageSize")) || 50, 1), MAX_PAGE_SIZE)
  const page = Math.max(Number(sp.get("page")) || 1, 1)
  const offset = (page - 1) * pageSize
  const extra: Record<string, string> = {}
  for (const k of extraKeys) {
    const v = sp.get(k)
    if (v && v !== "all") extra[k] = v
  }
  const crm = sp.get("crmName")
  return {
    page,
    pageSize,
    offset,
    to: offset + pageSize - 1,
    search: (sp.get("search") || "").trim(),
    crmName: crm && crm !== "all" ? crm : "",
    restricted: sp.get("restricted") === "1",
    crmNames: (sp.get("crmNames") || "").split("|").filter(Boolean),
    location: sp.get("location") || "",
    extra,
  }
}

// Values inside or=(...) / in.(...) are double-quoted so commas, parentheses and
// dots in the value can't break out of the expression.
const q = (v: string) => `"${v.replace(/[\\"]/g, "")}"`

// Loosely typed on purpose: supabase's builder generics make TS give up (TS2589) when constrained.
type AnyQuery = any

export function applyHistoryFilters(query: AnyQuery, p: HistoryParams, spec: HistoryFilterSpec = {}): AnyQuery {
  let out: AnyQuery = query
  if (p.crmName) out = out.eq("crm_name", p.crmName)
  // Same rule as lib/access.ts: a row with no CRM / no location is visible to everyone.
  if (p.restricted) {
    if (!spec.skipCrmAccess) {
      out = out.or(
        p.crmNames.length ? `crm_name.is.null,crm_name.in.(${p.crmNames.map(q).join(",")})` : "crm_name.is.null"
      )
    }
    if (p.location) out = out.or(`order_location.is.null,order_location.eq.${q(p.location)}`)
  }
  for (const [param, col] of Object.entries(spec.extraEq || {})) {
    if (p.extra[param]) out = out.eq(col, p.extra[param])
  }
  if (p.search) {
    // % and _ are LIKE wildcards; escape them so "5%" searches for the literal text.
    const term = p.search
      .toLowerCase()
      .replace(/\\/g, "")
      .replace(/[%_]/g, (m) => "\\" + m)
    out = out.ilike("search_text", `%${term}%`)
  }
  return out
}

export function pageJson(data: any[] | null, count: number | null, p: HistoryParams, extra: Record<string, unknown> = {}) {
  const rows = data || []
  const total = count ?? p.offset + rows.length
  return NextResponse.json({ success: true, data: rows, total, page: p.page, pageSize: p.pageSize, ...extra })
}
