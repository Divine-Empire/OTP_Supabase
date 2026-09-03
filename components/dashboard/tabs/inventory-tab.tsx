import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Package, Warehouse, Activity } from "lucide-react"

interface InventoryTabProps {
  data: any
}

export function InventoryTab({ data }: InventoryTabProps) {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Inventory Pending</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.inventoryPending}</div>
            <p className="text-xs text-muted-foreground">Items not available</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Material Received</CardTitle>
            <Warehouse className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.materialReceived}</div>
            <p className="text-xs text-muted-foreground">Materials in stock</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Calibration Required</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.calibrationRequired}</div>
            <p className="text-xs text-muted-foreground">Items need calibration</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
