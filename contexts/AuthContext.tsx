"use client"

import React, { createContext, useContext, useState } from "react"

type AuthContextType = {
  user: any
  setUser: React.Dispatch<React.SetStateAction<any>>
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any>(null)

  return (
    <AuthContext.Provider value={{ user, setUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)

  // ✅ DO NOT throw error (prevents build crash)
  if (!context) {
    return {
      user: null,
      setUser: () => {},
    }
  }

  return context
}
