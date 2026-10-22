"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useAuth } from "@/components/auth-provider"
import { Sidebar } from "./sidebar"
import { MainNav } from "./main-nav"
import { Footer } from "./footer"
import { useRouter } from "next/navigation"

// fitViewport: the page fills the screen below the header and above the footer and does NOT scroll
// itself -- the page's own table/card scrolls inside (like Lead-To-Order). Default keeps the old
// behaviour (whole page scrolls).
export function MainLayout({ children, fitViewport = false }: { children: React.ReactNode; fitViewport?: boolean }) {
  const { isAuthenticated, isLoading } = useAuth()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const router = useRouter()

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/login")
    }
  }, [isAuthenticated, isLoading, router])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-2 border-primary border-t-transparent mx-auto"></div>
          <p className="mt-4 text-sm text-muted-foreground">Loading workspace...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-2 border-primary border-t-transparent mx-auto"></div>
          <p className="mt-4 text-sm text-muted-foreground">Redirecting to login...</p>
        </div>
      </div>
    )
  }

  return (
    <div className={`bg-background text-foreground flex flex-col ${fitViewport ? "h-dvh overflow-hidden" : "min-h-screen"}`}>
      <Sidebar mobileOpen={mobileMenuOpen} onMobileOpenChange={setMobileMenuOpen} />
      <div className={`md:pl-64 flex flex-col flex-1 min-w-0 overflow-x-hidden ${fitViewport ? "min-h-0" : "min-h-screen"}`}>
        <MainNav onOpenMobileMenu={() => setMobileMenuOpen(true)} />
        <main className={`flex-1 flex flex-col min-h-0 min-w-0 w-full p-3 md:p-4 ${fitViewport ? "overflow-hidden" : ""}`}>
          {children}
        </main>
        <Footer />
      </div>
    </div>
  )
}

