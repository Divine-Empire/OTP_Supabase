"use client"

import { Button } from "@/components/ui/button"
import { RefreshCw } from "lucide-react"

interface DashboardHeaderProps {
  onRefresh: () => void
}

export function DashboardHeader({ onRefresh }: DashboardHeaderProps) {
  return (
    <div className="flex justify-between items-center">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
          Order & Dispatch Dashboard
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">Real-time overview across the order-to-payment pipeline</p>
      </div>
      <div className="flex gap-2">
        <Button onClick={onRefresh} variant="outline" size="sm" className="h-9">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh Data
        </Button>
      </div>
    </div>
  )
}
