import { Package, Warehouse, Activity } from "lucide-react"
import { MetricCard } from "@/components/dashboard/metrics-cards"

interface InventoryTabProps {
  data: any
}

export function InventoryTab({ data }: InventoryTabProps) {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard
          title="Inventory Pending"
          value={data.inventoryPending || 0}
          subtitle="Items not available"
          tone="warning"
          icon={<Package className="h-5 w-5" />}
        />
        <MetricCard
          title="Material Received"
          value={data.materialReceived || 0}
          subtitle="Materials in stock"
          tone="success"
          icon={<Warehouse className="h-5 w-5" />}
        />
        <MetricCard
          title="Calibration Required"
          value={data.calibrationRequired || 0}
          subtitle="Items need calibration"
          tone="info"
          icon={<Activity className="h-5 w-5" />}
        />
      </div>
    </div>
  )
}
