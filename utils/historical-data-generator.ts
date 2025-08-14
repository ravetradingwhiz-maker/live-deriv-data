import type { ChartData } from "@/types/trading"
import { calculateAllIndicators } from "@/utils/technical-indicators"

export function generateHistoricalData(basePrice = 100, periods = 500, volatility = 0.02): ChartData[] {
  const data: ChartData[] = []
  let currentPrice = basePrice
  const startTime = Date.now() - periods * 60000 // 1 minute intervals

  for (let i = 0; i < periods; i++) {
    // Generate realistic price movement using random walk with trend
    const trend = Math.sin(i / 50) * 0.001 // Subtle trend component
    const randomChange = (Math.random() - 0.5) * volatility
    const priceChange = trend + randomChange

    currentPrice = currentPrice * (1 + priceChange)

    // Generate OHLC data
    const high = currentPrice * (1 + Math.random() * 0.01)
    const low = currentPrice * (1 - Math.random() * 0.01)
    const open = i === 0 ? currentPrice : data[i - 1].close
    const close = currentPrice

    const timestamp = startTime + i * 60000
    const volume = Math.floor(Math.random() * 1000) + 100

    const candle = {
      timestamp,
      open,
      high: Math.max(open, close, high),
      low: Math.min(open, close, low),
      close,
      volume,
      time: new Date(timestamp).toLocaleTimeString(),
      color: close >= open ? "#22c55e" : "#ef4444",
    }

    data.push(candle)
  }

  // Calculate indicators for all data points
  return data.map((candle, index) => {
    const historicalData = data.slice(0, index + 1)
    const indicators = calculateAllIndicators(historicalData)

    return {
      ...candle,
      ...indicators,
    }
  })
}
