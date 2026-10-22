"use client"

import type React from "react"
import { createContext, useContext, useState, useEffect } from "react"
import { useRouter } from "next/navigation"

interface User {
  id: string
  username: string
  fullName: string
  role: "admin" | "user"
  assignedSteps: string[]
  assignedCrmNames?: string[]
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

  // The API answers 401 when the signed session cookie is missing or expired
  // (e.g. a session from before server-side auth, or after 30 days). The saved
  // localStorage user would otherwise keep showing a logged-in UI whose every
  // request fails, so drop it and go to the login page.
  useEffect(() => {
    const originalFetch = window.fetch
    window.fetch = async (...args) => {
      const res = await originalFetch(...args)
      const url = typeof args[0] === "string" ? args[0] : args[0] instanceof URL ? args[0].pathname : (args[0] as Request).url
      if (res.status === 401 && url.includes("/api/otp-supabase/") && !url.includes("/api/otp-supabase/users")) {
        localStorage.removeItem("otp-user")
        localStorage.removeItem("otp-authenticated")
        setUser(null)
        setIsAuthenticated(false)
        router.push("/login")
      }
      return res
    }
    return () => {
      window.fetch = originalFetch
    }
  }, [router])

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
    // Clears the server's httpOnly session cookie (not reachable from JS).
    fetch("/api/otp-supabase/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "logout" }),
    }).catch(() => {})
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
