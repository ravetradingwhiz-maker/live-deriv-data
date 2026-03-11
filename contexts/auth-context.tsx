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
  "Rave_Fx": {
    id: "1",
    username: "Rave_Fx",
    email: "ravefx@liveDerivData.com",
    role: "admin",
    subscription: "enterprise",
    createdAt: "2024-01-01T00:00:00Z",
    lastLogin: new Date().toISOString(),
    permissions: ["all"],
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
