"use client"

import { useEffect, useMemo, useState } from "react"
import { Download } from "lucide-react"
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
  if (value === null || value === undefined) return <span className="text-slate-300">-</span>
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
  const header = ["Order No.", "Order Acceptable", ...STAGE_COLUMNS.map((c) => c.label), "Total Delay", "Total Delay (minutes)"]
  const lines = [header.map((h) => csvCell(h)).join(",")]
  for (const row of rows) {
    const cells = [
      csvCell(row.orderNo, true),
      csvCell(formatStamp(row.orderAcceptableAt)),
      ...STAGE_COLUMNS.map((c) => {
        const v = row[c.key] as number | null
        return csvCell(v === null || v === undefined ? "-" : formatDelay(v))
      }),
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

  const rows = useMemo(() => data?.rows ?? [], [data])

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
        <div className="flex items-start justify-between gap-4">
          <CardTitle>Delay Report</CardTitle>
          <Button variant="outline" size="sm" onClick={handleExport} disabled={loading || rows.length === 0} className="gap-2">
            <Download className="h-4 w-4" />
            Export
          </Button>
        </div>
        <div className="flex flex-wrap items-end gap-3 pt-2">
          <div className="space-y-1">
            <Label htmlFor="delay-from" className="text-xs text-muted-foreground">From</Label>
            <Input id="delay-from" type="date" className="h-8 w-40" value={from} max={to || undefined} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="delay-to" className="text-xs text-muted-foreground">To</Label>
            <Input id="delay-to" type="date" className="h-8 w-40" value={to} min={from || undefined} onChange={(e) => setTo(e.target.value)} />
          </div>
          {rangeInvalid && <p className="text-xs text-rose-600 pb-2">Pick a valid date range.</p>}
        </div>
      </CardHeader>

      <CardContent className="flex-1 space-y-4">
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-lg border bg-slate-50 p-3">
            <p className="text-xs text-muted-foreground">Orders</p>
            <p className="text-xl font-bold text-slate-900" data-testid="delay-orders">{data ? num(data.summary.orders) : "-"}</p>
          </div>
          <div className="rounded-lg border bg-slate-50 p-3">
            <p className="text-xs text-muted-foreground">Total Summative Delay</p>
            <p className="text-xl font-bold text-slate-900" data-testid="delay-total" title={data ? `${num(data.summary.totalDelay)} minutes` : undefined}>
              {data ? formatDelay(data.summary.totalDelay) : "-"}
            </p>
            <p className="text-[11px] text-muted-foreground">sum of every order's total</p>
          </div>
          <div className="rounded-lg border bg-slate-50 p-3">
            <p className="text-xs text-muted-foreground">Average Delay</p>
            <p className="text-xl font-bold text-indigo-600" data-testid="delay-average" title={data ? `${num(data.summary.averageDelay)} minutes` : undefined}>
              {data ? formatDelay(data.summary.averageDelay) : "-"}
            </p>
            <p className="text-[11px] text-muted-foreground">per order</p>
          </div>
        </div>

        {error ? (
          <p className="text-sm text-rose-600">{error}</p>
        ) : loading && !data ? (
          <p className="text-sm text-muted-foreground">Loading delay report...</p>
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">No orders were processed through Packaging and Dispatch in this period.</p>
        ) : (
          <div className={`max-h-[32rem] overflow-auto rounded-lg border ${loading ? "opacity-60" : ""}`}>
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-slate-50">
                <TableRow>
                  <TableHead className="sticky left-0 z-20 h-auto min-w-[5rem] bg-slate-50 px-2 py-2 text-xs">Order No.</TableHead>
                  <TableHead className="h-auto min-w-[8.5rem] whitespace-nowrap px-2 py-2 text-right text-xs">Order Acceptable</TableHead>
                  {STAGE_COLUMNS.map((col) => (
                    <TableHead key={col.key} className="h-auto min-w-[5.5rem] whitespace-normal px-2 py-2 text-right text-xs leading-tight">
                      {col.label}
                    </TableHead>
                  ))}
                  <TableHead className="sticky right-0 z-20 h-auto min-w-[6.5rem] whitespace-nowrap border-l bg-slate-100 px-2 py-2 text-right text-xs font-bold text-slate-900">
                    Total Delay
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.orderId}>
                    <TableCell className="sticky left-0 z-10 bg-white px-2 py-2 text-sm font-medium whitespace-nowrap" title={row.companyName}>
                      {row.orderNo}
                    </TableCell>
                    <TableCell className="whitespace-nowrap px-2 py-2 text-right text-sm tabular-nums" title={row.orderAcceptableAt ?? undefined}>
                      {formatStamp(row.orderAcceptableAt)}
                    </TableCell>
                    {STAGE_COLUMNS.map((col) => (
                      <TableCell key={col.key} className="whitespace-nowrap px-2 py-2 text-right text-sm tabular-nums">
                        <Delay value={row[col.key] as number | null} />
                      </TableCell>
                    ))}
                    <TableCell className="sticky right-0 z-10 whitespace-nowrap border-l bg-slate-50 px-2 py-2 text-right text-sm font-semibold tabular-nums">
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
