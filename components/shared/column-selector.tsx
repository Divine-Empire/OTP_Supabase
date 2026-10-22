"use client";

import React from "react";
import { Columns3 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";

export interface ColumnOption {
  key: string;
  label: string;
}

interface ColumnSelectorProps {
  options: ColumnOption[];
  visible: Record<string, boolean>;
  onToggle: (key: string) => void;
  onSelectAll: () => void;
  onHideAll?: () => void;
  align?: "start" | "end" | "center";
  className?: string;
}

/**
 * ColumnSelector: "Columns n/m" button with an accessible checklist popover.
 * Provides quick 'Select All' and 'Hide All' controls.
 */
export function ColumnSelector({
  options,
  visible,
  onToggle,
  onSelectAll,
  onHideAll,
  align = "end",
  className = "",
}: ColumnSelectorProps) {
  const shownCount = options.filter((o) => !!visible[o.key]).length;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className={`h-9 items-center gap-2 rounded-md border-input bg-card px-3 text-sm font-medium text-foreground transition-colors hover:bg-accent ${className}`}
        >
          <Columns3 className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
          <span>Columns</span>
          <span className="tabular-nums text-xs text-muted-foreground">
            {shownCount}/{options.length}
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align={align} className="w-64 max-h-96 overflow-y-auto p-1.5 shadow-lg">
        <DropdownMenuLabel className="px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Column Visibility
        </DropdownMenuLabel>
        <div className="flex gap-1.5 px-1 py-1">
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={onSelectAll}
            className="h-7 flex-1 text-xs text-brand-700 hover:bg-accent"
          >
            Show All
          </Button>
          {onHideAll && (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={onHideAll}
              className="h-7 flex-1 text-xs text-muted-foreground hover:bg-accent"
            >
              Hide All
            </Button>
          )}
        </div>
        <DropdownMenuSeparator className="my-1" />
        <div className="space-y-1 py-1">
          {options.map((option) => {
            const isChecked = !!visible[option.key];
            const checkboxId = `col-toggle-${option.key}`;
            return (
              <label
                key={option.key}
                htmlFor={checkboxId}
                className="flex cursor-pointer items-center gap-2.5 rounded-sm px-2 py-1.5 text-xs text-foreground hover:bg-accent transition-colors"
              >
                <Checkbox
                  id={checkboxId}
                  checked={isChecked}
                  onCheckedChange={() => onToggle(option.key)}
                />
                <span className="truncate select-none font-medium">{option.label}</span>
              </label>
            );
          })}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
