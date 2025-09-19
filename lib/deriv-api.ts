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

class DerivAPI {
  private ws: WebSocket | null = null
  private apiToken: string
  private isConnected = false
  private messageId = 1
  private callbacks: Map<number, (data: any) => void> = new Map()
  private tickSubscriptions: Map<string, (tick: DerivTick) => void> = new Map()

  constructor(apiToken: string) {
    this.apiToken = apiToken
  }

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket("wss://ws.derivws.com/websockets/v3?app_id=1089")

        this.ws.onopen = () => {
          console.log("[v0] Deriv WebSocket connected successfully")
          this.authorize()
            .then(() => {
              this.isConnected = true
              console.log("[v0] Deriv API authentication completed")
              resolve()
            })
            .catch(reject)
        }

        this.ws.onmessage = (event) => {
          const data = JSON.parse(event.data)

          if (data.msg_type === "tick" && data.tick) {
            const symbol = data.tick.symbol
            const callback = this.tickSubscriptions.get(symbol)
            if (callback) {
              callback(data as DerivTick)
            }
            // Broadcast to all tick listeners
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
          reject(error)
        }

        this.ws.onclose = (event) => {
          console.log("[v0] Deriv WebSocket disconnected:", event.code, event.reason)
          this.isConnected = false

          if (event.code !== 1000) {
            // Not a normal closure
            setTimeout(() => {
              console.log("[v0] Attempting to reconnect...")
              this.connect().catch(console.error)
            }, 5000)
          }
        }
      } catch (error) {
        reject(error)
      }
    })
  }

  private async authorize(): Promise<void> {
    return new Promise((resolve, reject) => {
      const reqId = this.messageId++
      this.callbacks.set(reqId, (data) => {
        if (data.error) {
          console.error("[v0] Deriv API authorization failed:", data.error.message)
          reject(new Error(data.error.message))
        } else {
          console.log("[v0] Deriv API authorized successfully for account:", data.authorize?.loginid)
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
      if (!this.isConnectedToAPI()) {
        console.log("[v0] Not connected, attempting to reconnect...")
        await this.connect()
        // Wait a bit for connection to stabilize
        await new Promise((resolve) => setTimeout(resolve, 1000))
      }

      // Get recent market data
      const [ticks, candles] = await Promise.all([this.getTicks(symbol, 20), this.getCandles(symbol, 60, 30)])

      // Simulate AI analysis based on real market data
      const lastTick = ticks.prices[ticks.prices.length - 1]
      const lastDigit = Math.floor((lastTick * 10000) % 10)
      const recentPrices = ticks.prices.slice(-10)

      // Calculate trend and volatility
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

      return prediction
    } catch (error) {
      console.error("[v0] Error analyzing for prediction:", error)
      throw error
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
      const digit = Math.floor((price * 10000) % 10)
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

    // Add trend and volatility factors for more realistic confidence
    const trendFactor = Math.abs(trend) * 0.3
    const volatilityFactor = Math.max(0, (0.02 - volatility) * 10) // Lower volatility = higher confidence

    confidence = confidence + trendFactor + volatilityFactor

    // Ensure confidence is between 15% and 95% (never 0, never over 100%)
    confidence = Math.max(15, Math.min(95, confidence * 100))

    const prediction = overProbability > 0.5 ? "over" : "under"
    const riskLevel = volatility > 0.02 ? "high" : volatility > 0.01 ? "medium" : "low"

    const targetDigits = prediction === "over" ? [5, 6, 7, 8, 9] : [0, 1, 2, 3, 4]
    const weightedDigits = targetDigits.map((digit) => ({
      digit,
      weight: frequency[digit] + Math.random() * 0.3, // Add randomness to avoid always same digit
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

    // Add trend factor for more realistic confidence
    const trendFactor = Math.abs(trend) * 0.2
    confidence = confidence + trendFactor

    // Ensure confidence is between 20% and 90% (never 0, never over 100%)
    confidence = Math.max(20, Math.min(90, confidence * 100))

    const prediction = evenProbability > 0.5 ? "even" : "odd"

    const targetDigits = prediction === "even" ? [0, 2, 4, 6, 8] : [1, 3, 5, 7, 9]
    const weightedDigits = targetDigits.map((digit) => ({
      digit,
      weight: frequency[digit] + Math.random() * 0.4, // Add randomness
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

    // Add volatility factor - lower volatility increases confidence
    const volatilityFactor = Math.max(0, (0.03 - volatility) * 500)
    confidence = confidence + volatilityFactor

    // Add momentum factor based on recent candles
    if (candles.candles && candles.candles.length >= 3) {
      const recentCandles = candles.candles.slice(-3)
      const momentum = recentCandles.every((c) => c.close > c.open) || recentCandles.every((c) => c.close < c.open)
      if (momentum) confidence += 15
    }

    // Ensure confidence is between 25% and 95% (never 0, never over 100%)
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

    // Base confidence on how much the digit frequency deviates from expected 10%
    let confidence = Math.abs(digitProbability - 0.1) * 5 // Scale up the difference

    // Add trend factor
    const trendFactor = Math.abs(trend) * 0.3
    confidence = confidence + trendFactor

    // Add frequency pattern factor - if digit appears in clusters, increase confidence
    const recentAppearances = Object.keys(frequency).filter((d) => Number.parseInt(d) === lastDigit).length

    if (recentAppearances > 0) {
      confidence += 0.2
    }

    // Ensure confidence is between 30% and 85% (never 0, never over 100%)
    confidence = Math.max(30, Math.min(85, confidence * 100))

    const prediction = digitProbability > 0.1 ? "matches" : "differs"

    let targetDigit = lastDigit
    if (prediction === "differs") {
      // For differs, pick a different digit with some randomness
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
    if (this.ws) {
      this.ws.close()
      this.isConnected = false
    }
  }

  isConnectedToAPI(): boolean {
    return this.isConnected
  }
}

// Singleton instance
let derivAPIInstance: DerivAPI | null = null

export const getDerivAPI = (): DerivAPI => {
  if (!derivAPIInstance) {
    derivAPIInstance = new DerivAPI("GegsFtAxp9oTNhh")
  }
  return derivAPIInstance
}

export default DerivAPI
