"use client";

import React, { useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { EmptyState, ErrorState, LoadingState } from "./table-states";
import { Button } from "@/components/ui/button";

export interface DataTableHeader {
  key: string;
  label: string;
  className?: string;
  minWidth?: string;
  align?: "left" | "center" | "right";
}

export interface DataTableProps<T> {
  headers: (DataTableHeader | string)[];
  data: T[];
  renderRow: (item: T, index: number) => React.ReactNode;
  renderCard?: (item: T, index: number) => React.ReactNode;
  keyExtractor?: (item: T, index: number) => string | number;
  minWidth?: string;
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  // Empty State
  emptyTitle?: string;
  emptyDescription?: string;
  emptyAction?: React.ReactNode;
  // Pagination Props
  simpleFooter?: boolean;
  currentPage?: number;
  totalPages?: number;
  itemsPerPage?: number;
  totalResults?: number;
  onPageChange?: (page: number) => void;
  onItemsPerPageChange?: (size: number) => void;
  itemsPerPageOptions?: number[];
  ariaLabel?: string;
  className?: string;
}

/**
 * DataTable: Standard enterprise data table for Divine Empire.
 * Features:
 * - Desktop sticky-header table with clean typography and hover states
 * - Optional mobile card grid fallback
 * - Integrated pagination and row-counter footer
 * - Built-in Loading, Empty, and Error states
 */
export function DataTable<T>({
  headers,
  data,
  renderRow,
  renderCard,
  keyExtractor = (_item, idx) => idx,
  minWidth = "100%",
  loading = false,
  error = null,
  onRetry,
  emptyTitle = "No records found",
  emptyDescription,
  emptyAction,
  simpleFooter = false,
  currentPage = 1,
  totalPages = 1,
  itemsPerPage = 50,
  totalResults,
  onPageChange,
  onItemsPerPageChange,
  itemsPerPageOptions = [25, 50, 100, 200],
  ariaLabel = "Data table",
  className = "",
}: DataTableProps<T>) {
  const tableContainerRef = useRef<HTMLDivElement>(null);
  const actualTotal = totalResults !== undefined ? totalResults : data.length;

  if (loading) {
    return (
      <div className={`flex flex-col flex-1 min-h-[320px] rounded-lg border border-border bg-card shadow-xs ${className}`}>
        <LoadingState />
      </div>
    );
  }

  if (error) {
    return (
      <div className={`flex flex-col flex-1 min-h-[320px] rounded-lg border border-border bg-card shadow-xs ${className}`}>
        <ErrorState message={error} onRetry={onRetry} />
      </div>
    );
  }

  const showEmpty = data.length === 0;

  return (
    <div
      className={`flex flex-col flex-1 min-h-0 w-full overflow-hidden rounded-lg border border-border bg-card shadow-xs ${className}`}
    >
      {/* Mobile Card View (shown below md breakpoint when renderCard provided) */}
      {renderCard && (
        <div
          role="region"
          aria-label={`${ariaLabel} (cards)`}
          tabIndex={0}
          className="md:hidden grid grid-cols-1 sm:grid-cols-2 gap-2.5 p-2.5 overflow-y-auto flex-1 bg-secondary/30 content-start"
        >
          {data.map((item, index) => (
            <React.Fragment key={keyExtractor(item, index)}>
              {renderCard(item, index)}
            </React.Fragment>
          ))}
          {showEmpty && (
            <div className="col-span-full">
              <EmptyState title={emptyTitle} description={emptyDescription} action={emptyAction} />
            </div>
          )}
        </div>
      )}

      {/* Desktop Table View */}
      <div className={`${renderCard ? "hidden md:flex" : "flex"} flex-col flex-1 min-h-0 overflow-hidden relative`}>
        <div
          ref={tableContainerRef}
          tabIndex={0}
          role="region"
          aria-label={ariaLabel ? `${ariaLabel} table scroll area` : "Data table scroll area"}
          className="overflow-auto flex-1 min-h-0 clean-scrollbar focus-visible:outline-none"
        >
          <table
            aria-label={ariaLabel}
            className="w-full relative border-separate border-spacing-0"
            style={{ minWidth }}
          >
            <thead className="sticky top-0 z-20 bg-secondary">
              <tr>
                {headers.map((header, index) => {
                  const label = typeof header === "object" ? header.label : header;
                  const customClass = typeof header === "object" ? header.className || "" : "";
                  const cellWidth = typeof header === "object" && header.minWidth ? header.minWidth : undefined;
                  const align = typeof header === "object" && header.align ? header.align : "left";

                  return (
                    <th
                      key={index}
                      scope="col"
                      style={{ minWidth: cellWidth }}
                      className={`whitespace-nowrap border-b border-border bg-secondary px-3.5 py-2.5 text-${align} text-xs font-semibold text-brand-800 tracking-wide select-none ${customClass}`}
                    >
                      {label}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody className="divide-y divide-border bg-card">
              {data.map((item, index) => (
                <React.Fragment key={keyExtractor(item, index)}>
                  {renderRow(item, index)}
                </React.Fragment>
              ))}
            </tbody>
          </table>

          {showEmpty && (
            <EmptyState title={emptyTitle} description={emptyDescription} action={emptyAction} />
          )}
        </div>
      </div>

      {/* Unified Pagination & Status Footer */}
      <div className="flex flex-col gap-2 border-t border-border bg-card px-3.5 py-2 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between shrink-0">
        {simpleFooter ? (
          <span className="whitespace-nowrap tabular-nums font-medium" aria-live="polite">
            {actualTotal} {actualTotal === 1 ? "record" : "records"}
          </span>
        ) : (
          <>
            <p className="tabular-nums font-medium" aria-live="polite">
              {actualTotal === 0
                ? "No records"
                : `Showing ${(currentPage - 1) * itemsPerPage + 1}–${Math.min(
                    currentPage * itemsPerPage,
                    actualTotal
                  )} of ${actualTotal}`}
            </p>

            <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 whitespace-nowrap">
              {onItemsPerPageChange && (
                <label className="flex items-center gap-1.5">
                  <span>Rows:</span>
                  <select
                    value={itemsPerPage}
                    onChange={(e) => onItemsPerPageChange(Number(e.target.value))}
                    className="h-7 w-[68px] rounded border border-input bg-card px-2 text-xs font-medium text-foreground focus:border-primary focus:outline-none"
                  >
                    {itemsPerPageOptions.map((val) => (
                      <option key={val} value={val}>
                        {val}
                      </option>
                    ))}
                  </select>
                </label>
              )}

              {onPageChange && (
                <>
                  <span className="tabular-nums font-medium">
                    Page {Math.min(currentPage, totalPages || 1)} of {totalPages || 1}
                  </span>
                  <div className="flex items-center gap-1">
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => onPageChange(currentPage - 1)}
                      disabled={currentPage <= 1}
                      aria-label="Previous page"
                      className="h-7 w-7 rounded border-input bg-card hover:bg-accent disabled:opacity-40"
                    >
                      <ChevronLeft size={14} aria-hidden="true" />
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => onPageChange(currentPage + 1)}
                      disabled={currentPage >= (totalPages || 1)}
                      aria-label="Next page"
                      className="h-7 w-7 rounded border-input bg-card hover:bg-accent disabled:opacity-40"
                    >
                      <ChevronRight size={14} aria-hidden="true" />
                    </Button>
                  </div>
                </>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
