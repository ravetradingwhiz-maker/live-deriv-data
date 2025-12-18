"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import type { Market, WebSocketMessage, CandleData, ChartData } from "@/types/trading"
import { calculateAllIndicators } from "@/utils/technical-indicators"

const WS_URL = "wss://ws.derivws.com/websockets/v3?app_id=115912"
const CANDLE_INTERVAL = 60000 // 1 minute in milliseconds
const API_TOKEN = "2jJrchpytEWU9Ef" // Updated API token

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
  const [isAuthorized, setIsAuthorized] = useState(false)

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

  const connectAttemptInProgress = useRef(false)

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

        if (data.authorize) {
          console.log("[v0] Successfully authorized with API token")
          setIsAuthorized(true)
          if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(
              JSON.stringify({
                active_symbols: "brief",
                req_id: Date.now(),
              }),
            )
          }
          return
        }

        // Handle ping response
        if (data.ping) {
          console.log("[v0] Received ping response, connection is alive")
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
          console.log("[v0] Received active symbols:", data.active_symbols.length)
          const volSymbols = data.active_symbols
            .filter((s: any) => {
              return (
                s.display_name &&
                (s.display_name.includes("Volatility") ||
                  s.display_name.includes("volatility") ||
                  s.symbol.startsWith("R_") ||
                  s.symbol.startsWith("1HZ"))
              )
            })
            .reduce((acc: Market[], s: any) => {
              // Remove duplicates based on symbol
              if (!acc.find((x) => x.symbol === s.symbol)) {
                acc.push({
                  symbol: s.symbol,
                  display_name: s.display_name || s.symbol,
                })
              }
              return acc
            }, [])
            .sort((a, b) => a.display_name.localeCompare(b.display_name))

          console.log("[v0] Filtered volatility markets:", volSymbols.length)
          setMarkets(volSymbols)
          setStatus(
            volSymbols.length
              ? "Connected — Select a market to start analysis"
              : "Connected — No volatility markets found",
          )
          setConnectionAttempts(0)
          return
        }

        // Handle tick data
        if (data.tick) {
          const tickData = data.tick

          // Validate tick data
          if (typeof tickData.quote !== "number" || !tickData.symbol) {
            console.warn("Invalid tick data received:", tickData)
            return
          }

          console.log(`[v0] Live tick for ${tickData.symbol}: ${tickData.quote}`)
          const digit = extractLastDigit(tickData.quote)

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
    [processTick, ws],
  )

  const connect = useCallback(() => {
    if (connectAttemptInProgress.current) {
      console.log("[v0] Connection attempt already in progress, skipping...")
      return
    }

    if (connectionAttempts >= MAX_RECONNECT_ATTEMPTS) {
      setStatus("Connection failed - Max attempts reached")
      return
    }

    if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) {
      ws.close()
    }

    connectAttemptInProgress.current = true
    setStatus("Connecting to Deriv API...")
    setConnectionAttempts((prev) => prev + 1)

    try {
      const websocket = new WebSocket(WS_URL)

      websocket.addEventListener("open", () => {
        console.log("[v0] Connected to Deriv WebSocket API")
        setStatus("Connected — Authenticating...")
        connectAttemptInProgress.current = false

        websocket.send(
          JSON.stringify({
            authorize: API_TOKEN,
            req_id: Date.now(),
          }),
        )
      })

      websocket.addEventListener("message", (event) => {
        try {
          const data: WebSocketMessage = JSON.parse(event.data)

          if (data.authorize) {
            console.log("[v0] Successfully authorized with API token")
            setIsAuthorized(true)
            setConnectionAttempts(0)

            if (websocket.readyState === WebSocket.OPEN) {
              websocket.send(
                JSON.stringify({
                  active_symbols: "brief",
                  req_id: Date.now(),
                }),
              )
            }

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
            }, 30000)
            return
          }

          handleWebSocketMessage(event)
        } catch (error) {
          console.error("[v0] Error in message handler:", error)
        }
      })

      websocket.addEventListener("close", (event) => {
        console.log("[v0] Deriv WebSocket disconnected:", event.code, event.reason)
        setStatus("Disconnected")
        setIsAuthorized(false)
        connectAttemptInProgress.current = false

        if (keepAliveTimer.current) {
          clearInterval(keepAliveTimer.current)
          keepAliveTimer.current = null
        }

        if (event.code !== 1000 && connectionAttempts < MAX_RECONNECT_ATTEMPTS) {
          setStatus(`Reconnecting... (${connectionAttempts}/${MAX_RECONNECT_ATTEMPTS})`)
          reconnectTimer.current = setTimeout(() => {
            connect()
          }, RECONNECT_DELAY)
        } else if (connectionAttempts >= MAX_RECONNECT_ATTEMPTS) {
          setStatus("Connection failed - Max attempts reached")
        }
      })

      websocket.addEventListener("error", (error) => {
        console.error("[v0] WebSocket error")
        connectAttemptInProgress.current = false
      })

      setWs(websocket)
    } catch (error) {
      console.error("[v0] Failed to create WebSocket connection:", error)
      setStatus("Failed to connect")
      connectAttemptInProgress.current = false
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
    let mounted = true

    if (mounted && !ws) {
      connect()
    }

    return () => {
      mounted = false
      if (keepAliveTimer.current) clearInterval(keepAliveTimer.current)
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current)
      if (ws) {
        ws.close(1000, "Component unmounting")
      }
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
    isConnected: ws?.readyState === WebSocket.OPEN,
    connectionAttempts,
    reconnect: connect,
    isAuthorized,
  }
}
