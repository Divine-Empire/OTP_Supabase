import { RefreshCw } from "lucide-react"

export function LoadingSpinner() {
  return (
    <div className="flex min-h-[400px] items-center justify-center p-6">
      <div className="flex items-center justify-center gap-3">
        <RefreshCw className="h-6 w-6 animate-spin text-primary" />
        <span className="text-sm font-medium text-muted-foreground">Loading dashboard data...</span>
      </div>
    </div>
  )
}
