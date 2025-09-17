"use client"

import { useState, useEffect, useCallback } from "react"
import { getDerivAPI, type DerivTick, type PredictionResult } from "@/lib/deriv-api"

export const useDerivAPI = () => {
  const [isConnected, setIsConnected] = useState(false)
  const [isConnecting, setIsConnecting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [currentTick, setCurrentTick] = useState<DerivTick | null>(null)

  const derivAPI = getDerivAPI()

  const connect = useCallback(async () => {
    if (isConnected || isConnecting) return

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
    } finally {
      setIsConnecting(false)
    }
  }, [derivAPI, isConnected, isConnecting])

  const disconnect = useCallback(() => {
    derivAPI.disconnect()
    setIsConnected(false)
    setCurrentTick(null)
  }, [derivAPI])

  const subscribeTicks = useCallback(
    (symbol: string) => {
      if (!isConnected) return

      derivAPI.subscribeTicks(symbol, (tick) => {
        setCurrentTick(tick)
      })
    },
    [derivAPI, isConnected],
  )

  const unsubscribeTicks = useCallback(
    (symbol: string) => {
      derivAPI.unsubscribeTicks(symbol)
      setCurrentTick(null)
    },
    [derivAPI],
  )

  const getPrediction = useCallback(
    async (symbol: string, predictionType: string): Promise<PredictionResult> => {
      if (!isConnected) {
        throw new Error("Not connected to Deriv API")
      }

      return await derivAPI.analyzeForPrediction(symbol, predictionType)
    },
    [derivAPI, isConnected],
  )

  const getActiveSymbols = useCallback(async () => {
    if (!isConnected) {
      throw new Error("Not connected to Deriv API")
    }

    return await derivAPI.getActiveSymbols()
  }, [derivAPI, isConnected])

  useEffect(() => {
    // Auto-connect on mount
    connect()

    return () => {
      disconnect()
    }
  }, [])

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
