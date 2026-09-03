import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ShoppingCart, CheckCircle, Truck, DollarSign, Clock, XCircle, IndianRupee } from "lucide-react"

interface MetricsCardsProps {
  data: {
    totalOrders: number
    completedOrders: number
    deliveredOrders: number
    totalRevenue: number
    pendingOrders: number
    cancelOrders: number // Updated from cancelledOrders
    // Dispatch-specific metrics
    totalDispatches: number
    pendingDispatches: number
    completedDispatches: number
    dispatchRevenue: number
  }
  activeTab: string
}

export function MetricsCards({ data, activeTab }: MetricsCardsProps) {
  // Show different metrics based on active tab
  const isDispatchOrAnalytics = activeTab === 'dispatch' || activeTab === 'analytics'
  
  if (isDispatchOrAnalytics) {
    return (
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white border-0 shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Dispatch</CardTitle>
            <Truck className="h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.totalDispatches}</div>
            <p className="text-xs opacity-80">All dispatches</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-orange-500 to-orange-600 text-white border-0 shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Dispatch</CardTitle>
            <Clock className="h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.pendingDispatches}</div>
            <p className="text-xs opacity-80">
              Pending rate: {data.totalDispatches > 0 ? ((data.pendingDispatches / data.totalDispatches) * 100).toFixed(1) : 0}%
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white border-0 shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Complete Dispatch</CardTitle>
            <CheckCircle className="h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.completedDispatches}</div>
            <p className="text-xs opacity-80">
              Success rate: {data.totalDispatches > 0 ? ((data.completedDispatches / data.totalDispatches) * 100).toFixed(1) : 0}%
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-indigo-500 to-indigo-600 text-white border-0 shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Dispatch Revenue</CardTitle>
            <IndianRupee className="h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{(data.dispatchRevenue).toFixed(1)}</div>
            <p className="text-xs opacity-80">Dispatch earnings</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Default metrics for overview and orders tabs
  return (
    <div className="grid gap-4 md:grid-cols-6">
      <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white border-0 shadow-lg">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
          <ShoppingCart className="h-4 w-4" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{data.totalOrders}</div>
          <p className="text-xs opacity-80">All orders</p>
        </CardContent>
      </Card>

      <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white border-0 shadow-lg">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Completed Orders</CardTitle>
          <CheckCircle className="h-4 w-4" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{data.completedOrders}</div>
          <p className="text-xs opacity-80">
            Success rate: {data.totalOrders > 0 ? ((data.completedOrders / data.totalOrders) * 100).toFixed(1) : 0}%
          </p>
        </CardContent>
      </Card>

      <Card className="bg-gradient-to-r from-red-500 to-red-600 text-white border-0 shadow-lg">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Cancelled Orders</CardTitle>
          <XCircle className="h-4 w-4" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{data.cancelOrders}</div>
          <p className="text-xs opacity-80">
            Cancel rate: {data.totalOrders > 0 ? ((data.cancelOrders / data.totalOrders) * 100).toFixed(1) : 0}%
          </p>
        </CardContent>
      </Card>

      <Card className="bg-gradient-to-r from-orange-500 to-orange-600 text-white border-0 shadow-lg">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Pending Orders</CardTitle>
          <Clock className="h-4 w-4" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{data.pendingOrders}</div>
          <p className="text-xs opacity-80">
            Pending rate: {data.totalOrders > 0 ? ((data.pendingOrders / data.totalOrders) * 100).toFixed(1) : 0}%
          </p>
        </CardContent>
      </Card>



      <Card className="bg-gradient-to-r from-purple-500 to-purple-600 text-white border-0 shadow-lg">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Material Return</CardTitle>
          <Truck className="h-4 w-4" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{data.deliveredOrders}</div>
          <p className="text-xs opacity-80">
            Delivery rate: {data.totalOrders > 0 ? ((data.deliveredOrders / data.totalOrders) * 100).toFixed(1) : 0}%
          </p>
        </CardContent>
      </Card>

      <Card className="bg-gradient-to-r from-indigo-500 to-indigo-600 text-white border-0 shadow-lg">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Revenue</CardTitle>
          <IndianRupee className="h-4 w-4" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">₹{(data.totalRevenue).toFixed(1)}</div>
          <p className="text-xs opacity-80">Total earnings</p>
        </CardContent>
      </Card>
    </div>
  )
}