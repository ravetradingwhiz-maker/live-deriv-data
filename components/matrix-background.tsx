"use client"

import { useEffect, useRef } from "react"

interface MatrixBackgroundProps {
  intensity?: number
  opacity?: number
}

export function MatrixBackground({ intensity = 0.5, opacity = 0.3 }: MatrixBackgroundProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!containerRef.current) return

    const generateFakeLogs = () => {
      const logs = [
        "[INFO] Connecting to server... [OK]",
        "[INFO] Authenticating API key... [OK]",
        "[WARNING] Unstable connection detected...",
        "[ERROR] Connection timeout. Retrying...",
        "[INFO] Fetching market data... [OK]",
        "[INFO] Analysing Volatility Index...",
        "[SUCCESS] Data stream established...",
        "[SECURITY] Encryption enabled...",
        "[INFO] Predicting next digit...",
        "[WARNING] High market volatility detected...",
        "[INFO] Compiling results...",
        "[INFO] Data transmission complete...",
        "[DEBUG] Processing tick data...",
        "[TRACE] WebSocket connection alive...",
        "[INFO] Market analysis in progress...",
        "[SUCCESS] Signal detected...",
        "[CRITICAL] Anomaly detected in stream...",
        "[INFO] Buffering historical data...",
      ]
      
      let line = ""
      for (let i = 0; i < 10; i++) {
        line += logs[Math.floor(Math.random() * logs.length)] + " "
      }
      return line
    }

    const updateScrollingText = () => {
      if (!containerRef.current) return
      
      let text = ""
      for (let i = 0; i < 100; i++) {
        text += generateFakeLogs() + "\n"
      }
      
      // Create two copies for seamless scrolling
      containerRef.current.innerHTML = `<div class="scrolling-matrix">${text}${text}</div>`
    }

    updateScrollingText()
    const interval = setInterval(updateScrollingText, 200)

    return () => clearInterval(interval)
  }, [])

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 pointer-events-none z-0 overflow-hidden"
      style={{
        backgroundColor: "rgba(0, 0, 0, 0.92)",
        color: `rgba(0, 255, 0, ${opacity})`,
        fontSize: "14px",
        lineHeight: "1.2",
        whiteSpace: "pre",
        fontFamily: "monospace",
      }}
      aria-hidden="true"
    />
  )
}
