"use client";

import React from "react";

export type StatusTone = "success" | "warning" | "danger" | "info" | "neutral";

const TONES: Record<StatusTone, { badge: string; dot: string }> = {
  success: {
    badge: "bg-success/10 text-success border-success/25",
    dot: "bg-success",
  },
  warning: {
    badge: "bg-warning/15 text-warning-foreground border-warning/30",
    dot: "bg-warning",
  },
  danger: {
    badge: "bg-destructive/10 text-destructive border-destructive/25",
    dot: "bg-destructive",
  },
  info: {
    badge: "bg-info/10 text-info border-info/25",
    dot: "bg-info",
  },
  neutral: {
    badge: "bg-secondary text-muted-foreground border-border",
    dot: "bg-muted-foreground",
  },
};

interface StatusBadgeProps {
  tone?: StatusTone;
  children: React.ReactNode;
  className?: string;
  dot?: boolean;
}

/**
 * StatusBadge: Unified semantic status indicator across Divine Empire.
 * Features a colored status dot, restrained tint, and readable text label.
 */
export function StatusBadge({
  tone = "neutral",
  children,
  className = "",
  dot = true,
}: StatusBadgeProps) {
  const t = TONES[tone] || TONES.neutral;

  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded border px-2 py-0.5 text-xs font-medium ${t.badge} ${className}`}
    >
      {dot && <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${t.dot}`} aria-hidden="true" />}
      <span>{children}</span>
    </span>
  );
}
