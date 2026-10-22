import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

interface DispatchMetricsProps {
  data: any
}

export function DispatchMetrics({ data }: DispatchMetricsProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Dispatch Performance Metrics</CardTitle>
        <CardDescription>Key performance indicators for dispatch operations</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 md:grid-cols-3">
          <div className="text-center">
            <div className="text-2xl font-bold text-success tabular-nums">{data.dispatchComplete}</div>
            <p className="text-sm text-muted-foreground">Orders Dispatched</p>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-warning-foreground tabular-nums">{data.pendingOrders}</div>
            <p className="text-sm text-muted-foreground">Pending Dispatch</p>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-primary tabular-nums">
              {data.dispatchComplete + data.pendingOrders > 0
                ? Math.round((data.dispatchComplete / (data.dispatchComplete + data.pendingOrders)) * 100)
                : 0}
              %
            </div>
            <p className="text-sm text-muted-foreground">Success Rate</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
