"use client"

import { useEffect, useRef } from "react"

interface MatrixBackgroundProps {
  intensity?: "low" | "medium" | "high"
  opacity?: number
}

interface RainColumn {
  y: number
  speed: number
  length: number
  flicker: number
}

const MATRIX_CHARS = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ$+-*/=%\"'#&_(),.;:?!\\|{}<>[]ァィゥェォカキクケコサシスセソタチツテトナニヌネノ"

export function MatrixBackground({ intensity = "medium", opacity = 0.2 }: MatrixBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    let animationFrame = 0
    let lastFrameTime = 0
    let drops: RainColumn[] = []
    let columnsCount = 0
    let width = 0
    let height = 0

    const baseFontSize = intensity === "low" ? 13 : intensity === "high" ? 15 : 14
    const spacingMultiplier = intensity === "low" ? 1.45 : intensity === "high" ? 1.2 : 1.3
    const targetFps = intensity === "high" ? 50 : 42
    const frameDuration = 1000 / targetFps

    const resizeCanvas = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      width = window.innerWidth
      height = window.innerHeight

      canvas.width = Math.floor(width * dpr)
      canvas.height = Math.floor(height * dpr)
      canvas.style.width = `${width}px`
      canvas.style.height = `${height}px`

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.textBaseline = "top"
      ctx.font = `${baseFontSize}px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace`

      const colWidth = Math.floor(baseFontSize * spacingMultiplier)
      columnsCount = Math.ceil(width / colWidth)

      drops = Array.from({ length: columnsCount }, () => ({
        y: Math.random() * -height,
        speed: (intensity === "low" ? 2.8 : intensity === "high" ? 5.4 : 4.2) + Math.random() * 2.2,
        length: (intensity === "low" ? 10 : intensity === "high" ? 22 : 16) + Math.floor(Math.random() * 10),
        flicker: 0.85 + Math.random() * 0.35,
      }))
    }

    const drawFrame = (time: number) => {
      if (time - lastFrameTime < frameDuration) {
        animationFrame = requestAnimationFrame(drawFrame)
        return
      }
      lastFrameTime = time

      ctx.fillStyle = `rgba(0, 0, 0, ${Math.min(0.16 + (1 - opacity) * 0.18, 0.36)})`
      ctx.fillRect(0, 0, width, height)

      const colWidth = Math.floor(baseFontSize * spacingMultiplier)

      for (let i = 0; i < columnsCount; i++) {
        const col = drops[i]
        const x = i * colWidth

        for (let j = 0; j < col.length; j++) {
          const y = col.y - j * (baseFontSize + 1)
          if (y < -baseFontSize || y > height + baseFontSize) continue

          const char = MATRIX_CHARS[(Math.random() * MATRIX_CHARS.length) | 0]
          const tailFactor = 1 - j / col.length
          const alpha = Math.max(0.05, tailFactor * opacity * col.flicker)

          if (j === 0) {
            ctx.fillStyle = `rgba(210, 255, 225, ${Math.min(0.95, alpha + 0.25)})`
            ctx.shadowBlur = 8
            ctx.shadowColor = "rgba(90, 255, 160, 0.5)"
          } else {
            ctx.fillStyle = `rgba(34, 240, 120, ${alpha})`
            ctx.shadowBlur = 0
          }

          ctx.fillText(char, x, y)
        }

        col.y += col.speed

        if (Math.random() > 0.99) {
          col.flicker = 0.75 + Math.random() * 0.45
        }

        if (col.y - col.length * (baseFontSize + 1) > height) {
          col.y = -Math.random() * 180
          col.speed = (intensity === "low" ? 2.8 : intensity === "high" ? 5.4 : 4.2) + Math.random() * 2.2
          col.length = (intensity === "low" ? 10 : intensity === "high" ? 22 : 16) + Math.floor(Math.random() * 10)
        }
      }

      ctx.shadowBlur = 0
      animationFrame = requestAnimationFrame(drawFrame)
    }

    resizeCanvas()
    animationFrame = requestAnimationFrame(drawFrame)

    const onResize = () => resizeCanvas()
    window.addEventListener("resize", onResize)

    return () => {
      window.removeEventListener("resize", onResize)
      cancelAnimationFrame(animationFrame)
    }
  }, [intensity, opacity])

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-0"
      style={{
        background: "radial-gradient(120% 80% at 50% 0%, #03120a 0%, #010302 45%, #000000 100%)",
        display: "block",
      }}
      aria-hidden="true"
    />
  )
}
