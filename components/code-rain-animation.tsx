"use client"

import { useEffect, useRef } from "react"

interface CodeRainAnimationProps {
  intensity?: "low" | "medium" | "high"
  opacity?: number
  position?: "fixed" | "absolute"
  className?: string
}

export function CodeRainAnimation({
  intensity = "medium",
  opacity = 0.15,
  position = "fixed",
  className = "",
}: CodeRainAnimationProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // Set canvas size
    const resizeCanvas = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }

    resizeCanvas()
    window.addEventListener("resize", resizeCanvas)

    // Trading & code symbols
    const symbols = "01アウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン$€¥₹₽₩₪₦₱₡₲₴₵₸ƒΦΨΩαβγδεζηθικλμνξοπρστυφχψωЀЁЂЃЄЅІЇЈЉЊЋЌЍЎЏАБВГДЕЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯabcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789+-*/<>[]{}()=@#%&".split("")

    // Determine number of columns based on intensity
    const intensityMap = { low: 0.4, medium: 0.6, high: 0.8 }
    const fontSize = 14
    const columns = Math.floor((canvas.width / fontSize) * intensityMap[intensity])
    const drops: number[] = Array(columns).fill(0).map(() => Math.random() * canvas.height)

    const animationFrameId = requestAnimationFrame(function draw() {
      // Fill canvas with semi-transparent background for trail effect
      ctx.fillStyle = `rgba(15, 23, 42, 0.05)`
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      // Set font styling
      ctx.fillStyle = `rgba(59, 130, 246, ${opacity})`
      ctx.font = `${fontSize}px 'Courier New', monospace`
      ctx.shadowColor = `rgba(59, 130, 246, ${opacity * 0.5})`
      ctx.shadowBlur = 8

      // Draw symbols
      for (let i = 0; i < drops.length; i++) {
        const symbol = symbols[Math.floor(Math.random() * symbols.length)]
        const x = i * fontSize
        const y = drops[i] * fontSize

        ctx.fillText(symbol, x, y)

        // Reset position when symbol goes off-screen
        if (y > canvas.height && Math.random() > 0.975) {
          drops[i] = 0
        } else {
          drops[i]++
        }
      }

      requestAnimationFrame(draw)
    })

    return () => {
      window.removeEventListener("resize", resizeCanvas)
      cancelAnimationFrame(animationFrameId)
    }
  }, [intensity, opacity])

  return (
    <canvas
      ref={canvasRef}
      className={`${position === "fixed" ? "fixed" : "absolute"} inset-0 pointer-events-none z-0 ${className}`}
    />
  )
}
