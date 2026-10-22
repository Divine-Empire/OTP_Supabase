"use client"

import { useState, useMemo, useCallback } from "react"
import { filterByAccess, crmNameOptionsFrom } from "@/lib/access"
import { useServerHistory } from "@/hooks/use-server-history"

// Shared list state for the stage pages (Pending / History tabs): search, CRM
// filter, optional extra select filters, filter chips, column visibility and
// History paging. Everything here is client-side over the rows the page has
// already fetched; fetching and the Pending/History loaders stay in the page.
//
// Call it AFTER `const { user: currentUser } = useAuth()` and BEFORE any
// early `return` (it is a hook).

export interface ColumnDef {
  key: string
  label: string
  searchable?: boolean
}

export interface ExtraFilterDef {
  key: string // state key, also the chip key
  label: string // chip label prefix, e.g. "Type" -> "Type: X"
  field: string // row property compared with ===
}

// History fetched one page at a time from a server-paged route (lib/history-filters.ts):
// search / CRM / extra filters / access rules run in SQL, only the current page is sent.
export interface ServerHistoryOptions {
  url: string // e.g. "/api/otp-supabase/calibration?status=history"
  map: (row: any) => any
}

export interface UseStageListOptions<T = any> {
  pendingRows: T[]
  // Client-side History rows (all fetched up front). Omit when using serverHistory.
  historyRows?: T[]
  serverHistory?: ServerHistoryOptions
  pendingColumns: ColumnDef[]
  historyColumns: ColumnDef[]
  currentUser: any
  defaultPageSize?: number
  // Columns hidden until the user turns them on in Column Visibility.
  defaultHiddenColumns?: Set<string>
  // Extra "all"-defaulted select filters (e.g. calibration type).
  extraFilters?: ExtraFilterDef[]
  // Show a "Search: ..." chip next to the filter chips.
  searchChip?: boolean
}

const matchesSearch = (row: any, cols: ColumnDef[], term: string) => {
  const t = term.toLowerCase()
  return cols.some((c) => c.searchable && String(row[c.key] || "").toLowerCase().includes(t))
}

