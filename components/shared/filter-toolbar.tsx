"use client";

import React from "react";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export interface FilterChipItem {
  key: string;
  label: string;
  onRemove: () => void;
}

interface FilterSearchProps {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  className?: string;
}

export function FilterSearch({
  value,
  onChange,
  placeholder = "Search across columns...",
  className = "",
}: FilterSearchProps) {
  return (
    <div className={`relative min-w-[200px] flex-1 ${className}`}>
      <Search
        className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
        aria-hidden="true"
      />
      <Input
        type="search"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-9 w-full rounded-md border-input bg-card pl-9 pr-3 text-sm focus-visible:ring-2 focus-visible:ring-ring/40"
      />
    </div>
  );
}

interface FilterChipsProps {
  chips: FilterChipItem[];
  onClearAll?: () => void;
  className?: string;
}

export function FilterChips({ chips, onClearAll, className = "" }: FilterChipsProps) {
  if (!chips.length) return null;

  return (
    <div className={`flex flex-wrap items-center gap-1.5 pt-1 ${className}`} aria-label="Active filters">
      <span className="text-xs text-muted-foreground font-medium mr-1">Active filters:</span>
      {chips.map((chip) => (
        <span
          key={chip.key}
          className="inline-flex h-7 items-center gap-1.5 rounded border border-brand-200 bg-brand-50 pl-2.5 pr-1.5 text-xs font-medium text-brand-800 shadow-2xs"
        >
          <span>{chip.label}</span>
          <button
            type="button"
            onClick={chip.onRemove}
            aria-label={`Remove filter ${chip.label}`}
            className="flex h-4 w-4 items-center justify-center rounded text-brand-600 transition-colors hover:bg-brand-200/60 hover:text-brand-950"
          >
            <X size={12} aria-hidden="true" />
          </button>
        </span>
      ))}
      {onClearAll && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onClearAll}
          className="h-7 px-2 text-xs font-medium text-muted-foreground hover:text-foreground"
        >
          Clear all
        </Button>
      )}
    </div>
  );
}

interface FilterToolbarProps {
  searchQuery?: string;
  onSearchChange?: (val: string) => void;
  searchPlaceholder?: string;
  filtersSlot?: React.ReactNode;
  actionsSlot?: React.ReactNode;
  chips?: FilterChipItem[];
  onClearAllChips?: () => void;
  className?: string;
}

/**
 * FilterToolbar: Unified enterprise filter and action bar.
 * Handles search, filter controls, custom action buttons, and active filter chips cleanly.
 */
export function FilterToolbar({
  searchQuery,
  onSearchChange,
  searchPlaceholder = "Search across all columns...",
  filtersSlot,
  actionsSlot,
  chips = [],
  onClearAllChips,
  className = "",
}: FilterToolbarProps) {
  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[280px]">
          {onSearchChange !== undefined && searchQuery !== undefined && (
            <FilterSearch
              value={searchQuery}
              onChange={onSearchChange}
              placeholder={searchPlaceholder}
            />
          )}
          {filtersSlot}
        </div>
        {actionsSlot && (
          <div className="flex items-center gap-2 shrink-0">{actionsSlot}</div>
        )}
      </div>

      {chips.length > 0 && (
        <FilterChips chips={chips} onClearAll={onClearAllChips} />
      )}
    </div>
  );
}
