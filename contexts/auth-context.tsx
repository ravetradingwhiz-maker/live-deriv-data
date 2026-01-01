"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"
import type { User, AuthState, LoginCredentials } from "@/types/auth"

interface AuthContextType extends AuthState {
  login: (credentials: LoginCredentials) => Promise<boolean>
  logout: () => void
  updateUser: (user: Partial<User>) => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

const MOCK_ACCESS_CODES: Record<string, User> = {
  "ADM-2024-001": {
    id: "1",
    username: "binary",
    email: "admin@liveDerivData.com",
    role: "admin",
    subscription: "enterprise",
    createdAt: "2024-01-01T00:00:00Z",
    lastLogin: new Date().toISOString(),
    permissions: ["all"],
  },
  "TRD-2024-002": {
    id: "2",
    username: "trader1",
    email: "trader@example.com",
    role: "trader",
    subscription: "premium",
    createdAt: "2024-01-15T00:00:00Z",
    lastLogin: new Date().toISOString(),
    permissions: ["trade", "backtest", "analyze"],
  },
  "VWR-2024-003": {
    id: "3",
    username: "viewer1",
    email: "viewer@example.com",
    role: "viewer",
    subscription: "free",
    createdAt: "2024-02-01T00:00:00Z",
    lastLogin: new Date().toISOString(),
    permissions: ["view"],
  },
  "TRD-KEMUTUK-001": {
    id: "4",
    username: "kemutuk",
    email: "kemutuk@example.com",
    role: "trader",
    subscription: "premium",
    createdAt: "2024-01-20T00:00:00Z",
    lastLogin: new Date().toISOString(),
    permissions: ["trade", "backtest", "analyze"],
  },
  // "T9!mA7#Q4z": {
  //   id: "5",
  //   username: "trader2",
  //   email: "trader2@example.com",
  //   role: "trader",
  //   subscription: "premium",
  //   createdAt: "2024-02-10T00:00:00Z",
  //   lastLogin: new Date().toISOString(),
  //   permissions: ["trade", "backtest", "analyze"],
  // },
  "Qw9@Hp3!Lm": {
    id: "6",
    username: "trader3",
    email: "trader3@example.com",
    role: "trader",
    subscription: "premium",
    createdAt: "2024-02-15T00:00:00Z",
    lastLogin: new Date().toISOString(),
    permissions: ["trade", "backtest", "analyze"],
  },
  "R8!cT2$Zp5": {
    id: "7",
    username: "trader4",
    email: "trader4@example.com",
    role: "trader",
    subscription: "premium",
    createdAt: "2024-02-20T00:00:00Z",
    lastLogin: new Date().toISOString(),
    permissions: ["trade", "backtest", "analyze"],
  },
  Coastal194: {
    id: "8",
    username: "coastal",
    email: "coastal@example.com",
    role: "trader",
    subscription: "premium",
    createdAt: "2024-03-01T00:00:00Z",
    lastLogin: new Date().toISOString(),
    permissions: ["trade", "backtest", "analyze"],
  },
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    isLoading: true,
  })

  useEffect(() => {
    // Check for stored authentication
    const storedUser = localStorage.getItem("auth_user")
    if (storedUser) {
      try {
        const user = JSON.parse(storedUser)
        setAuthState({
          user,
          isAuthenticated: true,
          isLoading: false,
        })
      } catch {
        localStorage.removeItem("auth_user")
        setAuthState((prev) => ({ ...prev, isLoading: false }))
      }
    } else {
      setAuthState((prev) => ({ ...prev, isLoading: false }))
    }
  }, [])

  const login = async (credentials: LoginCredentials): Promise<boolean> => {
    setAuthState((prev) => ({ ...prev, isLoading: true }))

    // Simulate API call delay
    await new Promise((resolve) => setTimeout(resolve, 1000))

    const user = MOCK_ACCESS_CODES[credentials.accessCode]

    if (user) {
      const updatedUser = {
        ...user,
        lastLogin: new Date().toISOString(),
      }

      localStorage.setItem("auth_user", JSON.stringify(updatedUser))
      setAuthState({
        user: updatedUser,
        isAuthenticated: true,
        isLoading: false,
      })
      return true
    }

    setAuthState((prev) => ({ ...prev, isLoading: false }))
    return false
  }

  const logout = () => {
    localStorage.removeItem("auth_user")
    setAuthState({
      user: null,
      isAuthenticated: false,
      isLoading: false,
    })
  }

  const updateUser = (updates: Partial<User>) => {
    if (authState.user) {
      const updatedUser = { ...authState.user, ...updates }
      localStorage.setItem("auth_user", JSON.stringify(updatedUser))
      setAuthState((prev) => ({ ...prev, user: updatedUser }))
    }
  }

  return (
    <AuthContext.Provider
      value={{
        ...authState,
        login,
        logout,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