export function useStageList<T extends Record<string, any>>({
  pendingRows,
  historyRows: clientHistoryRows = [],
  serverHistory,
  pendingColumns,
  historyColumns,
  currentUser,
  defaultPageSize = 50,
  defaultHiddenColumns,
  extraFilters = [],
  searchChip = false,
}: UseStageListOptions<T>) {
  const [currentTab, setCurrentTab] = useState<string>("pending")
  const [searchTerm, setSearchTermRaw] = useState("")
  const [crmNameFilter, setCrmNameFilterRaw] = useState("all")
  const [extraValues, setExtraValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(extraFilters.map((f) => [f.key, "all"]))
  )
  const [historyPage, setHistoryPage] = useState(1)
  const [historyPageSize, setHistoryPageSize] = useState(defaultPageSize)

  const initialVisibility = (cols: ColumnDef[]) =>
    cols.reduce<Record<string, boolean>>((acc, c) => ({ ...acc, [c.key]: !defaultHiddenColumns?.has(c.key) }), {})
  const [visiblePendingColumns, setVisiblePendingColumns] = useState(() => initialVisibility(pendingColumns))
  const [visibleHistoryColumns, setVisibleHistoryColumns] = useState(() => initialVisibility(historyColumns))

  // Any filter change starts over at page 1 (done in the setter, not an effect, so a
  // server-paged History makes one request, not a stale-page one plus a corrected one).
  const setSearchTerm = useCallback((v: string) => {
    setSearchTermRaw(v)
    setHistoryPage(1)
  }, [])
  const setCrmNameFilter = useCallback((v: string) => {
    setCrmNameFilterRaw(v)
    setHistoryPage(1)
  }, [])
  const setExtraFilter = useCallback((key: string, value: string) => {
    setExtraValues((prev) => ({ ...prev, [key]: value }))
    setHistoryPage(1)
  }, [])

  // ---- server-paged History (hooks/use-server-history.ts) -------------------
  const isServer = !!serverHistory
  const sh = useServerHistory<T>({
    url: serverHistory?.url,
    map: serverHistory?.map,
    active: currentTab === "history",
    page: historyPage,
    pageSize: historyPageSize,
    search: searchTerm,
    crmName: crmNameFilter,
    extra: extraValues,
  })
  const serverRows = sh.rows
  const serverTotal = sh.total
  const facets = sh.facets
  const reloadHistory = sh.reload
  const historyRows = serverHistory ? serverRows : clientHistoryRows

  // CRM options: CRMs of the Pending rows the user may see, plus every CRM in the whole History (server facet).
  const visiblePending = useMemo(() => filterByAccess(pendingRows, currentUser), [pendingRows, currentUser])
  const crmNameOptions = useMemo(
    () => Array.from(new Set([...crmNameOptionsFrom(visiblePending), ...(facets.crmName || [])])).sort(),
    [visiblePending, facets]
  )

  // Options for an extra filter: every distinct value across BOTH tabs' raw rows.
  const extraOptions = useMemo(() => {
    const out: Record<string, string[]> = {}
    for (const f of extraFilters) {
      const set = new Set<string>()
      for (const row of [...pendingRows, ...historyRows]) {
        const v = (row as any)[f.field]
        if (v) set.add(v)
      }
      for (const v of facets[f.key] || []) set.add(v)
      out[f.key] = Array.from(set).sort()
    }
    return out
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingRows, historyRows, facets])

  const applyFilters = useCallback(
    (rows: T[], cols: ColumnDef[]) => {
      let filtered = filterByAccess(rows, currentUser)
      if (crmNameFilter !== "all") filtered = filtered.filter((r) => r.crmName === crmNameFilter)
      for (const f of extraFilters) {
        const v = extraValues[f.key]
        if (v && v !== "all") filtered = filtered.filter((r) => r[f.field] === v)
      }
      if (searchTerm) filtered = filtered.filter((r) => matchesSearch(r, cols, searchTerm))
      return filtered
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [currentUser, crmNameFilter, extraValues, searchTerm]
  )

  const filteredPendingRows = useMemo(() => applyFilters(pendingRows, pendingColumns), [applyFilters, pendingRows, pendingColumns])
  // Server-paged History arrives already filtered and paged; client-side History is filtered here.
  const filteredHistoryRows = useMemo(
    () => (isServer ? historyRows : applyFilters(historyRows, historyColumns)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [applyFilters, historyRows, historyColumns, isServer]
  )

  const historyTotal = serverHistory ? serverTotal : filteredHistoryRows.length
  const historyTotalPages = Math.ceil(historyTotal / historyPageSize) || 1
  const historyPageRows = useMemo(
    () =>
      isServer ? filteredHistoryRows : filteredHistoryRows.slice((historyPage - 1) * historyPageSize, historyPage * historyPageSize),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [filteredHistoryRows, historyPage, historyPageSize, isServer]
  )

  const tabs = useMemo(
    () => [
      { id: "pending", label: "Pending", count: filteredPendingRows.length },
      { id: "history", label: "History", count: historyTotal },
    ],
    [filteredPendingRows.length, historyTotal]
  )

  const activeChips = useMemo(() => {
    const chips: { key: string; label: string; onRemove: () => void }[] = []
    if (searchChip && searchTerm) {
      chips.push({ key: "search", label: `Search: ${searchTerm}`, onRemove: () => setSearchTerm("") })
    }
    if (crmNameFilter !== "all") {
      chips.push({ key: "crm", label: `CRM: ${crmNameFilter}`, onRemove: () => setCrmNameFilter("all") })
    }
    for (const f of extraFilters) {
      const v = extraValues[f.key]
      if (v && v !== "all") {
        chips.push({ key: f.key, label: `${f.label}: ${v}`, onRemove: () => setExtraFilter(f.key, "all") })
      }
    }
    return chips
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchChip, searchTerm, crmNameFilter, extraValues, setExtraFilter])

  const handleClearAllFilters = useCallback(() => {
    setSearchTerm("")
    setCrmNameFilter("all")
    setExtraValues(Object.fromEntries(extraFilters.map((f) => [f.key, "all"])))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Column Visibility panel for whichever tab is active. "Hide all" keeps the
  // Pending Actions column (the only way to open a row); History hides all.
  const columnPanel = useMemo(() => {
    if (currentTab === "pending") {
      return {
        columns: pendingColumns,
        visible: visiblePendingColumns,
        toggle: (key: string) => setVisiblePendingColumns((prev) => ({ ...prev, [key]: !prev[key] })),
        showAll: () => setVisiblePendingColumns(pendingColumns.reduce((acc, c) => ({ ...acc, [c.key]: true }), {})),
        hideAll: () =>
          setVisiblePendingColumns(pendingColumns.reduce((acc, c) => ({ ...acc, [c.key]: c.key === "actions" }), {})),
      }
    }
    return {
      columns: historyColumns,
      visible: visibleHistoryColumns,
      toggle: (key: string) => setVisibleHistoryColumns((prev) => ({ ...prev, [key]: !prev[key] })),
      showAll: () => setVisibleHistoryColumns(historyColumns.reduce((acc, c) => ({ ...acc, [c.key]: true }), {})),
      hideAll: () => setVisibleHistoryColumns(historyColumns.reduce((acc, c) => ({ ...acc, [c.key]: false }), {})),
    }
  }, [currentTab, pendingColumns, historyColumns, visiblePendingColumns, visibleHistoryColumns])

  const activeColumns = useMemo(
    () => columnPanel.columns.filter((c) => columnPanel.visible[c.key]),
    [columnPanel]
  )

  const activeRows = currentTab === "pending" ? filteredPendingRows : historyPageRows

  return {
    currentTab,
    setCurrentTab,
    tabs,
    searchTerm,
    setSearchTerm,
    crmNameFilter,
    setCrmNameFilter,
    crmNameOptions,
    extraValues,
    setExtraFilter,
    extraOptions,
    activeChips,
    handleClearAllFilters,
    filteredPendingRows,
    filteredHistoryRows,
    historyPage,
    setHistoryPage,
    historyPageSize,
    setHistoryPageSize,
    historyTotal,
    historyTotalPages,
    historyPageRows,
    history: { rows: serverRows, total: serverTotal, loading: sh.loading, error: sh.error, reload: reloadHistory },
    columnPanel,
    activeColumns,
    activeRows,
  }
}
