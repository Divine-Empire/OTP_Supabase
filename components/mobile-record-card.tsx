"use client"

import type { ReactNode } from "react"

export interface RecordCardColumn {
  key: string
  label: string
}

// Mobile-friendly alternative to the wide, horizontally-scrolling tables used
// across the pending/history tabs (Order Acceptable, Check Inventory,
// Pre-Invoice, ...). Reuses each page's own column list + renderCellContent
// so a card shows exactly the same data/formatting the desktop table does,
// just laid out as label/value rows instead of columns. The "actions"
// column (Process/View Items buttons etc.) is pulled to the top of the card
// since it's the primary thing to tap on mobile.
export function MobileRecordCard({
  columns,
  visibleColumns,
  record,
  renderCellContent,
}: {
  columns: RecordCardColumn[]
  visibleColumns: Record<string, boolean>
  record: any
  renderCellContent: (record: any, columnKey: string) => ReactNode
}) {
  const visible = columns.filter((col) => visibleColumns[col.key])
  const actionsColumn = visible.find((col) => col.key === "actions")
  const fieldColumns = visible.filter((col) => col.key !== "actions")

  return (
    <div className="rounded-lg border bg-white p-4 space-y-3 shadow-sm">
      {actionsColumn && (
        <div className="flex justify-end pb-2 border-b">{renderCellContent(record, actionsColumn.key)}</div>
      )}
      <dl className="space-y-2">
        {fieldColumns.map((col) => {
          const value = renderCellContent(record, col.key)
          if (value === "" || value === null || value === undefined) return null
          return (
            <div key={col.key} className="flex items-start justify-between gap-3 text-sm">
              <dt className="text-muted-foreground shrink-0">{col.label}</dt>
              <dd className="text-right font-medium break-words min-w-0">{value}</dd>
            </div>
          )
        })}
      </dl>
    </div>
  )
}
