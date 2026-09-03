"use client"

import type React from "react"
import { createContext, useContext, useState, useEffect } from "react"
import { useRouter } from "next/navigation"

interface User {
  id: string
  username: string
  fullName: string
  role: "super_admin" | "admin" | "user"
  assignedSteps: string[]
  warehousePageAccess?: string
  location?: string
}

interface AuthContextType {
  user: User | null
  login: (username: string, password: string) => Promise<{ success: boolean; error?: string }>
  logout: () => void
  isAuthenticated: boolean
  isLoading: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    // Check for saved user on component mount
    const checkAuth = () => {
      try {
        const savedUser = localStorage.getItem("otp-user")
        const savedAuth = localStorage.getItem("otp-authenticated")

        if (savedUser && savedAuth === "true") {
          const userData = JSON.parse(savedUser)
          setUser(userData)
          setIsAuthenticated(true)
        }
      } catch (error) {
        console.error("Error checking authentication:", error)
        localStorage.removeItem("otp-user")
        localStorage.removeItem("otp-authenticated")
      } finally {
        setIsLoading(false)
      }
    }

    checkAuth()
  }, [])

  const login = async (username: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      setIsLoading(true)

      const response = await fetch("/api/otp-supabase/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "login", username, password }),
      })

      const result = await response.json()

      if (result.success && result.user) {
        const userData: User = result.user
        setUser(userData)
        setIsAuthenticated(true)
        localStorage.setItem("otp-user", JSON.stringify(userData))
        localStorage.setItem("otp-authenticated", "true")
        return { success: true }
      }

      return { success: false, error: result.error || "Invalid username or password" }
    } catch (error: any) {
      console.error("Login error:", error)
      return { success: false, error: error.message || "Network connection error" }
    } finally {
      setIsLoading(false)
    }
  }

  const logout = () => {
    setUser(null)
    setIsAuthenticated(false)
    localStorage.removeItem("otp-user")
    localStorage.removeItem("otp-authenticated")
    localStorage.removeItem("otp-orders")
    localStorage.removeItem("otp-cache")
    router.push("/login")
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, isAuthenticated, isLoading }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
