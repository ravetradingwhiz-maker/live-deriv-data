export interface IndicatorData {
  sma20?: number
  sma50?: number
  ema12?: number
  ema26?: number
  rsi?: number
  macd?: number
  macdSignal?: number
  macdHistogram?: number
  bollingerUpper?: number
  bollingerMiddle?: number
  bollingerLower?: number
}

export interface PriceData {
  close: number
  high: number
  low: number
}

// Simple Moving Average
export function calculateSMA(prices: number[], period: number): number | undefined {
  if (prices.length < period) return undefined
  const sum = prices.slice(-period).reduce((a, b) => a + b, 0)
  return sum / period
}

// Exponential Moving Average
export function calculateEMA(prices: number[], period: number, previousEMA?: number): number | undefined {
  if (prices.length === 0) return undefined

  const currentPrice = prices[prices.length - 1]
  const multiplier = 2 / (period + 1)

  if (previousEMA === undefined) {
    // Use SMA as initial EMA
    return calculateSMA(prices, period)
  }

  return currentPrice * multiplier + previousEMA * (1 - multiplier)
}

// Relative Strength Index
export function calculateRSI(prices: number[], period = 14): number | undefined {
  if (prices.length < period + 1) return undefined

  const changes = []
  for (let i = 1; i < prices.length; i++) {
    changes.push(prices[i] - prices[i - 1])
  }

  const recentChanges = changes.slice(-period)
  const gains = recentChanges.filter((change) => change > 0)
  const losses = recentChanges.filter((change) => change < 0).map((loss) => Math.abs(loss))

  const avgGain = gains.length > 0 ? gains.reduce((a, b) => a + b, 0) / period : 0
  const avgLoss = losses.length > 0 ? losses.reduce((a, b) => a + b, 0) / period : 0

  if (avgLoss === 0) return 100

  const rs = avgGain / avgLoss
  return 100 - 100 / (1 + rs)
}

// MACD (Moving Average Convergence Divergence)
export function calculateMACD(
  prices: number[],
  fastPeriod = 12,
  slowPeriod = 26,
  signalPeriod = 9,
  previousEMA12?: number,
  previousEMA26?: number,
  macdHistory: number[] = [],
): { macd: number | undefined; signal: number | undefined; histogram: number | undefined } {
  const ema12 = calculateEMA(prices, fastPeriod, previousEMA12)
  const ema26 = calculateEMA(prices, slowPeriod, previousEMA26)

  if (ema12 === undefined || ema26 === undefined) {
    return { macd: undefined, signal: undefined, histogram: undefined }
  }

  const macd = ema12 - ema26
  const macdWithHistory = [...macdHistory, macd].slice(-signalPeriod)
  const signal = calculateSMA(macdWithHistory, signalPeriod)
  const histogram = signal !== undefined ? macd - signal : undefined

  return { macd, signal, histogram }
}

// Bollinger Bands
export function calculateBollingerBands(
  prices: number[],
  period = 20,
  stdDev = 2,
): { upper: number | undefined; middle: number | undefined; lower: number | undefined } {
  if (prices.length < period) {
    return { upper: undefined, middle: undefined, lower: undefined }
  }

  const recentPrices = prices.slice(-period)
  const middle = calculateSMA(recentPrices, period)

  if (middle === undefined) {
    return { upper: undefined, middle: undefined, lower: undefined }
  }

  // Calculate standard deviation
  const variance = recentPrices.reduce((sum, price) => sum + Math.pow(price - middle, 2), 0) / period
  const standardDeviation = Math.sqrt(variance)

  const upper = middle + standardDeviation * stdDev
  const lower = middle - standardDeviation * stdDev

  return { upper, middle, lower }
}

// Calculate all indicators for a dataset
export function calculateAllIndicators(
  priceData: PriceData[],
  previousIndicators?: {
    ema12?: number
    ema26?: number
    macdHistory?: number[]
  },
): IndicatorData {
  const closePrices = priceData.map((d) => d.close)

  const sma20 = calculateSMA(closePrices, 20)
  const sma50 = calculateSMA(closePrices, 50)
  const ema12 = calculateEMA(closePrices, 12, previousIndicators?.ema12)
  const ema26 = calculateEMA(closePrices, 26, previousIndicators?.ema26)
  const rsi = calculateRSI(closePrices, 14)

  const macdResult = calculateMACD(
    closePrices,
    12,
    26,
    9,
    previousIndicators?.ema12,
    previousIndicators?.ema26,
    previousIndicators?.macdHistory || [],
  )

  const bollinger = calculateBollingerBands(closePrices, 20, 2)

  return {
    sma20,
    sma50,
    ema12,
    ema26,
    rsi,
    macd: macdResult.macd,
    macdSignal: macdResult.signal,
    macdHistogram: macdResult.histogram,
    bollingerUpper: bollinger.upper,
    bollingerMiddle: bollinger.middle,
    bollingerLower: bollinger.lower,
  }
}
