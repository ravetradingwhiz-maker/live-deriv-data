"use client"

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react"
import type { LoginCredentials, User } from "@/types/auth"

type AuthContextType = {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (credentials: LoginCredentials) => Promise<boolean>
  logout: () => void
  updateUser: (updates: Partial<User>) => void
  setUser: React.Dispatch<React.SetStateAction<User | null>>
}

const STORAGE_KEY = "livederiv.auth.user"

const ACCESS_CODE_USERS: Record<string, User> = {
  rave_fx: {
    id: "u-admin-1",
    username: "Rave Fx",
    email: "rave_fx@livederivdataanalysis.com",
    role: "admin",
    subscription: "enterprise",
    createdAt: new Date().toISOString(),
    lastLogin: new Date().toISOString(),
    permissions: ["all", "trade", "backtest", "manage", "export"],
  },
  premium123: {
    id: "u-trader-1",
    username: "premium_trader",
    email: "premium@livederivdataanalysis.com",
    role: "trader",
    subscription: "premium",
    createdAt: new Date().toISOString(),
    lastLogin: new Date().toISOString(),
    permissions: ["trade", "backtest", "export"],
  },
  demo: {
    id: "u-viewer-1",
    username: "demo_user",
    email: "demo@livederivdataanalysis.com",
    role: "viewer",
    subscription: "free",
    createdAt: new Date().toISOString(),
    lastLogin: new Date().toISOString(),
    permissions: ["view"],
  },
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored) as User
        setUser(parsed)
      }
    } catch (error) {
      console.error("[Auth] Failed to restore user session", error)
      localStorage.removeItem(STORAGE_KEY)
    } finally {
      setIsLoading(false)
    }
  }, [])

  const login = useCallback(async (credentials: LoginCredentials): Promise<boolean> => {
    const normalizedCode = credentials.accessCode.trim().toLowerCase()
    const matchedUser = ACCESS_CODE_USERS[normalizedCode]

    if (!matchedUser) {
      return false
    }

    const loggedInUser: User = {
      ...matchedUser,
      lastLogin: new Date().toISOString(),
    }

    setUser(loggedInUser)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(loggedInUser))
    return true
  }, [])

  const logout = useCallback(() => {
    setUser(null)
    localStorage.removeItem(STORAGE_KEY)
  }, [])

  const updateUser = useCallback((updates: Partial<User>) => {
    setUser((prev) => {
      if (!prev) {
        return prev
      }

      const next = { ...prev, ...updates }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      return next
    })
  }, [])

  const value = useMemo<AuthContextType>(
    () => ({
      user,
      isAuthenticated: !!user,
      isLoading,
      login,
      logout,
      updateUser,
      setUser,
    }),
    [user, isLoading, login, logout, updateUser],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)

  if (!context) {
    return {
      user: null,
      isAuthenticated: false,
      isLoading: false,
      login: async () => false,
      logout: () => {},
      updateUser: () => {},
      setUser: () => {},
    }
  }

  return context
}
