"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { Loader2, Search, X } from "lucide-react"
import { useAuth } from "@/components/auth-provider"
import { formatDateTime } from "@/lib/otp-utils"

// Stage key (otp_order_trace) -> the stage page and the user's assigned-step id for it.
const STAGES: Record<string, { href: string; step: string }> = {
  order_acceptable: { href: "/order-acceptable", step: "order-acceptable" },
  proforma_invoice: { href: "/proforma-invoice", step: "proforma-invoice" },
  delivery_note: { href: "/delivery-note", step: "delivery-note" },
  packing_list: { href: "/packing-list", step: "packing-list" },
  indent_creation: { href: "/indent-creation", step: "indent-creation" },
  pre_invoice: { href: "/pre-invoice", step: "pre-invoice" },
  delivery_note_for_invoice: { href: "/delivery-note-for-invoice", step: "delivery-note-for-invoice" },
  make_invoice: { href: "/make-invoice", step: "make-invoice" },
  calibration: { href: "/calibration", step: "calibration" },
  packaging_transport: { href: "/packaging-transport", step: "packaging-transport" },
  client_confirmation: { href: "/client-confirmation", step: "client-confirmation" },
}

// How long typing must pause before a search is sent.
const SEARCH_DEBOUNCE_MS = 700

interface Pending {
  stageKey: string
  stageLabel: string
  waveId: string | null
  invoiceNumber: string | null
  plannedAt: string | null
  overdue: boolean
  count: number
}
interface Completed {
  stageKey: string
  stageLabel: string
  at: string | null
  by: string | null
  invoiceNumber?: string | null
}
interface Wave {
  waveId: string
  invoiceNumber: string | null
  pending: { stageKey: string; stageLabel: string; overdue: boolean }[]
  lastCompleted: Completed | null
  complete: boolean
}
interface TraceOrder {
  orderId: string
  orderNo: string
  quotationNumber: string
  companyName: string
  cancelled: boolean
  pending: Pending[]
  lastCompleted: Completed | null
  waves: Wave[]
}

