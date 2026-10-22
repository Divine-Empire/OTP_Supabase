"use client"

import { Button } from "@/components/ui/button"
import { RefreshCw } from "lucide-react"

interface ErrorDisplayProps {
  error: string
  onRetry: () => void
}

export function ErrorDisplay({ error, onRetry }: ErrorDisplayProps) {
  return (
    <div className="flex min-h-[400px] items-center justify-center p-6">
      <div className="max-w-md rounded-lg border border-destructive/30 bg-card p-6 text-center shadow-xs">
        <h2 className="text-lg font-semibold text-destructive">Error Loading Dashboard</h2>
        <p className="text-sm text-muted-foreground mt-2" role="alert">{error}</p>
        <Button onClick={onRetry} variant="outline" size="sm" className="mt-4 h-9">
          <RefreshCw className="h-4 w-4 mr-2" />
          Retry
        </Button>
      </div>
    </div>
  )
}
