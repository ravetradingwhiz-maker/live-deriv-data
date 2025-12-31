export interface DerivTick {
  tick: {
    ask: number
    bid: number
    epoch: number
    id: string
    pip_size: number
    quote: number
    symbol: string
  }
}

export interface DerivCandle {
  candles: Array<{
    close: number
    epoch: number
    high: number
    low: number
    open: number
  }>
}

export interface PredictionResult {
  symbol: string
  prediction: "over" | "under" | "even" | "odd" | "rise" | "fall" | "matches" | "differs"
  targetDigit?: number
  confidence: number
  entryPoint: number
  recommendation: string
  analysis: string
  riskLevel: "low" | "medium" | "high"
  optimalTiming: string
}

function extractLastDigit(price: number): number {
  // Convert to string and remove trailing zeros after decimal
  let priceStr = price.toString()

  // If there's a decimal point, remove trailing zeros
  if (priceStr.includes(".")) {
    priceStr = priceStr.replace(/\.?0+$/, "")
  }

  // Remove decimal point and get last character
  const digitsOnly = priceStr.replace(".", "")
  const lastChar = digitsOnly.slice(-1)
  const digit = Number.parseInt(lastChar, 10)

  return isNaN(digit) ? 0 : digit
}

class DerivAPI {
  private ws: WebSocket | null = null
  private apiToken: string
  private static instance: DerivAPI | null = null
  private isConnected = false
  private messageId = 1
  private callbacks: Map<number, (data: any) => void> = new Map()
  private tickSubscriptions: Map<string, (tick: DerivTick) => void> = new Map()
  private heartbeatInterval: NodeJS.Timeout | null = null
  private reconnectAttempts = 0
  private maxReconnectAttempts = 10
  private reconnectTimeout: NodeJS.Timeout | null = null
  private isAnalyzing = false
  private connectionPromise: Promise<void> | null = null
  private authorizationAttempted = false
  private isAuthorizing = false // Added flag to track active authorization request
  private authorizedAccount: string | null = null // Added to track authorized state
  private currentWsId: string | null = null // Added a unique identifier for each WebSocket instance to prevent cross-contamination
  private authRequestInFlight = false // Added flag to track if authorization is currently being sent

  constructor(apiToken: string) {
    this.apiToken = apiToken
  }

  public static getInstance(apiToken: string): DerivAPI {
    if (!DerivAPI.instance) {
      DerivAPI.instance = new DerivAPI(apiToken)
    }
    return DerivAPI.instance
  }

  connect(): Promise<void> {
    if (this.connectionPromise) {
      return this.connectionPromise
    }

    if (this.isConnected && this.ws && this.ws.readyState === WebSocket.OPEN && this.authorizedAccount) {
      console.log("[v0] Already connected and authorized, skipping connection")
      return Promise.resolve()
    }

    this.connectionPromise = new Promise((resolve, reject) => {
      try {
        if (this.reconnectTimeout) {
          clearTimeout(this.reconnectTimeout)
          this.reconnectTimeout = null
        }

        const wsId = Math.random().toString(36).substring(7)
        this.currentWsId = wsId

        this.ws = new WebSocket("wss://ws.derivws.com/websockets/v3?app_id=115912")

        this.ws.onopen = () => {
          if (this.currentWsId !== wsId) {
            console.log("[v0] Stale connection opened, closing")
            this.ws?.close()
            return
          }

          console.log("[v0] Deriv WebSocket connected successfully")
          this.reconnectAttempts = 0

          if (!this.authorizedAccount && !this.isAuthorizing && !this.authRequestInFlight) {
            this.authorize()
              .then(() => {
                this.isConnected = true
                this.isAuthorizing = false
                this.startHeartbeat()
                this.connectionPromise = null
                resolve()
              })
              .catch((err) => {
                this.isAuthorizing = false
                this.connectionPromise = null
                reject(err)
              })
          } else {
            this.isConnected = true
            this.startHeartbeat()
            this.connectionPromise = null
            resolve()
          }
        }

        this.ws.onmessage = (event) => {
          const data = JSON.parse(event.data)

          if (data.msg_type === "ping") {
            console.log("[v0] Received ping response, connection is alive")
            return
          }

          if (data.msg_type === "tick" && data.tick) {
            const symbol = data.tick.symbol
            const callback = this.tickSubscriptions.get(symbol)
            if (callback) {
              callback(data as DerivTick)
            }
            console.log(`[v0] Received tick for ${symbol}: ${data.tick.quote}`)
          }

          if (data.req_id && this.callbacks.has(data.req_id)) {
            const callback = this.callbacks.get(data.req_id)
            if (callback) {
              callback(data)
              this.callbacks.delete(data.req_id)
            }
          }
        }

        this.ws.onerror = (error) => {
          console.error("[v0] Deriv WebSocket error:", error)
          this.connectionPromise = null
          reject(error)
        }

        this.ws.onclose = (event) => {
          console.log("[v0] Deriv WebSocket disconnected:", event.code, event.reason)
          if (event.code !== 1000 || !this.isAnalyzing) {
            this.isConnected = false
            this.authorizationAttempted = false
            this.authorizedAccount = null // Reset authorized state on disconnect
          }
          this.stopHeartbeat()
          this.connectionPromise = null

          if (event.code !== 1000 || (event.code === 1000 && !event.reason)) {
            if (this.reconnectAttempts < this.maxReconnectAttempts) {
              const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000)
              this.reconnectAttempts++
              console.log(
                `[v0] Attempting to reconnect in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})...`,
              )

              this.reconnectTimeout = setTimeout(() => {
                console.log("[v0] Reconnecting to Deriv WebSocket...")
                this.connect().catch((err) => {
                  console.error("[v0] Reconnection failed:", err)
                })
              }, delay)
            } else if (this.reconnectAttempts >= this.maxReconnectAttempts) {
              console.error("[v0] Max reconnection attempts reached. Please refresh the page.")
            }
          }
        }
      } catch (error) {
        this.connectionPromise = null
        reject(error)
      }
    })

