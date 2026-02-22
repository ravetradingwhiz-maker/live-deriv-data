'use client'

import { useEffect, useRef } from 'react'

interface AnimatedAnalysisCircleProps {
  countdown: number
  isConnected: boolean
}

export function AnimatedAnalysisCircle({ countdown, isConnected }: AnimatedAnalysisCircleProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let animationId: number
    let particleAngle = 0

    // Set canvas size
    const size = 200
    canvas.width = size
    canvas.height = size

    interface Particle {
      angle: number
      distance: number
      speed: number
      life: number
    }

    const particles: Particle[] = []
    const particleCount = 15

    // Initialize particles
    for (let i = 0; i < particleCount; i++) {
      particles.push({
        angle: (Math.PI * 2 * i) / particleCount,
        distance: 40 + Math.random() * 30,
        speed: Math.random() * 0.05 + 0.02,
        life: Math.random(),
      })
    }

    const animate = () => {
      // Clear canvas with transparency
      ctx.clearRect(0, 0, size, size)

      const centerX = size / 2
      const centerY = size / 2

      // Draw rotating outer circle with gradient
      ctx.save()
      ctx.translate(centerX, centerY)
      ctx.rotate(particleAngle)

      // Outer ring gradient
      const gradient = ctx.createLinearGradient(-60, 0, 60, 0)
      gradient.addColorStop(0, 'rgba(0, 255, 255, 0)')
      gradient.addColorStop(0.5, 'rgba(0, 217, 217, 0.8)')
      gradient.addColorStop(1, 'rgba(0, 255, 255, 0)')

      ctx.strokeStyle = gradient
      ctx.lineWidth = 3
      ctx.beginPath()
      ctx.arc(0, 0, 60, 0, Math.PI * 2)
      ctx.stroke()

      ctx.restore()

      // Draw animated particles flowing around the circle
      particles.forEach((particle, index) => {
        particle.angle += particle.speed
        particle.life -= 0.01

        if (particle.life <= 0) {
          particle.life = 1
          particle.angle = Math.random() * Math.PI * 2
        }

        const x = centerX + Math.cos(particle.angle) * particle.distance
        const y = centerY + Math.sin(particle.angle) * particle.distance

        // Draw particle with fade effect
        const gradient = ctx.createRadialGradient(x, y, 0, x, y, 4)
        gradient.addColorStop(0, `rgba(0, 217, 217, ${particle.life})`)
        gradient.addColorStop(1, `rgba(0, 217, 217, 0)`)

        ctx.fillStyle = gradient
        ctx.beginPath()
        ctx.arc(x, y, 4, 0, Math.PI * 2)
        ctx.fill()
      })

      // Draw center circle with inner glow
      const centerGradient = ctx.createRadialGradient(centerX, centerY, 20, centerX, centerY, 45)
      centerGradient.addColorStop(0, 'rgba(0, 217, 217, 0.3)')
      centerGradient.addColorStop(1, 'rgba(0, 217, 217, 0)')

      ctx.fillStyle = centerGradient
      ctx.beginPath()
      ctx.arc(centerX, centerY, 45, 0, Math.PI * 2)
      ctx.fill()

      // Draw inner fixed circle
      ctx.fillStyle = 'rgba(0, 217, 217, 0.1)'
      ctx.beginPath()
      ctx.arc(centerX, centerY, 35, 0, Math.PI * 2)
      ctx.fill()

      // Draw countdown number in center
      ctx.fillStyle = 'rgb(0, 217, 217)'
      ctx.font = 'bold 48px Arial, sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.shadowColor = 'rgba(0, 217, 217, 0.8)'
      ctx.shadowBlur = 20
      ctx.fillText(countdown.toString(), centerX, centerY)
      ctx.shadowBlur = 0

      particleAngle += 0.02

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
        style={{ filter: 'drop-shadow(0 0 20px rgba(0, 217, 217, 0.6))' }}
      />
    </div>
  )
}