// Global search by Order No. / Quotation No. (Database/86): where each matching order is pending
// right now and what was completed last, per order and per wave. Live from the DB on every search.
export function GlobalSearch() {
  const { user } = useAuth()
  const [term, setTerm] = useState("")
  const [results, setResults] = useState<TraceOrder[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [open, setOpen] = useState(false)
  const boxRef = useRef<HTMLDivElement>(null)

  const canOpen = (stageKey: string) => {
    const step = STAGES[stageKey]?.step
    return !!step && (user?.role === "admin" || !!user?.assignedSteps?.includes("all") || !!user?.assignedSteps?.includes(step))
  }

  // Waits for a pause in typing (not one request per keystroke); Enter searches at once.
  // A newer keystroke cancels the request still in flight.
  const [submitTick, setSubmitTick] = useState(0)
  const submitNow = useRef(false)
  useEffect(() => {
    const enough = term.replace(/[^a-z0-9]/gi, "").length >= 3
    if (!enough) {
      setResults([])
      setError(null)
      setLoading(false)
      return
    }
    const controller = new AbortController()
    setLoading(true)
    const delay = submitNow.current ? 0 : SEARCH_DEBOUNCE_MS
    submitNow.current = false
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/otp-supabase/global-search?q=${encodeURIComponent(term.trim())}`, { signal: controller.signal })
        const json = await res.json()
        if (!json.success) throw new Error(json.error || "Search failed")
        setResults(json.data as TraceOrder[])
        setError(null)
        setLoading(false)
      } catch (e) {
        if ((e as Error).name === "AbortError") return
        setError(e instanceof Error ? e.message : "Search failed")
        setLoading(false)
      }
    }, delay)
    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [term, submitTick])

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", onDown)
    return () => document.removeEventListener("mousedown", onDown)
  }, [])

  const stageLink = (o: TraceOrder, stageKey: string, label: string, tab: string, children: React.ReactNode, className: string) => {
    const meta = STAGES[stageKey]
    if (!meta || !canOpen(stageKey)) return <span className={`${className} cursor-not-allowed opacity-70`} title="You do not have access to this stage">{children}</span>
    return (
      <Link
        href={`${meta.href}?q=${encodeURIComponent(o.orderNo)}&tab=${tab}`}
        className={`${className} hover:border-primary hover:bg-accent`}
        title={`Open ${label}`}
        onClick={() => setOpen(false)}
      >
        {children}
      </Link>
    )
  }

  const enough = term.replace(/[^a-z0-9]/gi, "").length >= 3

  return (
    <div ref={boxRef} className="relative w-40 sm:w-64 lg:w-80">
      <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <input
        value={term}
        onChange={(e) => {
          setTerm(e.target.value)
          setOpen(true)
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === "Escape") setOpen(false)
          if (e.key === "Enter") {
            submitNow.current = true
            setSubmitTick((t) => t + 1)
          }
        }}
        placeholder="Search order / quotation no."
        aria-label="Search by order number or quotation number"
        className="h-9 w-full rounded-md border border-input bg-background pl-8 pr-8 text-sm outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
      />
      {loading ? (
        <Loader2 className="absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
      ) : term ? (
        <button type="button" aria-label="Clear search" onClick={() => setTerm("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
          <X className="h-4 w-4" />
        </button>
      ) : null}

      {open && term && (
        <div className="absolute right-0 z-50 mt-1.5 max-h-[70vh] w-[min(94vw,36rem)] overflow-y-auto rounded-lg border bg-popover p-2 text-popover-foreground shadow-lg">
          {!enough && <p className="px-2 py-3 text-xs text-muted-foreground">Type at least 3 letters or digits.</p>}
          {enough && error && <p className="px-2 py-3 text-xs text-destructive">{error}</p>}
          {enough && !error && !loading && results.length === 0 && <p className="px-2 py-3 text-xs text-muted-foreground">No order or quotation matches “{term}”.</p>}

          {results.map((o) => (
            <div key={o.orderId} className="mb-2 rounded-md border bg-card p-3 last:mb-0">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                <span className="text-sm font-semibold">{o.orderNo}</span>
                <span className="text-xs text-muted-foreground">{o.quotationNumber}</span>
                {o.cancelled && <span className="rounded bg-destructive/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-destructive">Cancelled</span>}
              </div>
              <p className="truncate text-xs text-muted-foreground">{o.companyName}</p>

              <div className="mt-2 space-y-1.5 text-xs">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="w-24 shrink-0 font-medium text-muted-foreground">Pending in</span>
                  {o.pending.length === 0 ? (
                    <span className="text-muted-foreground">Nothing pending</span>
                  ) : (
                    o.pending.map((p, i) =>
                      stageLink(
                        o,
                        p.stageKey,
                        p.stageLabel,
                        p.stageLabel.includes("Material Received") ? "material-received" : "pending",
                        <>
                          {p.stageLabel}
                          {p.count > 1 ? ` ×${p.count}` : ""}
                          {p.invoiceNumber ? ` · ${p.invoiceNumber}` : ""}
                          {p.overdue && <span className="ml-1 font-semibold text-destructive">overdue</span>}
                        </>,
                        `inline-flex items-center rounded border px-2 py-0.5 ${p.overdue ? "border-destructive/40 bg-destructive/5" : "bg-muted/40"}`
                      )
                    ).map((el, i) => <span key={i}>{el}</span>)
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="w-24 shrink-0 font-medium text-muted-foreground">Last completed</span>
                  {o.lastCompleted ? (
                    stageLink(
                      o,
                      o.lastCompleted.stageKey,
                      o.lastCompleted.stageLabel,
                      "history",
                      <>
                        {o.lastCompleted.stageLabel}
                        {o.lastCompleted.at ? ` · ${formatDateTime(o.lastCompleted.at)}` : ""}
                        {o.lastCompleted.by ? ` · ${o.lastCompleted.by}` : ""}
                      </>,
                      "inline-flex items-center rounded border bg-muted/40 px-2 py-0.5"
                    )
                  ) : (
                    <span className="text-muted-foreground">Nothing completed yet</span>
                  )}
                </div>
              </div>

              {o.waves.length > 0 && (
                <div className="mt-2 border-t pt-2">
                  <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Waves ({o.waves.length})</p>
                  <div className="space-y-1">
                    {o.waves.map((w, i) => (
                      <div key={w.waveId} className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs">
                        <span className="w-20 shrink-0 font-medium">{w.invoiceNumber || `Wave ${i + 1}`}</span>
                        {w.complete ? (
                          <span className="rounded bg-success/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-success">Completed</span>
                        ) : (
                          <span className="text-muted-foreground">
                            Pending: {w.pending.map((p) => p.stageLabel + (p.overdue ? " (overdue)" : "")).join(", ") || "—"}
                          </span>
                        )}
                        {w.lastCompleted && (
                          <span className="text-muted-foreground">
                            · last: {w.lastCompleted.stageLabel}
                            {w.lastCompleted.at ? ` (${formatDateTime(w.lastCompleted.at)})` : ""}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
