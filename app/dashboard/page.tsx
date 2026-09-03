"use client"
import { useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { MetricsCards } from "@/components/dashboard/metrics-cards"
import { OverviewTab } from "@/components/dashboard/tabs/overview-tab"
import { OrdersTab } from "@/components/dashboard/tabs/orders-tab"
import { InventoryTab } from "@/components/dashboard/tabs/inventory-tab"
import { DispatchTab } from "@/components/dashboard/tabs/dispatch-tab"
import { AnalyticsTab } from "@/components/dashboard/tabs/analytics-tab"
import { LoadingSpinner } from "@/components/dashboard/loading-spinner"
import { ErrorDisplay } from "@/components/dashboard/error-display"
import { useDashboardData } from "@/hooks/use-dashboard-data"
import { MainLayout } from "@/components/layout/main-layout"

export default function OrderDispatchDashboard() {
  const { dashboardData, loading, error, fetchAllData } = useDashboardData()
  const [activeTab, setActiveTab] = useState("overview")

  if (loading) {
    return <LoadingSpinner />
  }

  if (error) {
    return <ErrorDisplay error={error} onRetry={fetchAllData} />
  }

  return (
    <MainLayout>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          <DashboardHeader onRefresh={fetchAllData} />
          <MetricsCards data={dashboardData} activeTab={activeTab} />

          <Tabs defaultValue="overview" className="space-y-4" onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="orders">Orders</TabsTrigger>
              {/* <TabsTrigger value="inventory">Inventory</TabsTrigger> */}
              <TabsTrigger value="dispatch">Dispatch</TabsTrigger>
              <TabsTrigger value="analytics">Analytics</TabsTrigger>
            </TabsList>

            <TabsContent value="overview">
              <OverviewTab data={dashboardData} />
            </TabsContent>

            <TabsContent value="orders">
              <OrdersTab data={dashboardData} />
            </TabsContent>

            {/* <TabsContent value="inventory">
              <InventoryTab data={dashboardData} />
            </TabsContent> */}

            <TabsContent value="dispatch">
              <DispatchTab data={dashboardData} />
            </TabsContent>

            <TabsContent value="analytics">
              <AnalyticsTab data={dashboardData} />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </MainLayout>
  )
}