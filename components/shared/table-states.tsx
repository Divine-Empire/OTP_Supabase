"use client";

import React from "react";
import { AlertCircle, Inbox, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EmptyStateProps {
  title?: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

/**
 * EmptyState: Rendered when a dataset or filter produces zero matching records.
 */
export function EmptyState({
  title = "No records found",
  description = "There are no records matching your current filter criteria.",
  action,
  className = "",
}: EmptyStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center gap-2 px-6 py-14 text-center ${className}`}>
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-secondary text-muted-foreground">
        <Inbox className="h-6 w-6" aria-hidden="true" />
      </div>
      <p className="text-sm font-semibold text-foreground mt-1">{title}</p>
      {description && <p className="max-w-md text-xs text-muted-foreground">{description}</p>}
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}

interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  className?: string;
}

/**
 * ErrorState: Rendered when a query or API fetch encounters a failure.
 */
export function ErrorState({
  title = "Unable to load data",
  message,
  onRetry,
  className = "",
}: ErrorStateProps) {
  return (
    <div role="alert" className={`flex flex-col items-center justify-center gap-2 px-6 py-14 text-center ${className}`}>
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
        <AlertCircle className="h-6 w-6" aria-hidden="true" />
      </div>
      <p className="text-sm font-semibold text-foreground mt-1">{title}</p>
      {message && <p className="max-w-md text-xs text-muted-foreground">{message}</p>}
      {onRetry && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onRetry}
          className="mt-3 gap-1.5 h-8 text-xs font-medium"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          <span>Try again</span>
        </Button>
      )}
    </div>
  );
}

interface LoadingStateProps {
  message?: string;
  className?: string;
}

/**
 * LoadingState: Clean quiet loader for table contents.
 */
export function LoadingState({
  message = "Loading records...",
  className = "",
}: LoadingStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center gap-3 px-6 py-16 text-center ${className}`}>
      <div className="h-7 w-7 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      <span className="text-xs font-medium text-muted-foreground">{message}</span>
    </div>
  );
}
