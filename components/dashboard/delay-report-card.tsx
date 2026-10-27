"use client"

import { useEffect, useMemo, useState } from "react"
import { Download, Search } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useAuth } from "@/components/auth-provider"
import { ALL_LOCATIONS } from "@/lib/locations"

interface DelayRow {
  orderId: string
  orderNo: string
  companyName: string
  processedAt: string
  orderAcceptableAt: string | null
  packingList: number | null
  preInvoice: number | null
  makeInvoice: number | null
  packagingDispatch: number | null
  totalDelay: number
}

interface DelayReportData {
  from: string
  to: string
  rows: DelayRow[]
  summary: { orders: number; totalDelay: number; averageDelay: number }
}

// Every column after Order Acceptable is the time that stage took after the
// previous shown stage of the same order, in minutes (see
// Database/70_delay_report_stage_durations.sql and 71_delay_report_drop_stages.sql).
// Indent Creation is a shortage side-branch, not part of this chain.
const STAGE_COLUMNS: { key: keyof DelayRow; label: string }[] = [
  { key: "packingList", label: "Packing List" },
  { key: "preInvoice", label: "Pre-Invoice" },
  { key: "makeInvoice", label: "Make Invoice" },
  { key: "packagingDispatch", label: "Packaging and Dispatch" },
]

function istDate(offsetDays = 0): string {
  const d = new Date(Date.now() + offsetDays * 86_400_000)
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(d)
}

const num = (n: number) => n.toLocaleString("en-IN")

// "13/10/2026 17:54" (DD/MM/YYYY HH:MM, IST) — the Order Acceptable column.
function formatStamp(iso: string | null): string {
  if (!iso) return "-"
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(iso))
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? ""
  return `${get("day")}/${get("month")}/${get("year")} ${get("hour")}:${get("minute")}`
}

// Minutes -> "3d 2h 5m". Leading zero units are dropped ("2h 5m", "45m",
// "0m"); once there is a day, hours and minutes are always shown.
function formatDelay(total: number): string {
  const days = Math.floor(total / 1440)
  const hours = Math.floor((total % 1440) / 60)
  const minutes = total % 60
  if (days > 0) return `${days}d ${hours}h ${minutes}m`
  if (hours > 0) return `${hours}h ${minutes}m`
  return `${minutes}m`
}

function Delay({ value }: { value: number | null }) {
  if (value === null || value === undefined) return <span className="text-muted-foreground/40">-</span>
  return (
    <span title={`${num(value)} minutes`}>{formatDelay(value)}</span>
  )
}

