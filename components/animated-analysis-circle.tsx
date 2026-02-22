'use client'

import { useEffect, useRef } from 'react'

interface AnimatedAnalysisCircleProps {
  countdown: number
  isConnected: boolean
}

export function AnimatedAnalysisCircle({ countdown }: AnimatedAnalysisCircleProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let animationId: number
    let time = 0

    const size = 200
    canvas.width = size
    canvas.height = size

    const centerX = size / 2
    const centerY = size / 2
    const radius = 60

    // Data stream elements flowing around the circle
    const streamElements = [
      '[INFO] Analyzing data',
      '[DATA] Stream active',
      '[PROCESS] Computing',
      '[CALC] Probability',
      '[SIGNAL] Pattern',
      '[TRADE] Prediction',
    ]

    const animate = () => {
      // Clear with semi-transparent background for trail effect
      ctx.clearRect(0, 0, size, size)

      // Draw flowing data stream around the circle
      for (let i = 0; i < 24; i++) {
        const angle = (i / 24) * Math.PI * 2 + time * 0.08
        const x = centerX + Math.cos(angle) * radius
        const y = centerY + Math.sin(angle) * radius

        // Draw streaming element
        const element = streamElements[i % streamElements.length]
        const elementIndex = Math.floor((time * 0.1 + i) / streamElements.length) % streamElements.length
        const currentElement = streamElements[elementIndex]

        // Calculate opacity based on position for flowing effect
        const opacity = 0.3 + Math.sin(time * 0.15 + i * 0.5) * 0.4

        ctx.save()
        ctx.translate(x, y)
        ctx.rotate(angle + Math.PI / 2)

        ctx.fillStyle = `rgba(0, 217, 217, ${opacity})`
        ctx.font = 'bold 8px "Courier New", monospace'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.shadowColor = 'rgba(0, 217, 217, 0.6)'
        ctx.shadowBlur = 4
        ctx.fillText(currentElement.slice(0, 10), 0, 0)

        ctx.restore()
      }

      // Draw outer ring with rotating glow
      const outerGradient = ctx.createLinearGradient(centerX - 70, centerY, centerX + 70, centerY)
      outerGradient.addColorStop(0, 'rgba(0, 217, 217, 0)')
      outerGradient.addColorStop(0.5, 'rgba(0, 217, 217, 0.8)')
      outerGradient.addColorStop(1, 'rgba(0, 217, 217, 0)')

      ctx.strokeStyle = outerGradient
      ctx.lineWidth = 4
      ctx.beginPath()
      ctx.arc(centerX, centerY, radius, 0, Math.PI * 2)
      ctx.stroke()

      // Draw pulsing center glow
      const pulseGlow = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, 50)
      const glowIntensity = 0.2 + Math.sin(time * 0.08) * 0.2
      pulseGlow.addColorStop(0, `rgba(0, 217, 217, ${glowIntensity})`)
      pulseGlow.addColorStop(1, 'rgba(0, 217, 217, 0)')

      ctx.fillStyle = pulseGlow
      ctx.beginPath()
      ctx.arc(centerX, centerY, 50, 0, Math.PI * 2)
      ctx.fill()

      // Draw inner circle background
      ctx.fillStyle = 'rgba(10, 10, 20, 0.8)'
      ctx.beginPath()
      ctx.arc(centerX, centerY, 40, 0, Math.PI * 2)
      ctx.fill()

      // Draw countdown number in center
      ctx.fillStyle = 'rgb(0, 217, 217)'
      ctx.font = 'bold 52px Arial, sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.shadowColor = 'rgba(0, 217, 217, 0.9)'
      ctx.shadowBlur = 25
      ctx.fillText(countdown.toString(), centerX, centerY)

      time += 1
      animationId = requestAnimationFrame(animate)
    }

    animate()

    return () => {
      cancelAnimationFrame(animationId)
    }
  }, [countdown])

  return (
    <div className="flex flex-col items-center justify-center">
      <canvas
        ref={canvasRef}
        className="w-48 h-48"
        style={{ filter: 'drop-shadow(0 0 30px rgba(0, 217, 217, 0.8))' }}
      />
    </div>
  )
}
