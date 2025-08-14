"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"
import type { User, AuthState, LoginCredentials } from "@/types/auth"

interface AuthContextType extends AuthState {
  login: (credentials: LoginCredentials) => Promise<boolean>
  logout: () => void
  updateUser: (user: Partial<User>) => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

// Mock user database
const MOCK_USERS: Record<string, { password: string; user: User }> = {
  binary: {
    password: "beast",
    user: {
      id: "1",
      username: "binary",
      email: "admin@liveDerivData.com",
      role: "admin",
      subscription: "enterprise",
      createdAt: "2024-01-01T00:00:00Z",
      lastLogin: new Date().toISOString(),
      permissions: ["all"],
    },
  },
  trader1: {
    password: "demo123",
    user: {
      id: "2",
      username: "trader1",
      email: "trader@example.com",
      role: "trader",
      subscription: "premium",
      createdAt: "2024-01-15T00:00:00Z",
      lastLogin: new Date().toISOString(),
      permissions: ["trade", "backtest", "analyze"],
    },
  },
  viewer1: {
    password: "view123",
    user: {
      id: "3",
      username: "viewer1",
      email: "viewer@example.com",
      role: "viewer",
      subscription: "free",
      createdAt: "2024-02-01T00:00:00Z",
      lastLogin: new Date().toISOString(),
      permissions: ["view"],
    },
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

    const userRecord = MOCK_USERS[credentials.username]

    if (userRecord && userRecord.password === credentials.password) {
      const user = {
        ...userRecord.user,
        lastLogin: new Date().toISOString(),
      }

      localStorage.setItem("auth_user", JSON.stringify(user))
      setAuthState({
        user,
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
