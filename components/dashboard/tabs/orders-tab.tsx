import { RecentOrdersTable } from "@/components/dashboard/tables/recent-orders-table"

interface OrdersTabProps {
  data: any
}

export function OrdersTab({ data }: OrdersTabProps) {
  return (
    <div className="space-y-4">
      <RecentOrdersTable orders={data.recentOrders} />
    </div>
  )
}
