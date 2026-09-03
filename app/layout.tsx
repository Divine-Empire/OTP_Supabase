import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { AuthProvider } from "@/components/auth-provider"
import { DataProvider } from "@/components/data-provider"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "OTP System - Order To Payment",
  description: "Complete Order To Payment Management System",
  generator: 'v0.dev',
  icons: {
    icon: "/divine-logo.svg",
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <AuthProvider>
          <DataProvider>{children}</DataProvider>
        </AuthProvider>
      </body>
    </html>
  )
}
