"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import type { Market, WebSocketMessage, CandleData, ChartData } from "@/types/trading"
import { calculateAllIndicators } from "@/utils/technical-indicators"

// Use a valid Deriv app ID - you should register your own app at api.deriv.com
const APP_ID = 1089 // This is a demo app ID, replace with your own
const WS_URL = `wss://ws.derivws.com/websockets/v3?app_id=${APP_ID}`
const CANDLE_INTERVAL = 60000 // 1 minute in milliseconds

export function useDerivWebSocket() {
  const [ws, setWs] = useState<WebSocket | null>(null)
  const [status, setStatus] = useState("Connecting...")
  const [markets, setMarkets] = useState<Market[]>([])
  const [subscribedSymbol, setSubscribedSymbol] = useState<string | null>(null)
  const [ticksBuffer, setTicksBuffer] = useState<number[]>([])
  const [lastTick, setLastTick] = useState<{ digit: number; quote: number } | null>(null)
  const [candleData, setCandleData] = useState<ChartData[]>([])
  const [currentCandle, setCurrentCandle] = useState<CandleData | null>(null)
  const [rawCandleHistory, setRawCandleHistory] = useState<CandleData[]>([])
  const [connectionAttempts, setConnectionAttempts] = useState(0)

  const keepAliveTimer = useRef<NodeJS.Timeout | null>(null)
  const reconnectTimer = useRef<NodeJS.Timeout | null>(null)
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

  const handleWebSocketMessage = useCallback(
    (event: MessageEvent) => {
      try {
        const data: WebSocketMessage = JSON.parse(event.data)

        // Handle ping response
        if (data.ping) {
          return
        }

        // Handle error messages
        if (data.error) {
          console.error("Deriv API Error:", data.error)
          setStatus(`Error: ${data.error.message || "Unknown error"}`)
          return
        }

        // Handle active symbols response
        if (data.active_symbols) {
          const volSymbols = data.active_symbols
            .filter((s) => {
              // Filter for volatility indices and synthetic indices
              return (
                /volatility/i.test(s.display_name) ||
                /synthetic/i.test(s.display_name) ||
                s.symbol.startsWith("R_") ||
                s.symbol.startsWith("RDBEAR") ||
                s.symbol.startsWith("RDBULL")
              )
            })
            .reduce((acc: Market[], s) => {
              // Remove duplicates based on display_name
              if (!acc.find((x) => x.display_name === s.display_name)) {
                acc.push({
                  symbol: s.symbol,
                  display_name: s.display_name,
                })
              }
              return acc
            }, [])
            .sort((a, b) => a.display_name.localeCompare(b.display_name))

          setMarkets(volSymbols)
          setStatus(
            volSymbols.length
              ? "Connected — Select a market to start analysis"
              : "Connected — No volatility markets found",
          )
          setConnectionAttempts(0) // Reset connection attempts on successful connection
        }

        // Handle tick data
        if (data.tick) {
          const tickData = data.tick

          // Validate tick data
          if (typeof tickData.quote !== "number" || !tickData.symbol) {
            console.warn("Invalid tick data received:", tickData)
            return
          }

          // Extract last digit from quote
          const quoteStr = tickData.quote.toFixed(5) // Ensure consistent decimal places
          const lastDigitStr = quoteStr.replace(".", "").slice(-1)
          const digit = Number.parseInt(lastDigitStr, 10)

          if (!isNaN(digit) && digit >= 0 && digit <= 9) {
            setTicksBuffer((prev) => {
              const newBuffer = [...prev, digit]
              return newBuffer.length > MAX_BUFFER ? newBuffer.slice(1) : newBuffer
            })

            setLastTick({
              digit,
              quote: tickData.quote,
            })

            // Process tick for candlestick chart
            processTick(tickData.quote, Date.now())
          }
        }

        // Handle subscription confirmation
        if (data.subscription) {
          setStatus(`Analysis started for ${data.subscription.id}`)
        }
      } catch (error) {
        console.error("Error parsing WebSocket message:", error)
        setStatus("Error parsing server response")
      }
    },
    [processTick],
  )

  const connect = useCallback(() => {
    // Don't attempt to reconnect if we've exceeded max attempts
    if (connectionAttempts >= MAX_RECONNECT_ATTEMPTS) {
      setStatus("Connection failed - Max attempts reached")
      return
    }

    // Close existing connection if any
    if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) {
      ws.close()
    }

    setStatus("Connecting to Deriv API...")
    setConnectionAttempts((prev) => prev + 1)

    try {
      const websocket = new WebSocket(WS_URL)

      websocket.addEventListener("open", () => {
        console.log("Connected to Deriv WebSocket API")
        setStatus("Connected — Fetching markets...")

        // Request active symbols for volatility indices
        websocket.send(
          JSON.stringify({
            active_symbols: "brief",
            req_id: Date.now(),
          }),
        )

        // Set up keep alive ping
        if (keepAliveTimer.current) clearInterval(keepAliveTimer.current)
        keepAliveTimer.current = setInterval(() => {
          if (websocket.readyState === WebSocket.OPEN) {
            websocket.send(
              JSON.stringify({
                ping: 1,
                req_id: Date.now(),
              }),
            )
          }
        }, 30000) // Ping every 30 seconds
      })

      websocket.addEventListener("message", handleWebSocketMessage)

      websocket.addEventListener("close", (event) => {
        console.log("WebSocket connection closed:", event.code, event.reason)
        setStatus("Disconnected")

        // Clear timers
        if (keepAliveTimer.current) {
          clearInterval(keepAliveTimer.current)
          keepAliveTimer.current = null
        }

        // Attempt to reconnect if not a manual close
        if (event.code !== 1000 && connectionAttempts < MAX_RECONNECT_ATTEMPTS) {
          setStatus(`Reconnecting... (${connectionAttempts + 1}/${MAX_RECONNECT_ATTEMPTS})`)
          reconnectTimer.current = setTimeout(connect, RECONNECT_DELAY)
        }
      })

      websocket.addEventListener("error", (error) => {
        console.error("WebSocket error:", error)
        setStatus("Connection error")
      })

      setWs(websocket)
    } catch (error) {
      console.error("Failed to create WebSocket connection:", error)
      setStatus("Failed to connect")
    }
  }, [connectionAttempts, handleWebSocketMessage, ws])

  const subscribeTicks = useCallback(
    (symbol: string) => {
      if (!ws || ws.readyState !== WebSocket.OPEN) {
        setStatus("Not connected - Cannot start analysis")
        return
      }

      // Unsubscribe from previous symbol if any
      if (subscribedSymbol) {
        ws.send(
          JSON.stringify({
            forget_all: "ticks",
            req_id: Date.now(),
          }),
        )
      }

      // Clear existing data
      setSubscribedSymbol(symbol)
      setTicksBuffer([])
      setLastTick(null)
      setRawCandleHistory([])
      setCandleData([])
      setCurrentCandle(null)
      indicatorState.current = { macdHistory: [] }

      // Subscribe to new symbol
      ws.send(
        JSON.stringify({
          ticks: symbol,
          subscribe: 1,
          req_id: Date.now(),
        }),
      )

      setStatus(`Starting analysis for ${symbol}...`)
    },
    [ws, subscribedSymbol],
  )

  const unsubscribeTicks = useCallback(() => {
    if (!ws || ws.readyState !== WebSocket.OPEN) return

    ws.send(
      JSON.stringify({
        forget_all: "ticks",
        req_id: Date.now(),
      }),
    )

    setSubscribedSymbol(null)
    setTicksBuffer([])
    setLastTick(null)
    setCurrentCandle(null)
    setRawCandleHistory([])
    setCandleData([])
    indicatorState.current = { macdHistory: [] }
    setStatus("Analysis stopped")
  }, [ws])

  // Initialize connection on mount
  useEffect(() => {
    connect()

    // Cleanup on unmount
    return () => {
      if (keepAliveTimer.current) clearInterval(keepAliveTimer.current)
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current)
      if (ws) {
        ws.close(1000, "Component unmounting") // Normal closure
      }
    }
  }, []) // Empty dependency array - only run on mount

  // Reset connection attempts when successfully connected
  useEffect(() => {
    if (ws?.readyState === WebSocket.OPEN) {
      setConnectionAttempts(0)
    }
  }, [ws?.readyState])

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
    isConnected: ws?.readyState === WebSocket.OPEN,
    connectionAttempts,
    reconnect: connect,
  }
}
