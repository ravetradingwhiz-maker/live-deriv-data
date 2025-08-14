export interface User {
  id: string
  username: string
  email: string
  role: "admin" | "trader" | "viewer"
  subscription: "free" | "premium" | "enterprise"
  createdAt: string
  lastLogin: string
  permissions: string[]
}

export interface AuthState {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
}

export interface LoginCredentials {
  username: string
  password: string
}

export interface SubscriptionPlan {
  id: string
  name: string
  price: number
  features: string[]
  maxStrategies: number
  maxBacktests: number
  realTimeData: boolean
  advancedIndicators: boolean
}
