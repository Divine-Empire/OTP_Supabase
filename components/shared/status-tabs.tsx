"use client";

import React from "react";

export interface TabItem {
  id: string;
  label: string;
  count?: number;
}

interface StatusTabsProps {
  tabs: TabItem[];
  activeTab: string;
  onChange: (id: string) => void;
  variant?: "segmented" | "underline";
  label?: string;
  className?: string;
}

/**
 * StatusTabs: Standard tab pattern for Pending / History workflow switches.
 *
 * - variant "segmented": compact joined control that fits inside a toolbar row.
 * - variant "underline": classic tabs sitting above a toolbar/table.
 * - Optional `count` per tab. Arrow keys / Home / End move between tabs with full a11y.
 */
export function StatusTabs({
  tabs,
  activeTab,
  onChange,
  variant = "segmented",
  label = "Views",
  className = "",
}: StatusTabsProps) {
  const handleKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
    let next: number | null = null;
    if (e.key === "ArrowRight") next = (index + 1) % tabs.length;
    else if (e.key === "ArrowLeft") next = (index - 1 + tabs.length) % tabs.length;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = tabs.length - 1;

    if (next === null) return;
    e.preventDefault();
    onChange(tabs[next].id);
    const buttons = e.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>('[role="tab"]');
    buttons?.[next]?.focus();
  };

  const isUnderline = variant === "underline";

  const containerClass = isUnderline
    ? "flex w-full gap-1 border-b border-border"
    : "inline-flex h-9 shrink-0 items-stretch gap-0.5 rounded-md border border-input bg-card p-0.5 shadow-xs";

  return (
    <div role="tablist" aria-label={label} className={`${containerClass} ${className}`}>
      {tabs.map((tab, index) => {
        const isActive = activeTab === tab.id;
        const tabClass = isUnderline
          ? `-mb-px inline-flex items-center gap-2 border-b-2 px-3 py-2 text-sm font-medium transition-colors ${
              isActive
                ? "border-primary text-brand-700"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`
          : `inline-flex items-center gap-2 whitespace-nowrap rounded px-3 text-sm font-medium transition-colors ${
              isActive
                ? "bg-accent text-accent-foreground font-semibold shadow-xs"
                : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
            }`;

        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            tabIndex={isActive ? 0 : -1}
            onClick={() => onChange(tab.id)}
            onKeyDown={(e) => handleKeyDown(e, index)}
            className={tabClass}
          >
            <span>{tab.label}</span>
            {tab.count !== undefined && (
              <span className="rounded bg-secondary px-1.5 py-0.5 text-xs font-semibold tabular-nums text-foreground">
                {tab.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
