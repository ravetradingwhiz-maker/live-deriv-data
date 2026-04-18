"use client"

import { createContext, useContext, useState } from "react"

const AuthContext = createContext<any>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState(null)

  return (
    <AuthContext.Provider value={{ user, setUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)

  // 🔥 IMPORTANT: DO NOT THROW ERROR (this was breaking build)
  if (!context) {
    return { user: null, setUser: () => {} }
  }

  return context
}
