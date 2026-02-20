'use client'

import { useEffect, useRef } from 'react'

interface DigitalDataStreamProps {
  intensity?: 'low' | 'medium' | 'high'
  opacity?: number
}

export function DigitalDataStream({ intensity = 'medium', opacity = 0.05 }: DigitalDataStreamProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Set canvas size
    const resizeCanvas = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    resizeCanvas()

    // Data symbols for streaming effect
    const symbols = [
      '0', '1', '█', '▓', '░', '$', '€', '¥', '₹', '₽', '₩', '₪', '₦', '₡', '₱',
      '฿', 'Ω', 'Δ', '≈', '≠', '±', '×', '÷', '∞', '→', '↓', '↑', '←', 'Ξ', 'α', 'β', 'γ',
      '📊', '📈', '📉', '💹', '🔢', '🔐', '⚡', '⟡', '◉', '◆', '●'
    ]

    // Column configuration based on intensity
    const columnCounts = { low: 8, medium: 16, high: 24 }
    const columnCount = columnCounts[intensity]
    const columnWidth = window.innerWidth / columnCount

    interface Column {
      x: number
      y: number
      speed: number
      chars: string[]
      opacity: number
      isActive: boolean
      activationTimer: number
    }

    // Initialize columns
    const columns: Column[] = Array.from({ length: columnCount }, (_, i) => ({
      x: i * columnWidth,
      y: 0,
      speed: Math.random() * 2 + 1,
      chars: Array.from({ length: 20 }, () => symbols[Math.floor(Math.random() * symbols.length)]),
      opacity: 0,
      isActive: false,
      activationTimer: Math.random() * 3000,
    }))

    // Animation loop
    let animationId: number
    const animate = () => {
      // Clear with semi-transparent background
      ctx.fillStyle = `rgba(15, 23, 42, 0)`
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      // Update and draw columns
      columns.forEach((col) => {
        // Activation logic
        if (!col.isActive) {
          col.activationTimer -= 16
          if (col.activationTimer <= 0) {
            col.isActive = true
            col.opacity = opacity
            col.activationTimer = Math.random() * 3000
          }
        } else if (col.opacity < opacity) {
          col.opacity = Math.min(col.opacity + opacity / 50, opacity)
        }

        // Move column down
        col.y += col.speed

        // Reset when off screen
        if (col.y > canvas.height) {
          col.y = -400
          col.isActive = false
          col.opacity = 0
          col.activationTimer = Math.random() * 2000
          col.chars = Array.from({ length: 20 }, () => symbols[Math.floor(Math.random() * symbols.length)])
        }

        // Draw characters
        ctx.font = '14px "Monaco", "Courier New", monospace'
        ctx.fillStyle = `rgba(34, 197, 94, ${Math.min(col.opacity * 2, 0.8)})`

        col.chars.forEach((char, index) => {
          const charY = col.y + index * 20
          if (charY > -20 && charY < canvas.height + 20) {
            // Fade out at top and bottom
            const distFromTop = Math.max(0, charY / 100)
            const distFromBottom = Math.max(0, (canvas.height - charY) / 100)
            const charOpacity = Math.min(col.opacity * 1.5, opacity) * Math.min(distFromTop, distFromBottom, 1)

            ctx.fillStyle = `rgba(34, 197, 94, ${charOpacity})`
            ctx.fillText(char, col.x + 10, charY)
          }
        })
      })

      animationId = requestAnimationFrame(animate)
    }

    animate()

    // Handle window resize
    const handleResize = () => {
      resizeCanvas()
    }

    window.addEventListener('resize', handleResize)

    return () => {
      cancelAnimationFrame(animationId)
      window.removeEventListener('resize', handleResize)
    }
  }, [intensity, opacity])

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 z-0 pointer-events-none"
      style={{ background: 'transparent' }}
    />
  )
}
