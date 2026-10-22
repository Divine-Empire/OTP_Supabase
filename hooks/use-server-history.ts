"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { ALL_LOCATIONS } from "@/lib/locations"

// Client half of a server-paged History tab (server half: lib/history-filters.ts).
// The caller owns the UI state (page, page size, search, CRM and extra filters) and
// hands it in; this hook turns it into one request per change and returns that page.
//
//   const history = useServerHistory({ url, map, active: currentTab === "history", page, pageSize,
//                                      search, crmName, extra, currentUser })
//
// - Lazy: nothing is fetched until `active` has been true once, or reload() is called
//   (e.g. after a submit made from the Pending tab).
// - Search is debounced (350 ms); stale responses are dropped.
// - Restricted users (role != admin) send their CRM names / location so the server
//   applies the same rules as lib/access.ts filterByAccess.
export interface UseServerHistoryOptions<T> {
  url?: string // e.g. "/api/otp-supabase/calibration?status=history"; omit to disable
  map?: (row: any) => T
  active: boolean
  page: number
  pageSize: number
  search?: string
  crmName?: string // "all" / "" = no filter
  extra?: Record<string, string> // extra equality filters, query-param name -> value
  currentUser?: { role?: string; assignedCrmNames?: string[]; location?: string | null } | null
}

export function useServerHistory<T = any>({
  url,
  map,
  active,
  page,
  pageSize,
  search = "",
  crmName = "all",
  extra,
  currentUser,
}: UseServerHistoryOptions<T>) {
  const [rows, setRows] = useState<T[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [facets, setFacets] = useState<Record<string, string[]>>({})
  const [reloadKey, setReloadKey] = useState(0)
  const [wanted, setWanted] = useState(false)
  const runRef = useRef(0)
  const mapRef = useRef(map)
  useEffect(() => {
    mapRef.current = map
  })

  useEffect(() => {
    if (active) setWanted(true)
  }, [active])

  const [debouncedSearch, setDebouncedSearch] = useState("")
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 350)
    return () => clearTimeout(t)
  }, [search])

  const restricted = !!currentUser && currentUser.role !== "admin"
  const accessCrm = (currentUser?.assignedCrmNames || []).join("|")
  const accessLocation = restricted && currentUser?.location && currentUser.location !== ALL_LOCATIONS ? currentUser.location : ""
  const extraKey = JSON.stringify(extra || {})

  useEffect(() => {
    if (!url || !wanted) return
    const run = ++runRef.current // a newer request supersedes this one
    const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) })
    if (debouncedSearch) params.set("search", debouncedSearch)
    if (crmName && crmName !== "all") params.set("crmName", crmName)
    for (const [k, v] of Object.entries(JSON.parse(extraKey) as Record<string, string>)) if (v && v !== "all") params.set(k, v)
    if (restricted) {
      params.set("restricted", "1")
      if (accessCrm) params.set("crmNames", accessCrm)
      if (accessLocation) params.set("location", accessLocation)
    }
    setLoading(true)
    setError(null)
    fetch(`${url}${url.includes("?") ? "&" : "?"}${params.toString()}`)
      .then((r) => r.json())
      .then((json) => {
        if (run !== runRef.current) return
        if (!json.success) throw new Error(json.error || "Failed to load")
        setRows((json.data || []).map((r: any) => (mapRef.current ? mapRef.current(r) : r)))
        setTotal(json.total ?? 0)
        if (json.facets) setFacets(json.facets)
      })
      .catch((err) => {
        if (run === runRef.current) setError(err.message || "Failed to load")
      })
      .finally(() => {
        if (run === runRef.current) setLoading(false)
      })
  }, [url, wanted, page, pageSize, debouncedSearch, crmName, extraKey, restricted, accessCrm, accessLocation, reloadKey])

  const reload = useCallback(() => {
    setWanted(true)
    setReloadKey((k) => k + 1)
  }, [])

  return { rows, total, loading, error, facets, reload }
}