// Same text the table shows (d/h/m, "-" for no data), plus one numeric
// minutes column so the file is usable in a spreadsheet. Excel needs the BOM
// to read UTF-8; a leading = + - @ in a TEXT cell is neutralised so an order
// number can never run as a formula.
function csvCell(value: string, isText = false): string {
  const safe = isText && /^[=+\-@\t\r]/.test(value) ? `'${value}` : value
  return /[",\r\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe
}

function buildDelayCsv(rows: DelayRow[]): string {
  const header = ["Order No.", "Order Acceptable", ...STAGE_COLUMNS.map((c) => c.label), "Packaging and Dispatch At", "Total Delay", "Total Delay (minutes)"]
  const lines = [header.map((h) => csvCell(h)).join(",")]
  for (const row of rows) {
    const cells = [
      csvCell(row.orderNo, true),
      csvCell(formatStamp(row.orderAcceptableAt)),
      ...STAGE_COLUMNS.map((c) => {
        const v = row[c.key] as number | null
        return csvCell(v === null || v === undefined ? "-" : formatDelay(v))
      }),
      csvCell(formatStamp(row.processedAt)),
      csvCell(formatDelay(row.totalDelay)),
      String(row.totalDelay),
    ]
    lines.push(cells.join(","))
  }
  return "\uFEFF" + lines.join("\r\n") + "\r\n"
}

export function DelayReportCard() {
  const { user } = useAuth()
  const location =
    user && user.role !== "admin" && user.location && user.location !== ALL_LOCATIONS ? user.location : ""

  const [from, setFrom] = useState(() => istDate(-6))
  const [to, setTo] = useState(() => istDate(0))
  const [data, setData] = useState<DelayReportData | null>(null)
  const [search, setSearch] = useState("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const rangeInvalid = !from || !to || from > to

  useEffect(() => {
    if (rangeInvalid) return
    let cancelled = false
    setLoading(true)
    setError(null)
    const query = new URLSearchParams({ from, to })
    if (location) query.set("location", location)
    fetch(`/api/otp-supabase/dashboard/delay-report?${query}`)
      .then((res) => res.json())
      .then((result) => {
        if (cancelled) return
        if (!result.success) throw new Error(result.error || "Failed to load delay report")
        setData(result.data)
      })
      .catch((err) => !cancelled && setError(err.message || "Failed to load delay report"))
      .finally(() => !cancelled && setLoading(false))
    return () => {
      cancelled = true
    }
  }, [from, to, location, rangeInvalid])

  // The order-number search narrows the table, the summary tiles and the export together.
  const rows = useMemo(() => {
    const all = data?.rows ?? []
    const q = search.trim().toLowerCase()
    return q ? all.filter((r) => r.orderNo.toLowerCase().includes(q)) : all
  }, [data, search])

  const summary = useMemo(() => {
    if (!data) return null
    if (!search.trim()) return data.summary
    const totalDelay = rows.reduce((sum, r) => sum + r.totalDelay, 0)
    return { orders: rows.length, totalDelay, averageDelay: rows.length ? Math.round(totalDelay / rows.length) : 0 }
  }, [data, rows, search])

  const handleExport = () => {
    if (!data || rows.length === 0) return
    const blob = new Blob([buildDelayCsv(rows)], { type: "text/csv;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `delay-report_${data.from}_to_${data.to}.csv`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }

  return (
    <Card className="flex flex-col">
      <CardHeader>
        {/* Title | search | filters in one row. The outer two flex equally so the search sits in the
            middle whenever there is room; the filter group never wraps, so Export stays on the date row. */}
        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          <CardTitle className="whitespace-nowrap md:flex-1">Delay Report</CardTitle>
          <div className="relative md:w-72 md:shrink md:min-w-[11rem]">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              aria-label="Search by order number"
              placeholder="Search order number"
              className="h-8 pl-8"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex flex-wrap items-center gap-2 md:flex-1 md:flex-nowrap md:justify-end">
            <Label htmlFor="delay-from" className="text-xs text-muted-foreground">From</Label>
            <Input id="delay-from" type="date" className="h-8 w-36 shrink-0" value={from} max={to || undefined} onChange={(e) => setFrom(e.target.value)} />
            <Label htmlFor="delay-to" className="text-xs text-muted-foreground">To</Label>
            <Input id="delay-to" type="date" className="h-8 w-36 shrink-0" value={to} min={from || undefined} onChange={(e) => setTo(e.target.value)} />
            <Button variant="outline" size="sm" onClick={handleExport} disabled={loading || rows.length === 0} className="h-8 shrink-0 gap-2">
              <Download className="h-4 w-4" />
              Export
            </Button>
          </div>
        </div>
        {rangeInvalid && <p className="pt-1 text-xs text-destructive md:text-right">Pick a valid date range.</p>}
      </CardHeader>

      <CardContent className="flex-1 space-y-4">
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-lg border border-border bg-muted/40 p-3">
            <p className="text-xs text-muted-foreground">Orders</p>
            <p className="text-xl font-bold text-foreground tabular-nums" data-testid="delay-orders">{summary ? num(summary.orders) : "-"}</p>
          </div>
          <div className="rounded-lg border border-border bg-muted/40 p-3">
            <p className="text-xs text-muted-foreground">Total Summative Delay</p>
            <p className="text-xl font-bold text-foreground tabular-nums" data-testid="delay-total" title={data ? `${num(data.summary.totalDelay)} minutes` : undefined}>
              {summary ? formatDelay(summary.totalDelay) : "-"}
            </p>
            <p className="text-[11px] text-muted-foreground">sum of every order&apos;s total</p>
          </div>
          <div className="rounded-lg border border-border bg-muted/40 p-3">
            <p className="text-xs text-muted-foreground">Average Delay</p>
            <p className="text-xl font-bold text-primary tabular-nums" data-testid="delay-average" title={data ? `${num(data.summary.averageDelay)} minutes` : undefined}>
              {summary ? formatDelay(summary.averageDelay) : "-"}
            </p>
            <p className="text-[11px] text-muted-foreground">per order</p>
          </div>
        </div>

        {error ? (
          <p className="text-sm text-destructive">{error}</p>
        ) : loading && !data ? (
          <p className="text-sm text-muted-foreground">Loading delay report...</p>
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">{search.trim() ? "No orders match this search." : "No orders were processed through Packaging and Dispatch in this period."}</p>
        ) : (
          <div className={`rounded-lg border border-border ${loading ? "opacity-60" : ""}`}>
            <Table containerClassName="max-h-[32rem]" regionLabel="Delay report table">
              <TableHeader className="sticky top-0 z-10 bg-muted/80">
                <TableRow>
                  <TableHead className="sticky left-0 z-20 h-auto min-w-[5rem] bg-muted/80 px-2 py-2 text-xs">Order No.</TableHead>
                  <TableHead className="h-auto min-w-[8.5rem] whitespace-nowrap px-2 py-2 text-right text-xs">Order Acceptable</TableHead>
                  {STAGE_COLUMNS.map((col) => (
                    <TableHead key={col.key} className="h-auto min-w-[5.5rem] whitespace-normal px-2 py-2 text-right text-xs leading-tight">
                      {col.label}
                    </TableHead>
                  ))}
                  <TableHead className="sticky right-0 z-20 h-auto min-w-[6.5rem] whitespace-nowrap border-l border-border bg-muted/90 px-2 py-2 text-right text-xs font-bold text-foreground">
                    Total Delay
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.orderId}>
                    <TableCell className="sticky left-0 z-10 bg-card px-2 py-2 text-sm font-medium whitespace-nowrap" title={row.companyName}>
                      {row.orderNo}
                    </TableCell>
                    <TableCell className="whitespace-nowrap px-2 py-2 text-right text-sm tabular-nums" title={row.orderAcceptableAt ?? undefined}>
                      {formatStamp(row.orderAcceptableAt)}
                    </TableCell>
                    {STAGE_COLUMNS.map((col) => (
                      <TableCell key={col.key} className="whitespace-nowrap px-2 py-2 text-right text-sm tabular-nums">
                        <Delay value={row[col.key] as number | null} />
                        {col.key === "packagingDispatch" && (
                          <div className="text-[11px] font-normal leading-tight text-muted-foreground" title={row.processedAt}>
                            {formatStamp(row.processedAt)}
                          </div>
                        )}
                      </TableCell>
                    ))}
                    <TableCell className="sticky right-0 z-10 whitespace-nowrap border-l border-border bg-muted/30 px-2 py-2 text-right text-sm font-semibold tabular-nums">
                      <Delay value={row.totalDelay} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
