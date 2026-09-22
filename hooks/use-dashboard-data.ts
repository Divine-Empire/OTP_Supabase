"use client"

import { useState, useEffect, useCallback } from "react"

export interface PipelineStage {
  key: string
  label: string
  pending: number
}

export interface DashboardData {
  totalOrders: number
  ordersThisMonth: number
  totalOrderValue: number
  totalInvoicedRevenue: number
  totalPending: number
  pipelineStages: PipelineStage[]
  paymentModeData: { name: string; value: number }[]
  monthlyTrend: { month: string; orders: number }[]
  topCustomers: { name: string; orders: number; value: number }[]
  recentOrders: { orderNo: string; companyName: string; paymentMode: string; amount: number; createdAt: string }[]
}

const EMPTY_DATA: DashboardData = {
  totalOrders: 0,
  ordersThisMonth: 0,
  totalOrderValue: 0,
  totalInvoicedRevenue: 0,
  totalPending: 0,
  pipelineStages: [],
  paymentModeData: [],
  monthlyTrend: [],
  topCustomers: [],
  recentOrders: [],
}

export function useDashboardData() {
  const [dashboardData, setDashboardData] = useState<DashboardData>(EMPTY_DATA)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchAllData = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch("/api/otp-supabase/dashboard")
      const result = await response.json()

      if (result.success) {
        setDashboardData(result.data)
      } else {
        throw new Error(result.error || "Failed to load dashboard data")
      }
    } catch (err: any) {
      console.error("Dashboard fetch error:", err)
      setError(err.message || "Failed to fetch dashboard data")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchAllData()
  }, [fetchAllData])

  return {
    dashboardData,
    loading,
    error,
    fetchAllData,
  }
}
