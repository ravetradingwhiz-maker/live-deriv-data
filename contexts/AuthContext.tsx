"use client"

import React, { createContext, useContext, useState } from "react"

// Define type
type AuthContextType = {
  user: any
  setUser: React.Dispatch<React.SetStateAction<any>>
}

// Create context
const AuthContext = createContext<AuthContextType | undefined>(undefined)

// Provider
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState(null)

  return (
    <AuthContext.Provider value={{ user, setUser }}>
      {children}
    </AuthContext.Provider>
  )
}

// Hook
export function useAuth() {
  const context = useContext(AuthContext)

  // 🔥 SAFE fallback (no crashing build)
  if (!context) {
    return {
      user: null,
      setUser: () => {},
    }
  }

  return context
}
