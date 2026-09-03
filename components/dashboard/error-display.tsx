"use client"

import { Button } from "@/components/ui/button"
import { RefreshCw } from "lucide-react"

interface ErrorDisplayProps {
  error: string
  onRetry: () => void
}

export function ErrorDisplay({ error, onRetry }: ErrorDisplayProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-red-600">Error Loading Dashboard</h1>
        <p className="text-muted-foreground mt-2">{error}</p>
        <Button onClick={onRetry} className="mt-4">
          <RefreshCw className="h-4 w-4 mr-2" />
          Retry
        </Button>
      </div>
    </div>
  )
}
