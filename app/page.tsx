"use client"

import { useState } from "react"
import { AuthProvider, useAuth } from "@/contexts/auth-context"
import { LoginForm } from "@/components/login-form"
import { LandingPage } from "@/components/landing-page"
import TradingDashboard from "../trading-dashboard"

function AppContent() {
  const { isAuthenticated, isLoading } = useAuth()
  const [showLogin, setShowLogin] = useState(false)

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center">
        <div className="text-white text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p>Loading...</p>
        </div>
      </div>
    )
  }

  if (isAuthenticated) {
    return <TradingDashboard />
  }

  if (showLogin) {
    return <LoginForm onBackClick={() => setShowLogin(false)} />
  }

  return <LandingPage onGetStarted={() => setShowLogin(true)} />
}

export default function Page() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  )
}
