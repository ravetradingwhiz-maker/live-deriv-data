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

    // Matrix characters
    const matrixChars = '01アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン'
    
    // Configure intensity
    const columnCount = intensity === 'low' ? Math.floor(canvas.width / 40) : 
                       intensity === 'high' ? Math.floor(canvas.width / 20) : 
                       Math.floor(canvas.width / 30)

    interface Column {
      x: number
      y: number
      speed: number
      chars: string[]
      brightness: number
    }

    const columns: Column[] = []

    // Initialize columns
    for (let i = 0; i < columnCount; i++) {
      columns.push({
        x: i * (canvas.width / columnCount),
        y: Math.random() * canvas.height,
        speed: Math.random() * 2 + 1,
        chars: Array.from({ length: Math.floor(Math.random() * 15) + 5 }, () => 
          matrixChars[Math.floor(Math.random() * matrixChars.length)]
        ),
        brightness: Math.random() * 0.5 + 0.5,
      })
    }

    const animate = () => {
      // Semi-transparent background to create trail effect
      ctx.fillStyle = `rgba(0, 0, 0, ${0.05 * opacity})`
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      // Draw columns
      columns.forEach((column) => {
        // Green color with variable brightness
        ctx.fillStyle = `rgba(0, 255, 0, ${column.brightness * opacity})`
        ctx.font = 'bold 20px monospace'
        ctx.textAlign = 'center'

        // Draw characters
        column.chars.forEach((char, index) => {
          const charY = column.y + index * 20
          if (charY > canvas.height) {
            // Reset column
            column.y = -column.chars.length * 20
            column.brightness = Math.random() * 0.5 + 0.5
            column.speed = Math.random() * 2 + 1
          }
          ctx.fillText(char, column.x, charY)
        })

        // Move column down
        column.y += column.speed

        // Random brightness flicker
        if (Math.random() > 0.95) {
          column.brightness = Math.random() * 0.5 + 0.5
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
      style={{ background: 'rgba(0, 0, 0, 0.95)' }}
    />
  )
}
