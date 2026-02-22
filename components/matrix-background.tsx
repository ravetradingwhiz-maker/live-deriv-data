'use client'

import { useEffect, useRef } from 'react'

interface MatrixBackgroundProps {
  intensity?: 'low' | 'medium' | 'high'
  opacity?: number
}

export function MatrixBackground({ intensity = 'low', opacity = 0.08 }: MatrixBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const resizeCanvas = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }

    resizeCanvas()

    // Technical text strings - realistic error logs and system messages
    const textFragments = [
      '[INFO]', '[WARNING]', '[ERROR]', '[SUCCESS]', '[DEBUG]', '[CRITICAL]',
      'Connecting to server...', 'Connection timeout', 'Data transmitted',
      'Authentication failed', 'API key validated', 'Encryption enabled',
      'Market volatility detected', 'High masked volatility', 'Analyzing signals',
      'Fetching market data', 'Processing stream', 'Computing results',
      'Data transmission complete', 'Stream established', 'Security enabled',
      'Unstable connection detected', 'Retrying...', 'Signal processing',
      'Predicting next digit', 'Compiling results', 'Backtesting tools',
      'Real-time data', 'Advanced analytics', 'Professional trading',
      '[OK]', '[FAILED]', 'Connection detected', 'Streaming data',
      'Signal Scanner', 'QuantumSyn', 'Trading Platform',
      'Deriv Connection', 'Live Update', 'Data Analysis',
      'Socket connected', 'Receiving stream', 'Processing tick',
    ]

    interface Column {
      x: number
      y: number
      speed: number
      text: string[]
      brightness: number
    }

    const columnCount = intensity === 'low' ? Math.floor(canvas.width / 60) :
      intensity === 'high' ? Math.floor(canvas.width / 40) :
      Math.floor(canvas.width / 50)

    const columns: Column[] = []

    // Initialize columns with random text fragments
    for (let i = 0; i < columnCount; i++) {
      const randomFragments = Array.from(
        { length: Math.floor(Math.random() * 25) + 20 },
        () => textFragments[Math.floor(Math.random() * textFragments.length)]
      )
      columns.push({
        x: i * (canvas.width / columnCount),
        y: Math.random() * canvas.height,
        speed: (Math.random() * 3.5 + 1.5) * 5,
        text: randomFragments,
        brightness: Math.random() * 0.5 + 0.7,
      })
    }

    const animate = () => {
      // Dark background with slight transparency for trail effect
      ctx.fillStyle = 'rgba(0, 0, 0, 0.98)'
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      // Draw text columns
      columns.forEach((column) => {
        // Matrix green color with enhanced brightness
        ctx.fillStyle = `rgba(0, 255, 0, ${Math.min(column.brightness * opacity * 1.5, 1)})`
        ctx.font = 'bold 13px "Courier New", monospace'
        ctx.textAlign = 'left'
        ctx.letterSpacing = '2px'

        // Draw text fragments with glow effect
        column.text.forEach((text, index) => {
          const textY = column.y + index * 16
          if (textY > canvas.height + 100) {
            // Reset column
            column.y = -column.text.length * 16
            column.brightness = Math.random() * 0.5 + 0.7
            column.speed = (Math.random() * 3.5 + 1.5) * 5
          }
          // Add glow effect
          ctx.shadowBlur = 8
          ctx.shadowColor = 'rgba(0, 255, 0, 0.8)'
          ctx.fillText(text, column.x, textY)
          ctx.shadowBlur = 0
        })

        // Move column down with increased speed
        column.y += column.speed

        // Random brightness flicker for authenticity
        if (Math.random() > 0.95) {
          column.brightness = Math.random() * 0.5 + 0.7
        }
      })

      requestAnimationFrame(animate)
    }

    animate()

    const handleResize = () => {
      resizeCanvas()
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [intensity, opacity])

  return (
    <canvas
      ref={canvasRef}
      className="fixed top-0 left-0 w-full h-full pointer-events-none z-0"
      style={{ background: '#000000' }}
    />
  )
}
