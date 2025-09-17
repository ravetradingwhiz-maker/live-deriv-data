"use client"

import { createContext, useContext, useEffect, useState, type ReactNode } from "react"
import { derivAuthService, type AuthStatus } from "@/lib/deriv-auth-service"

interface DerivConnectionContextType {
  authStatus: AuthStatus
  reconnect: () => Promise<void>
  subscribeToTicks: (symbol: string, callback: (tick: any) => void) => () => void
}

const DerivConnectionContext = createContext<DerivConnectionContextType | null>(null)

export function DerivConnectionProvider({ children }: { children: ReactNode }) {
  const [authStatus, setAuthStatus] = useState<AuthStatus>({
    isAuthenticated: false,
    isConnecting: false,
    error: null,
    accountInfo: null,
  })

  useEffect(() => {
    console.log("[v0] Starting Deriv connection provider...")

    // Subscribe to auth status changes
    const unsubscribe = derivAuthService.subscribe(setAuthStatus)

    // Initialize authentication
    derivAuthService.initialize().catch((error) => {
      console.error("[v0] Failed to initialize Deriv auth service:", error)
    })

    return unsubscribe
  }, [])

  const reconnect = async () => {
    await derivAuthService.reconnect()
  }

  const subscribeToTicks = (symbol: string, callback: (tick: any) => void) => {
    return derivAuthService.subscribeToTicks(symbol, callback)
  }

  return (
    <DerivConnectionContext.Provider
      value={{
        authStatus,
        reconnect,
        subscribeToTicks,
      }}
    >
      {children}
    </DerivConnectionContext.Provider>
  )
}

export function useDerivConnection() {
  const context = useContext(DerivConnectionContext)
  if (!context) {
    throw new Error("useDerivConnection must be used within DerivConnectionProvider")
  }
  return context
}
