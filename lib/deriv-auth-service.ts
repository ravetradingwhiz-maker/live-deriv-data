import { getDerivAPI } from "./deriv-api"

export interface AuthStatus {
  isAuthenticated: boolean
  isConnecting: boolean
  error: string | null
  accountInfo: any | null
}

class DerivAuthService {
  private static instance: DerivAuthService | null = null
  private authStatus: AuthStatus = {
    isAuthenticated: false,
    isConnecting: false,
    error: null,
    accountInfo: null,
  }
  private listeners: Set<(status: AuthStatus) => void> = new Set()

  static getInstance(): DerivAuthService {
    if (!DerivAuthService.instance) {
      DerivAuthService.instance = new DerivAuthService()
    }
    return DerivAuthService.instance
  }

  async initialize(): Promise<void> {
    console.log("[v0] Initializing Deriv authentication service...")

    this.updateStatus({
      isAuthenticated: false,
      isConnecting: true,
      error: null,
      accountInfo: null,
    })

    try {
      const derivAPI = getDerivAPI()

      // Connect to Deriv WebSocket
      await derivAPI.connect()

      // Get account information after successful authentication
      const accountInfo = await this.getAccountInfo()

      this.updateStatus({
        isAuthenticated: true,
        isConnecting: false,
        error: null,
        accountInfo,
      })

      console.log("[v0] Deriv authentication successful:", accountInfo)

      // Start subscribing to synthetic markets for live data
      await this.initializeSyntheticMarkets()
    } catch (error) {
      console.error("[v0] Deriv authentication failed:", error)
      this.updateStatus({
        isAuthenticated: false,
        isConnecting: false,
        error: error instanceof Error ? error.message : "Authentication failed",
        accountInfo: null,
      })
    }
  }

  private async getAccountInfo(): Promise<any> {
    return new Promise((resolve, reject) => {
      const derivAPI = getDerivAPI()
      const reqId = Date.now()

      // Listen for account info response
      const originalSend = derivAPI["send"].bind(derivAPI)
      derivAPI["callbacks"].set(reqId, (data: any) => {
        if (data.error) {
          reject(new Error(data.error.message))
        } else {
          resolve(data.authorize)
        }
      })

      derivAPI["send"]({
        authorize: derivAPI["apiToken"],
        req_id: reqId,
      })
    })
  }

  private async initializeSyntheticMarkets(): Promise<void> {
    console.log("[v0] Initializing synthetic markets...")

    try {
      const derivAPI = getDerivAPI()

      // Get available synthetic symbols
      const symbols = await derivAPI.getActiveSymbols()
      const syntheticSymbols = symbols.filter(
        (symbol: any) => symbol.market === "synthetic_index" && symbol.submarket === "random_index",
      )

      console.log("[v0] Available synthetic markets:", syntheticSymbols.length)

      // Subscribe to popular synthetic indices for live tick data
      const popularSymbols = ["R_10", "R_25", "R_50", "R_75", "R_100"]

      popularSymbols.forEach((symbol) => {
        derivAPI.subscribeTicks(symbol, (tick) => {
          console.log(`[v0] Live tick for ${symbol}:`, tick.tick.quote)
          // Emit tick data to subscribers
          this.notifyTickSubscribers(symbol, tick)
        })
      })
    } catch (error) {
      console.error("[v0] Failed to initialize synthetic markets:", error)
    }
  }

  private tickSubscribers: Map<string, Set<(tick: any) => void>> = new Map()

  subscribeToTicks(symbol: string, callback: (tick: any) => void): () => void {
    if (!this.tickSubscribers.has(symbol)) {
      this.tickSubscribers.set(symbol, new Set())
    }

    this.tickSubscribers.get(symbol)!.add(callback)

    // If authenticated, start subscription immediately
    if (this.authStatus.isAuthenticated) {
      const derivAPI = getDerivAPI()
      derivAPI.subscribeTicks(symbol, callback)
    }

    // Return unsubscribe function
    return () => {
      const subscribers = this.tickSubscribers.get(symbol)
      if (subscribers) {
        subscribers.delete(callback)
        if (subscribers.size === 0) {
          this.tickSubscribers.delete(symbol)
          if (this.authStatus.isAuthenticated) {
            const derivAPI = getDerivAPI()
            derivAPI.unsubscribeTicks(symbol)
          }
        }
      }
    }
  }

  private notifyTickSubscribers(symbol: string, tick: any): void {
    const subscribers = this.tickSubscribers.get(symbol)
    if (subscribers) {
      subscribers.forEach((callback) => callback(tick))
    }
  }

  subscribe(listener: (status: AuthStatus) => void): () => void {
    this.listeners.add(listener)
    // Immediately notify with current status
    listener(this.authStatus)

    // Return unsubscribe function
    return () => {
      this.listeners.delete(listener)
    }
  }

  private updateStatus(newStatus: AuthStatus): void {
    this.authStatus = { ...newStatus }
    this.listeners.forEach((listener) => listener(this.authStatus))
  }

  getStatus(): AuthStatus {
    return { ...this.authStatus }
  }

  async reconnect(): Promise<void> {
    console.log("[v0] Attempting to reconnect to Deriv API...")
    await this.initialize()
  }
}

export const derivAuthService = DerivAuthService.getInstance()
