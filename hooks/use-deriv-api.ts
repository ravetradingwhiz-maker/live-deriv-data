"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { getDerivAPI, type DerivTick, type PredictionResult } from "@/lib/deriv-api"

export const useDerivAPI = () => {
  const [isConnected, setIsConnected] = useState(false)
  const [isConnecting, setIsConnecting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [currentTick, setCurrentTick] = useState<DerivTick | null>(null)

  const derivAPI = getDerivAPI()
  const connectionAttemptInProgress = useRef(false)
  const hasInitialized = useRef(false)

  // Validate symbol is available
  const isValidSymbol = useCallback((symbol: string): boolean => {
    return /^[A-Z_0-9]+$/.test(symbol)
  }, [])

  const connect = useCallback(async () => {
    // Prevent duplicate connection attempts
    if (connectionAttemptInProgress.current || isConnected) return

    connectionAttemptInProgress.current = true
    setIsConnecting(true)
    setError(null)

    try {
      await derivAPI.connect()
      setIsConnected(true)
      console.log("[v0] Successfully connected to Deriv API")
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to connect to Deriv API"
      setError(errorMessage)
      console.error("[v0] Deriv API connection error:", errorMessage)
      setIsConnected(false)
    } finally {
      setIsConnecting(false)
      connectionAttemptInProgress.current = false
    }
  }, [derivAPI, isConnected])

  const disconnect = useCallback(() => {
    derivAPI.disconnect()
    setIsConnected(false)
    setCurrentTick(null)
    setError(null)
  }, [derivAPI])

  const subscribeTicks = useCallback(
    (symbol: string) => {
      if (!isConnected || !isValidSymbol(symbol)) return

      try {
        derivAPI.subscribeTicks(symbol, (tick) => {
          setCurrentTick(tick)
        })
      } catch (err) {
        console.error("[v0] Failed to subscribe to ticks:", err)
        setError("Failed to subscribe to market data")
      }
    },
    [derivAPI, isConnected, isValidSymbol],
  )

  const unsubscribeTicks = useCallback(
    (symbol: string) => {
      if (isValidSymbol(symbol)) {
        derivAPI.unsubscribeTicks(symbol)
        setCurrentTick(null)
      }
    },
    [derivAPI, isValidSymbol],
  )

  const getPrediction = useCallback(
    async (symbol: string, predictionType: string): Promise<PredictionResult> => {
      // Validate inputs
      if (!isValidSymbol(symbol)) {
        throw new Error("Invalid market symbol selected")
      }

      if (!["over_under", "even_odd", "rise_fall", "matches_differs"].includes(predictionType)) {
        throw new Error("Invalid prediction type")
      }

      // Ensure connection is valid before prediction
      const currentConnected = derivAPI.isConnectedToAPI()
      if (!currentConnected && !isConnected) {
        console.log("[v0] Not connected, attempting to reconnect before prediction...")
        try {
          await connect()
          // Wait for connection to stabilize (increased from 1s to 2s)
          await new Promise((resolve) => setTimeout(resolve, 2000))
          
          // Verify connection after waiting
          if (!derivAPI.isConnectedToAPI()) {
            console.warn("[v0] Connection not stable after reconnect, but attempting prediction anyway...")
          }
        } catch (error) {
          console.warn("[v0] Reconnection error (will try prediction anyway):", error)
          // Don't throw here - let the prediction attempt proceed
        }
      }

      try {
        const result = await derivAPI.analyzeForPrediction(symbol, predictionType)
        // Clear any stale errors on success
        setError(null)
        return result
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : "Prediction analysis failed"
        setError(errorMsg)
        throw err
      }
    },
    [derivAPI, isConnected, connect, isValidSymbol],
  )

  const getActiveSymbols = useCallback(async () => {
    if (!derivAPI.isConnectedToAPI()) {
      throw new Error("Not connected to Deriv API")
    }

    return await derivAPI.getActiveSymbols()
  }, [derivAPI])

  // Connection monitoring - only poll if not connected
  useEffect(() => {
    if (isConnected) return // Don't poll if already connected

    const checkConnection = setInterval(() => {
      const connected = derivAPI.isConnectedToAPI()
      if (connected !== isConnected) {
        console.log("[v0] Connection state changed to:", connected)
        setIsConnected(connected)
      }
    }, 5000) // Check every 5 seconds

    return () => clearInterval(checkConnection)
  }, [derivAPI, isConnected])

  // One-time initialization on mount only
  useEffect(() => {
    if (hasInitialized.current) return

    hasInitialized.current = true
    connect()

    return () => {
      // Do not disconnect shared API instance on unmount - it's used across multiple components
      // The API connection should persist for the lifetime of the app
    }
  }, [connect, disconnect])

  return {
    isConnected,
    isConnecting,
    error,
    currentTick,
    connect,
    disconnect,
    subscribeTicks,
    unsubscribeTicks,
    getPrediction,
    getActiveSymbols,
  }
}