    return this.connectionPromise
  }

  private startHeartbeat(): void {
    this.stopHeartbeat()

    this.heartbeatInterval = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        console.log("[v0] Sending heartbeat ping to keep connection alive")
        this.send({
          ping: 1,
        })
      }
    }, 30000) // 30 seconds
  }

  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval)
      this.heartbeatInterval = null
    }
  }

  private async authorize(): Promise<void> {
    // Stricter checks for active authorization requests
    if (this.authorizedAccount || this.isAuthorizing || this.authRequestInFlight) {
      console.log("[v0] Already authorized or authorization in progress, skipping")
      return Promise.resolve()
    }

    this.isAuthorizing = true
    this.authRequestInFlight = true

    return new Promise((resolve, reject) => {
      const reqId = this.messageId++

      this.callbacks.set(reqId, (data) => {
        this.isAuthorizing = false
        this.authRequestInFlight = false

        if (data.error) {
          console.error("[v0] Deriv API authorization failed:", data.error.message)
          this.authorizedAccount = null
          reject(new Error(data.error.message))
        } else {
          console.log("[v0] Deriv API authorized successfully for account:", data.authorize?.loginid)
          this.authorizationAttempted = true
          this.authorizedAccount = data.authorize?.loginid
          resolve()
        }
      })

      this.send({
        authorize: this.apiToken,
        req_id: reqId,
      })
    })
  }

  private send(message: any): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message))
    } else {
      console.warn("[v0] WebSocket not ready, message not sent:", message)
    }
  }

  async getActiveSymbols(): Promise<any> {
    return new Promise((resolve, reject) => {
      const reqId = this.messageId++
      this.callbacks.set(reqId, (data) => {
        if (data.error) {
          reject(new Error(data.error.message))
        } else {
          const syntheticSymbols = data.active_symbols.filter((symbol: any) => symbol.market === "synthetic_index")
          console.log(`[v0] Found ${syntheticSymbols.length} synthetic symbols`)
          resolve(syntheticSymbols)
        }
      })

      this.send({
        active_symbols: "brief",
        product_type: "basic",
        req_id: reqId,
      })
    })
  }

  async getTicks(symbol: string, count = 10): Promise<any> {
    return new Promise((resolve, reject) => {
      const reqId = this.messageId++
      this.callbacks.set(reqId, (data) => {
        if (data.error) {
          reject(new Error(data.error.message))
        } else {
          resolve(data.history)
        }
      })

      this.send({
        ticks_history: symbol,
        adjust_start_time: 1,
        count: count,
        end: "latest",
        start: 1,
        style: "ticks",
        req_id: reqId,
      })
    })
  }

  async getCandles(symbol: string, granularity = 60, count = 50): Promise<DerivCandle> {
    return new Promise((resolve, reject) => {
      const reqId = this.messageId++
      this.callbacks.set(reqId, (data) => {
        if (data.error) {
          reject(new Error(data.error.message))
        } else {
          resolve(data as DerivCandle)
        }
      })

      this.send({
        ticks_history: symbol,
        adjust_start_time: 1,
        count: count,
        end: "latest",
        granularity: granularity,
        start: 1,
        style: "candles",
        req_id: reqId,
      })
    })
  }

  subscribeTicks(symbol: string, callback: (tick: DerivTick) => void): void {
    console.log(`[v0] Subscribing to live ticks for ${symbol}`)
    this.tickSubscriptions.set(symbol, callback)
    const reqId = this.messageId++

    this.send({
      ticks: symbol,
      subscribe: 1,
      req_id: reqId,
    })
  }

  unsubscribeTicks(symbol: string): void {
    console.log(`[v0] Unsubscribing from ticks for ${symbol}`)
    this.tickSubscriptions.delete(symbol)
    const reqId = this.messageId++

    this.send({
      forget_all: "ticks",
      req_id: reqId,
    })
  }

  async analyzeForPrediction(symbol: string, predictionType: string): Promise<PredictionResult> {
    try {
      this.isAnalyzing = true
      console.log(`[v0] Starting analysis for ${symbol} (${predictionType})...`)

      if (!this.isConnectedToAPI()) {
        console.log("[v0] Not connected, waiting for connection...")

        if (!this.connectionPromise) {
          this.connect().catch((err) => console.error("[v0] Connection failed:", err))
        }

        const maxWaitTime = 10000
        const startTime = Date.now()

        while (!this.isConnectedToAPI() && Date.now() - startTime < maxWaitTime) {
          await new Promise((resolve) => setTimeout(resolve, 500))

          if (this.connectionPromise) {
            try {
              await Promise.race([
                this.connectionPromise,
                new Promise((_, reject) => setTimeout(() => reject(new Error("Connection timeout")), 5000)),
              ])
            } catch (err) {
              console.log("[v0] Connection attempt failed, retrying...")
            }
          }
        }

        if (!this.isConnectedToAPI()) {
          throw new Error("Unable to establish connection. Please check your internet connection and try again.")
        }
      }

      if (this.ws?.readyState !== WebSocket.OPEN) {
        console.log("[v0] WebSocket not open, attempting to reconnect...")
        await this.connect()
        await new Promise((resolve) => setTimeout(resolve, 1000))

        if (this.ws?.readyState !== WebSocket.OPEN) {
          throw new Error("WebSocket connection unavailable. Please try again.")
        }
      }

      console.log("[v0] Fetching market data for analysis...")
      const [ticks, candles] = await Promise.race([
        Promise.all([this.getTicks(symbol, 20), this.getCandles(symbol, 60, 30)]),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error("Data fetch timeout")), 15000)),
      ])

      console.log("[v0] Market data received, performing analysis...")

      const lastTick = ticks.prices[ticks.prices.length - 1]
      const lastDigit = extractLastDigit(lastTick)
      const recentPrices = ticks.prices.slice(-10)

      const trend = this.calculateTrend(recentPrices)
      const volatility = this.calculateVolatility(recentPrices)
      const digitFrequency = this.analyzeDigitFrequency(ticks.prices)

      let prediction: PredictionResult

      switch (predictionType) {
        case "over_under":
          prediction = this.predictOverUnder(lastDigit, digitFrequency, trend, volatility)
          break
        case "even_odd":
          prediction = this.predictEvenOdd(lastDigit, digitFrequency, trend)
          break
        case "rise_fall":
          prediction = this.predictRiseFall(trend, volatility, candles)
          break
        case "matches_differs":
          prediction = this.predictMatchesDiffers(lastDigit, digitFrequency, trend)
          break
        default:
          throw new Error("Unknown prediction type")
      }

      prediction.symbol = symbol
      prediction.entryPoint = lastTick

      console.log("[v0] Analysis completed successfully")
      return prediction
    } catch (error) {
      console.error("[v0] Error analyzing for prediction:", error)
      throw error
    } finally {
      this.isAnalyzing = false
    }
  }

  private calculateTrend(prices: number[]): number {
    if (prices.length < 2) return 0
    const first = prices[0]
    const last = prices[prices.length - 1]
    return (last - first) / first
  }

  private calculateVolatility(prices: number[]): number {
    if (prices.length < 2) return 0
    const mean = prices.reduce((sum, price) => sum + price, 0) / prices.length
    const variance = prices.reduce((sum, price) => sum + Math.pow(price - mean, 2), 0) / prices.length
    return Math.sqrt(variance) / mean
  }

  private analyzeDigitFrequency(prices: number[]): { [key: number]: number } {
    const frequency: { [key: number]: number } = {}
    for (let i = 0; i <= 9; i++) frequency[i] = 0

    prices.forEach((price) => {
      const digit = extractLastDigit(price)
      frequency[digit]++
    })

    return frequency
  }

  private predictOverUnder(
    lastDigit: number,
    frequency: { [key: number]: number },
    trend: number,
    volatility: number,
  ): PredictionResult {
    const overCount = Object.keys(frequency)
      .filter((d) => Number.parseInt(d) > 4)
      .reduce((sum, d) => sum + frequency[Number.parseInt(d)], 0)
    const underCount = Object.keys(frequency)
      .filter((d) => Number.parseInt(d) < 5)
      .reduce((sum, d) => sum + frequency[Number.parseInt(d)], 0)

    const overProbability = overCount / (overCount + underCount)
    let confidence = Math.abs(overProbability - 0.5) * 2

    const trendFactor = Math.abs(trend) * 0.3
    const volatilityFactor = Math.max(0, (0.02 - volatility) * 10)

    confidence = confidence + trendFactor + volatilityFactor

    confidence = Math.max(15, Math.min(95, confidence * 100))

    const prediction = overProbability > 0.5 ? "over" : "under"
    const riskLevel = volatility > 0.02 ? "high" : volatility > 0.01 ? "medium" : "low"

    const targetDigits = prediction === "over" ? [5, 6, 7, 8, 9] : [0, 1, 2, 3, 4]
    const weightedDigits = targetDigits.map((digit) => ({
      digit,
      weight: frequency[digit] + Math.random() * 0.3,
    }))
    const targetDigit = weightedDigits.sort((a, b) => b.weight - a.weight)[0].digit

    return {
      symbol: "",
      prediction: prediction as "over" | "under",
      targetDigit,
      confidence: Math.round(confidence),
      entryPoint: 0,
      recommendation: `Based on recent digit analysis, ${prediction} shows ${Math.round(confidence)}% probability`,
      analysis: `Last digit: ${lastDigit}, Target digit: ${targetDigit}, Over frequency: ${Math.round(overProbability * 100)}%, Trend: ${trend > 0 ? "bullish" : "bearish"}`,
      riskLevel,
      optimalTiming: volatility > 0.015 ? "Wait for lower volatility" : "Good entry conditions",
    }
  }

  private predictEvenOdd(lastDigit: number, frequency: { [key: number]: number }, trend: number): PredictionResult {
    const evenCount = [0, 2, 4, 6, 8].reduce((sum, d) => sum + frequency[d], 0)
    const oddCount = [1, 3, 5, 7, 9].reduce((sum, d) => sum + frequency[d], 0)

    const evenProbability = evenCount / (evenCount + oddCount)
    let confidence = Math.abs(evenProbability - 0.5) * 2

    const trendFactor = Math.abs(trend) * 0.2
    confidence = confidence + trendFactor

    confidence = Math.max(20, Math.min(90, confidence * 100))

    const prediction = evenProbability > 0.5 ? "even" : "odd"

    const targetDigits = prediction === "even" ? [0, 2, 4, 6, 8] : [1, 3, 5, 7, 9]
    const weightedDigits = targetDigits.map((digit) => ({
      digit,
      weight: frequency[digit] + Math.random() * 0.4,
    }))
    const targetDigit = weightedDigits.sort((a, b) => b.weight - a.weight)[0].digit

    return {
      symbol: "",
      prediction: prediction as "even" | "odd",
      targetDigit,
      confidence: Math.round(confidence),
      entryPoint: 0,
      recommendation: `${prediction} digits show ${Math.round(confidence)}% probability based on recent patterns`,
      analysis: `Last digit: ${lastDigit} (${lastDigit % 2 === 0 ? "even" : "odd"}), Target digit: ${targetDigit}, Even frequency: ${Math.round(evenProbability * 100)}%`,
      riskLevel: confidence > 60 ? "low" : confidence > 40 ? "medium" : "high",
      optimalTiming: "Ready for entry",
    }
  }

  private predictRiseFall(trend: number, volatility: number, candles: DerivCandle): PredictionResult {
    let confidence = Math.abs(trend) * 100

    const volatilityFactor = Math.max(0, (0.03 - volatility) * 500)
    confidence = confidence + volatilityFactor

    if (candles.candles && candles.candles.length >= 3) {
      const recentCandles = candles.candles.slice(-3)
      const momentum = recentCandles.every((c) => c.close > c.open) || recentCandles.every((c) => c.close < c.open)
      if (momentum) confidence += 15
    }

    confidence = Math.max(25, Math.min(95, confidence))

    const prediction = trend > 0 ? "rise" : "fall"
    const riskLevel = volatility > 0.02 ? "high" : volatility > 0.01 ? "medium" : "low"

    return {
      symbol: "",
      prediction: prediction as "rise" | "fall",
      confidence: Math.round(confidence),
      entryPoint: 0,
      recommendation: `Market shows ${prediction} tendency with ${Math.round(confidence)}% confidence`,
      analysis: `Trend: ${(trend * 100).toFixed(2)}%, Volatility: ${(volatility * 100).toFixed(2)}%`,
      riskLevel,
      optimalTiming: riskLevel === "low" ? "Optimal entry window" : "Consider waiting for stability",
    }
  }

  private predictMatchesDiffers(
    lastDigit: number,
    frequency: { [key: number]: number },
    trend: number,
  ): PredictionResult {
    const totalCount = Object.values(frequency).reduce((sum, count) => sum + count, 0)
    const digitProbability = frequency[lastDigit] / totalCount

    let confidence = Math.abs(digitProbability - 0.1) * 5

    const trendFactor = Math.abs(trend) * 0.3
    confidence = confidence + trendFactor

    const recentAppearances = Object.keys(frequency).filter((d) => Number.parseInt(d) === lastDigit).length

    if (recentAppearances > 0) {
      confidence += 0.2
    }

    confidence = Math.max(30, Math.min(85, confidence * 100))

    const prediction = digitProbability > 0.1 ? "matches" : "differs"

    let targetDigit = lastDigit
    if (prediction === "differs") {
      const otherDigits = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].filter((d) => d !== lastDigit)
      const weightedOthers = otherDigits.map((digit) => ({
        digit,
        weight: frequency[digit] + Math.random() * 0.5,
      }))
      targetDigit = weightedOthers.sort((a, b) => b.weight - a.weight)[0].digit
    }

    return {
      symbol: "",
      prediction: prediction as "matches" | "differs",
      targetDigit,
      confidence: Math.round(confidence),
      entryPoint: 0,
      recommendation: `Target digit ${targetDigit} ${prediction} with ${Math.round(confidence)}% confidence`,
      analysis: `Last digit: ${lastDigit}, Target digit: ${targetDigit}, Digit ${lastDigit} frequency: ${Math.round(digitProbability * 100)}%, Recent trend: ${trend > 0 ? "up" : "down"}`,
      riskLevel: confidence > 60 ? "low" : confidence > 45 ? "medium" : "high",
      optimalTiming: "Good entry conditions detected",
    }
  }

  disconnect(): void {
    this.stopHeartbeat()
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout)
      this.reconnectTimeout = null
    }
    if (this.ws) {
      this.ws.close(1000, "User initiated disconnect")
      this.isConnected = false
      this.authorizationAttempted = false
      this.authorizedAccount = null // Reset authorized state on disconnect
    }
    this.connectionPromise = null
    this.currentWsId = null // Reset unique WebSocket ID on disconnect
  }

  isConnectedToAPI(): boolean {
    return this.isConnected && this.ws?.readyState === WebSocket.OPEN
  }
}

let derivAPIInstance: DerivAPI | null = null

export const getDerivAPI = (): DerivAPI => {
  if (!derivAPIInstance) {
    derivAPIInstance = DerivAPI.getInstance("2jJrchpytEWU9Ef")
  }
  return derivAPIInstance
}

export default DerivAPI
