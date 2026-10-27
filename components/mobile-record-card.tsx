"use client"

import { useState, type ReactNode } from "react"
import { ChevronDown, ChevronUp } from "lucide-react"

export interface RecordCardColumn {
  key: string
  label: string
}

// Mobile-friendly alternative to the wide, horizontally-scrolling tables used
// across the pending/history tabs (Order Acceptable, Check Inventory,
// Pre-Invoice, Packing List, ...). Reuses each page's own column list +
// renderCellContent so a card shows exactly the same data/formatting the
// desktop table does, just laid out as label/value rows instead of columns.
// The "actions" column (Process/View Items buttons etc.) is pulled to the
// top of the card since it's the primary thing to tap on mobile.
//
// Collapsed by default to just `previewCount` fields — a record with a dozen
// visible columns (addresses, payment terms, ...) would otherwise make each
// card tall enough that only one or two fit on screen at a time, forcing a
// lot of scrolling just to find the right order. "Show more" reveals the
// rest in place, so the list stays scannable but nothing is ever hidden.
export function MobileRecordCard({
  columns,
  visibleColumns,
  record,
  renderCellContent,
  previewCount = 5,
  pinnedKeys = [],
}: {
  columns: RecordCardColumn[]
  visibleColumns: Record<string, boolean>
  record: any
  renderCellContent: (record: any, columnKey: string) => ReactNode
  previewCount?: number
  // Button-style columns shown in the top action row next to "actions"
  // instead of among the label/value fields (and so never hidden behind "Show more").
  pinnedKeys?: string[]
}) {
  const [expanded, setExpanded] = useState(false)

  const visible = columns.filter((col) => visibleColumns[col.key])
  const actionsColumn = visible.find((col) => col.key === "actions")
  const pinnedColumns = visible.filter((col) => pinnedKeys.includes(col.key))
  const topColumns = [...pinnedColumns, ...(actionsColumn ? [actionsColumn] : [])]
  const fieldColumns = visible.filter((col) => col.key !== "actions" && !pinnedKeys.includes(col.key))

  const renderedFields = fieldColumns
    .map((col) => ({ col, value: renderCellContent(record, col.key) }))
    .filter(({ value }) => value !== "" && value !== null && value !== undefined)

  const hasMore = renderedFields.length > previewCount
  const shownFields = expanded ? renderedFields : renderedFields.slice(0, previewCount)

  return (
    <div className="rounded-lg border bg-white p-4 space-y-3 shadow-sm">
      {topColumns.length > 0 && (
        <div className="flex flex-wrap justify-end gap-2 pb-2 border-b">
          {topColumns.map((col) => (
            <div key={col.key}>{renderCellContent(record, col.key)}</div>
          ))}
        </div>
      )}
      <dl className="space-y-2">
        {shownFields.map(({ col, value }) => (
          <div key={col.key} className="flex items-start justify-between gap-3 text-sm">
            <dt className="text-muted-foreground shrink-0">{col.label}</dt>
            <dd className="text-right font-medium break-words min-w-0">{value}</dd>
          </div>
        ))}
      </dl>
      {hasMore && (
        <button
          type="button"
          onClick={() => setExpanded((e) => !e)}
          className="w-full flex items-center justify-center gap-1 pt-2 border-t text-xs font-semibold text-primary"
        >
          {expanded ? (
            <>
              Show less <ChevronUp className="h-3.5 w-3.5" />
            </>
          ) : (
            <>
              Show {renderedFields.length - previewCount} more <ChevronDown className="h-3.5 w-3.5" />
            </>
          )}
        </button>
      )}
    </div>
  )
}
