"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import type { Market, CandleData, ChartData } from "@/types/trading"
import { VOLATILITY_INDICES } from "@/types/trading"
import { calculateAllIndicators } from "@/utils/technical-indicators"
import DerivAPI from "@/lib/deriv-api" // Fixed import: DerivAPI is a default export, not a named export

const WS_URL = "wss://ws.derivws.com/websockets/v3?app_id=115912"
const CANDLE_INTERVAL = 60000 // 1 minute in milliseconds
const API_TOKEN = "2jJrchpytEWU9Ef" // Updated API token

const derivApi = new DerivAPI(API_TOKEN)

function extractLastDigit(quote: number): number {
  // Convert to string and remove trailing zeros after decimal
  let quoteStr = quote.toString()

  // If there's a decimal point, remove trailing zeros
  if (quoteStr.includes(".")) {
    quoteStr = quoteStr.replace(/\.?0+$/, "")
  }

  // Remove decimal point and get last character
  const digitsOnly = quoteStr.replace(".", "")
  const lastChar = digitsOnly.slice(-1)
  const digit = Number.parseInt(lastChar, 10)

  return isNaN(digit) ? 0 : digit
}

export function useDerivWebSocket() {
  const [status, setStatus] = useState("Connecting...")
  const [markets, setMarkets] = useState<Market[]>([])
  const [subscribedSymbol, setSubscribedSymbol] = useState<string | null>(null)
  const [ticksBuffer, setTicksBuffer] = useState<number[]>([])
  const [lastTick, setLastTick] = useState<{ digit: number; quote: number } | null>(null)
  const [candleData, setCandleData] = useState<ChartData[]>([])
  const [currentCandle, setCurrentCandle] = useState<CandleData | null>(null)
  const [rawCandleHistory, setRawCandleHistory] = useState<CandleData[]>([])
  const [connectionAttempts, setConnectionAttempts] = useState(0)
  const [isAuthorized, setIsAuthorized] = useState(false)
  const isAuthorizing = useRef(false) // Added ref to track authorization status

  const indicatorState = useRef<{
    ema12?: number
    ema26?: number
    macdHistory: number[]
  }>({ macdHistory: [] })

  const MAX_BUFFER = 200
  const MAX_RECONNECT_ATTEMPTS = 5
  const RECONNECT_DELAY = 3000

  const calculateIndicatorsForCandles = useCallback((candles: CandleData[]): ChartData[] => {
    return candles.map((candle, index) => {
      const historicalData = candles.slice(0, index + 1)
      const indicators = calculateAllIndicators(
        historicalData,
        index === candles.length - 1 ? indicatorState.current : undefined,
      )

      // Update indicator state for the latest candle
      if (index === candles.length - 1) {
        indicatorState.current = {
          ema12: indicators.ema12,
          ema26: indicators.ema26,
          macdHistory:
            indicators.macd !== undefined
              ? [...indicatorState.current.macdHistory, indicators.macd].slice(-9)
              : indicatorState.current.macdHistory,
        }
      }

      return {
        ...candle,
        ...indicators,
        time: new Date(candle.timestamp).toLocaleTimeString(),
        color: candle.close >= candle.open ? "#22c55e" : "#ef4444",
      }
    })
  }, [])

  const processTick = useCallback(
    (quote: number, timestamp: number) => {
      const candleTime = Math.floor(timestamp / CANDLE_INTERVAL) * CANDLE_INTERVAL

      setCurrentCandle((prev) => {
        if (!prev || prev.timestamp !== candleTime) {
          // Start new candle
          const newCandle: CandleData = {
            timestamp: candleTime,
            open: quote,
            high: quote,
            low: quote,
            close: quote,
            volume: 1,
          }

          // Add previous candle to history if it exists
          if (prev) {
            setRawCandleHistory((prevHistory) => {
              const newHistory = [...prevHistory, prev]
              const limitedHistory = newHistory.length > 100 ? newHistory.slice(-100) : newHistory

              // Recalculate indicators for all candles
              const chartData = calculateIndicatorsForCandles(limitedHistory)
              setCandleData(chartData.slice(-50)) // Keep last 50 for display

              return limitedHistory
            })
          }

          return newCandle
        } else {
          // Update existing candle
          return {
            ...prev,
            high: Math.max(prev.high, quote),
            low: Math.min(prev.low, quote),
            close: quote,
            volume: prev.volume + 1,
          }
        }
      })
    },
    [calculateIndicatorsForCandles],
  )

  const connect = useCallback(async () => {
    if (isAuthorizing.current) return

    try {
      isAuthorizing.current = true
      setStatus("Connecting to Deriv API...")

      await derivApi.connect()

      setIsAuthorized(true)
      isAuthorizing.current = false
      setConnectionAttempts(0)

      // Restricted the markets list to ONLY the specific volatilities requested
      setMarkets(VOLATILITY_INDICES)

      setStatus("Connected — Select a market to start analysis")
    } catch (error: any) {
      console.error("[v0] Connection failed:", error)
      setStatus(`Connection failed: ${error.message}`)
      isAuthorizing.current = false

      if (connectionAttempts < MAX_RECONNECT_ATTEMPTS) {
        setConnectionAttempts((prev) => prev + 1)
        setTimeout(connect, RECONNECT_DELAY)
      }
    }
  }, [connectionAttempts])

  const subscribeTicks = useCallback(
    (symbol: string) => {
      if (!isAuthorized) {
        setStatus("Not connected - Cannot start analysis")
        return
      }

      if (subscribedSymbol) {
        derivApi.unsubscribeTicks(subscribedSymbol)
      }

      setSubscribedSymbol(symbol)
      setTicksBuffer([])
      setLastTick(null)

      derivApi.subscribeTicks(symbol, (data) => {
        const quote = data.tick.quote
        const digit = extractLastDigit(quote)

        setLastTick({ digit, quote })
        setTicksBuffer((prev) => [...prev, digit].slice(-MAX_BUFFER))
        processTick(quote, Date.now())
      })

      setStatus(`Analyzing ${symbol}...`)
    },
    [isAuthorized, subscribedSymbol, processTick],
  )

  const unsubscribeTicks = useCallback(() => {
    if (!isAuthorized) return

    derivApi.unsubscribeTicks(subscribedSymbol)

    setSubscribedSymbol(null)
    setTicksBuffer([])
    setLastTick(null)
    setCurrentCandle(null)
    setRawCandleHistory([])
    setCandleData([])
    indicatorState.current = { macdHistory: [] }
    setStatus("Analysis stopped")
  }, [isAuthorized, subscribedSymbol])

  // Initialize connection on mount
  useEffect(() => {
    let mounted = true

    if (mounted && !isAuthorized) {
      connect()
    }

    return () => {
      mounted = false
      derivApi.disconnect()
    }
  }, []) // Empty dependency array to run only once on mount

  return {
    status,
    markets,
    subscribedSymbol,
    ticksBuffer,
    lastTick,
    candleData,
    currentCandle,
    subscribeTicks,
    unsubscribeTicks,
    isConnected: isAuthorized,
    connectionAttempts,
    reconnect: connect,
    isAuthorized,
  }
}
