"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import type { PredictionResult, PredictionType } from "@/types/trading"
import { TrendingUp, Target, Hash, BarChart3, Zap, ArrowUpRight, ArrowUpDown, Wifi, WifiOff, Loader2 } from "lucide-react"
import { useDerivAPI } from "@/hooks/use-deriv-api"
import { Calculator } from "lucide-react" // Import Calculator component
import { VOLATILITY_INDICES } from "@/types/trading" // Added import to use standardized names
import { AnimatedAnalysisCircle } from "@/components/animated-analysis-circle"

interface EnhancedPredictionModalProps {
  ticksBuffer: number[]
  runsThisSession: number
  maxRuns: number
  currentPrice?: number
  predictionType: PredictionType
  onClose: () => void
  onRunComplete: (runs: number) => void
}

interface EnhancedPredictionResult extends PredictionResult {
  exactDigit?: number
  entryPoints: {
    primary: string
    secondary?: string
    timing: string
  }
  marketCondition: string
  riskLevel: "LOW" | "MEDIUM" | "HIGH"
  expectedOutcome: string
}

export function EnhancedPredictionModal({
  ticksBuffer,
  runsThisSession,
  maxRuns,
  currentPrice,
  predictionType,
  onClose,
  onRunComplete,
}: EnhancedPredictionModalProps) {
  const { isConnected, isConnecting, error, getPrediction, getActiveSymbols } = useDerivAPI()
  const SHARED_TICK_WINDOW = 1000
  const LOCAL_ONLY_TYPES: PredictionType[] = ["accumulators", "only_ups", "higher_lower"]

  // Set initial choice based on prediction type
  const getInitialChoice = (type: PredictionType) => {
    switch (type) {
      case "over_under":
        return "over"
      case "matches_differs":
        return "matches"
      case "even_odd":
        return "even"
      case "rise_fall":
        return "rise"
      case "accumulators":
        return "accumulate"
      case "only_ups":
        return "only_up"
      case "higher_lower":
        return "higher"
      default:
        return "over"
    }
  }

  const [choice, setChoice] = useState<string>(getInitialChoice(predictionType))
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [countdown, setCountdown] = useState(0)
  const [result, setResult] = useState<EnhancedPredictionResult | null>(null)
  const [selectedSymbol, setSelectedSymbol] = useState("R_100") // Default to Volatility 100 Index
  const [randomCode, setRandomCode] = useState("")
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const beepIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const masterGainRef = useRef<GainNode | null>(null)
  const compressorRef = useRef<DynamicsCompressorNode | null>(null)
  const randomCodeIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const scanPhaseRef = useRef(0)

  useEffect(() => {
    return () => {
      if (beepIntervalRef.current) {
        clearInterval(beepIntervalRef.current)
        beepIntervalRef.current = null
      }
      if (randomCodeIntervalRef.current) {
        clearInterval(randomCodeIntervalRef.current)
        randomCodeIntervalRef.current = null
      }
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current = null
      }
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(() => {
          // Ignore close errors during unmount.
        })
        audioContextRef.current = null
      }
      if (masterGainRef.current) {
        masterGainRef.current.disconnect()
        masterGainRef.current = null
      }
      if (compressorRef.current) {
        compressorRef.current.disconnect()
        compressorRef.current = null
      }
    }
  }, [])

  const generateRandomCode = () => {
    const chars = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz!@#$%^&*()_+-=[]{}|;:,.<>?"
    let code = ""
    for (let i = 0; i < 60; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return code
  }

  const playTimerSound = () => {
    try {
      if (!audioRef.current) {
        audioRef.current = new Audio("https://www.fesliyanstudios.com/play-mp3/4386")
      }
      audioRef.current.currentTime = 0
      audioRef.current.volume = 1.0
      audioRef.current.loop = true
      audioRef.current.play().catch((err) => {
        console.log("MP3 audio play blocked, using scanner beep fallback:", err)
      })

      if (!audioContextRef.current) {
        audioContextRef.current = new AudioContext()
      }

      const context = audioContextRef.current
      if (context.state === "suspended") {
        context.resume().catch(() => {
          // Ignore resume error; fallback may still work on next click.
        })
      }

      if (beepIntervalRef.current) {
        clearInterval(beepIntervalRef.current)
      }

      if (masterGainRef.current) {
        masterGainRef.current.disconnect()
      }
      if (compressorRef.current) {
        compressorRef.current.disconnect()
      }

      // Louder fallback chain: source -> filter/envelope -> master gain -> compressor -> destination.
      masterGainRef.current = context.createGain()
      masterGainRef.current.gain.value = 2.3

      compressorRef.current = context.createDynamicsCompressor()
      compressorRef.current.threshold.value = -28
      compressorRef.current.knee.value = 18
      compressorRef.current.ratio.value = 8
      compressorRef.current.attack.value = 0.002
      compressorRef.current.release.value = 0.09

      masterGainRef.current.connect(compressorRef.current)
      compressorRef.current.connect(context.destination)

      // Synthetic scanner ticks with short twin pulses and short pause.
      beepIntervalRef.current = setInterval(() => {
        if (!audioContextRef.current) return

        scanPhaseRef.current += 1
        const phase = scanPhaseRef.current

        const triggerTick = (startOffset: number, hz: number) => {
          if (!audioContextRef.current) return
          const now = audioContextRef.current.currentTime + startOffset
          const osc = audioContextRef.current.createOscillator()
          const gain = audioContextRef.current.createGain()
          const filter = audioContextRef.current.createBiquadFilter()

          osc.type = phase % 2 === 0 ? "square" : "triangle"
          osc.frequency.setValueAtTime(hz, now)
          osc.frequency.exponentialRampToValueAtTime(hz * 1.12, now + 0.02)

          filter.type = "bandpass"
          filter.frequency.setValueAtTime(hz * 1.6, now)
          filter.Q.setValueAtTime(10, now)

          gain.gain.setValueAtTime(0.0001, now)
          gain.gain.exponentialRampToValueAtTime(0.13, now + 0.004)
          gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.045)

          osc.connect(filter)
          filter.connect(gain)
          if (masterGainRef.current) {
            gain.connect(masterGainRef.current)
          } else {
            gain.connect(audioContextRef.current.destination)
          }

          osc.start(now)
          osc.stop(now + 0.05)
        }

        const base = 950 + (phase % 5) * 75
        triggerTick(0, base)
        triggerTick(0.08, base + 140)
      }, 260)
    } catch (err) {
      console.log("Audio error:", err)
    }
  }

  const stopTimerSound = () => {
    if (beepIntervalRef.current) {
      clearInterval(beepIntervalRef.current)
      beepIntervalRef.current = null
    }
    if (masterGainRef.current) {
      masterGainRef.current.disconnect()
      masterGainRef.current = null
    }
    if (compressorRef.current) {
      compressorRef.current.disconnect()
      compressorRef.current = null
    }
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.currentTime = 0
    }
  }

  const fetchDerivDataAndPredict = async (
    predictionType: PredictionType,
    selection: string,
  ): Promise<EnhancedPredictionResult> => {
    if (LOCAL_ONLY_TYPES.includes(predictionType)) {
      // These contract types are intentionally analyzed from the shared local tick window.
      return await fallbackAnalysis(predictionType, selection)
    }

    console.log(`[v0] Fetching live data from Deriv.com for ${predictionType} prediction...`)

    try {
      const derivPrediction = await getPrediction(selectedSymbol, predictionType)

      let primaryEntry = ""

      if (predictionType === "over_under" || predictionType === "matches_differs") {
        // For Over/Under and Matches/Differs, show the target digit
        primaryEntry = derivPrediction.targetDigit?.toString() || "0"
      } else if (predictionType === "even_odd") {
        // For Even/Odd, show "Even" or "Odd"
        primaryEntry = derivPrediction.prediction === "even" ? "Even" : "Odd"
      } else if (predictionType === "rise_fall") {
        // For Rise/Fall, show "Rise" or "Fall"
        primaryEntry = derivPrediction.prediction === "rise" ? "Rise" : "Fall"
      }

      // Convert Deriv API response to our enhanced format
      const enhancedResult: EnhancedPredictionResult = {
        type: selection,
        digit: null,
        confidence: derivPrediction.confidence,
        runs: derivPrediction.confidence >= 85 ? 3 : derivPrediction.confidence >= 70 ? 2 : 1,
        recommendation:
          derivPrediction.confidence >= 80 ? "STRONG" : derivPrediction.confidence >= 65 ? "MODERATE" : "WEAK",
        analysis: derivPrediction.analysis,
        exactDigit: derivPrediction.targetDigit,
        entryPoints: {
          primary: primaryEntry,
          secondary: derivPrediction.recommendation,
          timing: derivPrediction.optimalTiming,
        },
        marketCondition: `Live ${selectedSymbol} analysis`,
        riskLevel: derivPrediction.riskLevel.toUpperCase() as "LOW" | "MEDIUM" | "HIGH",
        expectedOutcome: `${derivPrediction.confidence}% probability based on real Deriv data analysis`,
      }

      return enhancedResult
    } catch (error) {
      console.warn("[v0] Error fetching Deriv prediction, using local analysis:", error)
      // Always fallback to local analysis - no need to show connection errors to user
      return await fallbackAnalysis(predictionType, selection)
    }
  }

  const fallbackAnalysis = async (
    predictionType: PredictionType,
    selection: string,
  ): Promise<EnhancedPredictionResult> => {
    // All local analysis uses the same shared 1000-tick buffer.
    const recentData = ticksBuffer.slice(-SHARED_TICK_WINDOW)
    const veryRecentData = ticksBuffer.slice(-80)

    if (recentData.length < 20) {
      return {
        type: selection as EnhancedPredictionResult["type"],
        confidence: 0,
        runs: 0,
        recommendation: "WEAK",
        analysis: "Not enough buffered tick data yet. Please wait for more ticks.",
        digit: null,
        exactDigit: undefined,
        entryPoints: {
          primary: "Insufficient data",
          secondary: "Need at least 20 ticks to run analysis",
          timing: "Retry shortly",
        },
        marketCondition: "Data warming up",
        riskLevel: "HIGH",
        expectedOutcome: "No estimate available",
      }
    }

    let confidence = 50
    let recommendation = "WEAK"
    let analysis = ""
    let runs = 1
    let exactDigit: number | undefined
    let entryPoints = { primary: "", secondary: "", timing: "" }
    let marketCondition = ""
    let riskLevel: "LOW" | "MEDIUM" | "HIGH" = "MEDIUM"
    let expectedOutcome = ""

    switch (predictionType) {
      case "over_under":
        const overCount = recentData.filter((d) => d > 4).length
        const recentOverTrend = veryRecentData.filter((d) => d > 4).length / veryRecentData.length

        confidence =
          selection === "over"
            ? Math.round((overCount / recentData.length) * 100 + recentOverTrend * 15)
            : Math.round(((recentData.length - overCount) / recentData.length) * 100 + (1 - recentOverTrend) * 15)

        confidence = Math.max(25, Math.min(95, confidence))
        runs = confidence >= 85 ? 3 : confidence >= 70 ? 2 : 1
        recommendation = confidence >= 80 ? "STRONG" : confidence >= 65 ? "MODERATE" : "WEAK"

        const targetDigits = selection === "over" ? [5, 6, 7, 8, 9] : [0, 1, 2, 3, 4]
        const digitFreq: Record<number, number> = {}
        recentData.forEach((d) => (digitFreq[d] = (digitFreq[d] || 0) + 1))

        // Add randomness to avoid always picking the same digit
        const weightedTargets = targetDigits.map((digit) => ({
          digit,
          weight: (digitFreq[digit] || 0) + Math.random() * 3,
        }))
        exactDigit = weightedTargets.sort((a, b) => b.weight - a.weight)[0].digit

        entryPoints = {
          primary: exactDigit.toString(),
          secondary: `Target digit ${exactDigit} has ${Math.round(((digitFreq[exactDigit] || 0) / recentData.length) * 100)}% frequency`,
          timing: "Next 3-5 ticks optimal entry window",
        }

        marketCondition = "Fallback analysis - API unavailable"
        riskLevel = confidence > 70 ? "LOW" : confidence > 50 ? "MEDIUM" : "HIGH"
        expectedOutcome = `${confidence}% probability (fallback mode)`
        analysis = `Fallback Analysis: ${confidence}% confidence for ${selection.toUpperCase()}. Target digit: ${exactDigit}. API connection required for optimal results.`
        break

      case "even_odd":
        const evenCount = recentData.filter((d) => d % 2 === 0).length
        const recentEvenTrend = veryRecentData.filter((d) => d % 2 === 0).length / veryRecentData.length

        confidence =
          selection === "even"
            ? Math.round((evenCount / recentData.length) * 100 + recentEvenTrend * 10)
            : Math.round(((recentData.length - evenCount) / recentData.length) * 100 + (1 - recentEvenTrend) * 10)

        confidence = Math.max(30, Math.min(90, confidence))
        runs = confidence >= 80 ? 3 : confidence >= 65 ? 2 : 1
        recommendation = confidence >= 75 ? "STRONG" : confidence >= 60 ? "MODERATE" : "WEAK"

        const evenDigits = [0, 2, 4, 6, 8]
        const oddDigits = [1, 3, 5, 7, 9]
        const targetEvenOddDigits = selection === "even" ? evenDigits : oddDigits
        const evenOddFreq: Record<number, number> = {}
        recentData.forEach((d) => (evenOddFreq[d] = (evenOddFreq[d] || 0) + 1))

        // Add randomness to digit selection
        const weightedEvenOdd = targetEvenOddDigits.map((digit) => ({
          digit,
          weight: (evenOddFreq[digit] || 0) + Math.random() * 2,
        }))
        exactDigit = weightedEvenOdd.sort((a, b) => b.weight - a.weight)[0].digit

        entryPoints = {
          primary: selection === "even" ? "Even" : "Odd",
          secondary: `Most frequent ${selection} digit: ${exactDigit}`,
          timing: "Good entry window detected",
        }

        marketCondition = "Fallback analysis - API unavailable"
        riskLevel = confidence > 65 ? "LOW" : confidence > 45 ? "MEDIUM" : "HIGH"
        expectedOutcome = `${confidence}% probability (fallback mode)`
        analysis = `Fallback Analysis: ${confidence}% confidence for ${selection.toUpperCase()} digits. Target digit: ${exactDigit}.`
        break

      case "rise_fall":
        const priceChanges = recentData.slice(1).map((price, i) => price - recentData[i])
        const positiveChanges = priceChanges.filter((change) => change > 0).length
        const trendStrength = Math.abs(positiveChanges / priceChanges.length - 0.5) * 2

        confidence =
          selection === "rise"
            ? Math.round((positiveChanges / priceChanges.length) * 100 + trendStrength * 20)
            : Math.round(((priceChanges.length - positiveChanges) / priceChanges.length) * 100 + trendStrength * 20)

        confidence = Math.max(35, Math.min(90, confidence))
        runs = confidence >= 80 ? 3 : confidence >= 65 ? 2 : 1
        recommendation = confidence >= 75 ? "STRONG" : confidence >= 60 ? "MODERATE" : "WEAK"

        entryPoints = {
          primary: selection === "rise" ? "Rise" : "Fall",
          secondary: `Trend strength: ${Math.round(trendStrength * 100)}%`,
          timing: "Monitor next few ticks for confirmation",
        }

        marketCondition = "Fallback analysis - API unavailable"
        riskLevel = confidence > 70 ? "LOW" : confidence > 50 ? "MEDIUM" : "HIGH"
        expectedOutcome = `${confidence}% probability (fallback mode)`
        analysis = `Fallback Analysis: ${confidence}% confidence for ${selection.toUpperCase()} movement.`
        break

      case "matches_differs":
        const lastDigitInBuffer = recentData[recentData.length - 1]
        const digitOccurrences = recentData.filter((d) => d === lastDigitInBuffer).length
        const digitFrequency = digitOccurrences / recentData.length

        confidence =
          selection === "matches"
            ? Math.round(digitFrequency * 100 + (digitFrequency > 0.1 ? 20 : 0))
            : Math.round((1 - digitFrequency) * 100 + (digitFrequency < 0.1 ? 15 : 0))

        confidence = Math.max(40, Math.min(85, confidence))
        runs = confidence >= 75 ? 3 : confidence >= 60 ? 2 : 1
        recommendation = confidence >= 70 ? "STRONG" : confidence >= 55 ? "MODERATE" : "WEAK"

        if (selection === "matches") {
          exactDigit = lastDigitInBuffer
        } else {
          // For differs, pick a different digit with some randomness
          const otherDigits = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].filter((d) => d !== lastDigitInBuffer)
          const digitFreqs: Record<number, number> = {}
          recentData.forEach((d) => (digitFreqs[d] = (digitFreqs[d] || 0) + 1))

          const weightedOthers = otherDigits.map((digit) => ({
            digit,
            weight: (digitFreqs[digit] || 0) + Math.random() * 2,
          }))
          exactDigit = weightedOthers.sort((a, b) => b.weight - a.weight)[0].digit
        }

        entryPoints = {
          primary: exactDigit.toString(),
          secondary: `Target digit frequency: ${Math.round(digitFrequency * 100)}%`,
          timing: "Ready for entry",
        }

        marketCondition = "Fallback analysis - API unavailable"
        riskLevel = confidence > 65 ? "LOW" : confidence > 50 ? "MEDIUM" : "HIGH"
        expectedOutcome = `${confidence}% probability (fallback mode)`
        analysis = `Fallback Analysis: ${confidence}% confidence for digit ${exactDigit} to ${selection}. Last digit was ${lastDigitInBuffer}.`
        break

      case "accumulators":
        const repeatPairs = recentData.slice(1).filter((digit, i) => digit === recentData[i]).length
        const repeatRate = repeatPairs / Math.max(1, recentData.length - 1)

        confidence =
          selection === "accumulate"
            ? Math.round(55 + repeatRate * 35)
            : Math.round(50 + (1 - repeatRate) * 35)

        confidence = Math.max(35, Math.min(92, confidence))
        runs = confidence >= 82 ? 3 : confidence >= 66 ? 2 : 1
        recommendation = confidence >= 76 ? "STRONG" : confidence >= 60 ? "MODERATE" : "WEAK"

        entryPoints = {
          primary: selection === "accumulate" ? "Continue" : "Reset",
          secondary: `Streak persistence ${Math.round(repeatRate * 100)}%`,
          timing: "Best within next 2-4 ticks",
        }

        marketCondition = "Accumulator structure from shared 1000-tick history"
        riskLevel = confidence > 70 ? "LOW" : confidence > 55 ? "MEDIUM" : "HIGH"
        expectedOutcome = `${confidence}% probability for ${selection}`
        analysis = `Local Analysis: ${confidence}% confidence for ${selection.toUpperCase()} using repeat-pattern persistence.`
        break

      case "only_ups":
        const recentMoves = recentData.slice(1).map((d, i) => d - recentData[i])
        const upMoves = recentMoves.filter((m) => m > 0).length
        const flatMoves = recentMoves.filter((m) => m === 0).length
        const upBias = (upMoves + flatMoves * 0.35) / Math.max(1, recentMoves.length)

        confidence =
          selection === "only_up"
            ? Math.round(52 + upBias * 40)
            : Math.round(52 + (1 - upBias) * 35)

        confidence = Math.max(30, Math.min(90, confidence))
        runs = confidence >= 80 ? 3 : confidence >= 64 ? 2 : 1
        recommendation = confidence >= 74 ? "STRONG" : confidence >= 58 ? "MODERATE" : "WEAK"

        entryPoints = {
          primary: selection === "only_up" ? "Only Up" : "Break Up",
          secondary: `Up-bias ${Math.round(upBias * 100)}%`,
          timing: "Trigger on low pullback ticks",
        }

        marketCondition = "Momentum check from shared 1000-tick history"
        riskLevel = confidence > 68 ? "LOW" : confidence > 52 ? "MEDIUM" : "HIGH"
        expectedOutcome = `${confidence}% directional persistence estimate`
        analysis = `Local Analysis: ${confidence}% confidence for ${selection.toUpperCase()} based on momentum persistence.`
        break

      case "higher_lower":
        const currentDigit = recentData[recentData.length - 1]
        const higherCount = recentData.filter((d) => d > currentDigit).length
        const lowerCount = recentData.filter((d) => d < currentDigit).length
        const relativeTotal = Math.max(1, higherCount + lowerCount)

        confidence =
          selection === "higher"
            ? Math.round((higherCount / relativeTotal) * 100)
            : Math.round((lowerCount / relativeTotal) * 100)

        confidence = Math.max(35, Math.min(88, confidence))
        runs = confidence >= 78 ? 3 : confidence >= 62 ? 2 : 1
        recommendation = confidence >= 72 ? "STRONG" : confidence >= 56 ? "MODERATE" : "WEAK"

        entryPoints = {
          primary: selection === "higher" ? "Higher" : "Lower",
          secondary: `Ref digit ${currentDigit}`,
          timing: "Next tick window preferred",
        }

        marketCondition = "Relative-position model from shared 1000-tick history"
        riskLevel = confidence > 66 ? "LOW" : confidence > 50 ? "MEDIUM" : "HIGH"
        expectedOutcome = `${confidence}% relative move probability`
        analysis = `Local Analysis: ${confidence}% confidence for ${selection.toUpperCase()} versus reference digit ${currentDigit}.`
        break

      default:
        confidence = Math.floor(Math.random() * 30) + 35 // Random between 35-65
        runs = 1
        recommendation = "WEAK"
        exactDigit = Math.floor(Math.random() * 10) // Random digit 0-9
        analysis = `Fallback mode - limited analysis available. Random target digit: ${exactDigit}`
        entryPoints = {
          primary: "API connection required for detailed entry points",
          secondary: "Please check your internet connection",
          timing: "Retry when connected",
        }
        marketCondition = "API unavailable"
        riskLevel = "HIGH"
        expectedOutcome = "Limited prediction capability without data source"
    }

    return {
      type: selection,
      confidence: Math.max(25, Math.min(95, confidence)),
      runs,
      recommendation,
      analysis,
      digit: null,
      exactDigit,
      entryPoints,
      marketCondition,
      riskLevel,
      expectedOutcome,
    }
  }

  const runAnalysis = async () => {
    // Validate prerequisites before starting analysis
    if (!selectedSymbol || !selectedSymbol.trim()) {
      console.error("[v0] Cannot start analysis: No market symbol selected")
      return
    }

    if (!choice) {
      console.error("[v0] Cannot start analysis: No prediction choice selected")
      return
    }

    // Start audio first while still in direct user click context.
    playTimerSound()

    // Clear previous results to prevent showing stale data
    setResult(null)
    setIsAnalyzing(true)
    
    let seconds = 10

    // Fast-moving random code generation
    randomCodeIntervalRef.current = setInterval(() => {
      setRandomCode(generateRandomCode())
    }, 50)

    // Countdown animation during analysis
    while (seconds > 0) {
      setCountdown(seconds)
      await new Promise((resolve) => setTimeout(resolve, 1000))
      seconds--
    }

    if (randomCodeIntervalRef.current) {
      clearInterval(randomCodeIntervalRef.current)
      randomCodeIntervalRef.current = null
    }
    stopTimerSound()
    setRandomCode("")

    try {
      console.log(`[v0] Starting analysis for ${predictionType} on ${selectedSymbol}...`)
      const analysisResult = await fetchDerivDataAndPredict(predictionType, choice)
      setResult(analysisResult)
      onRunComplete(analysisResult.runs)
      console.log("[v0] Analysis completed successfully")
    } catch (error) {
      console.error("[v0] Analysis failed:", error)
      const errorMessage = error instanceof Error ? error.message : "Analysis failed - please try again"
      
      // Show error result
      setResult({
        type: choice as any,
        digit: null,
        confidence: 0,
        runs: 0,
        recommendation: "WEAK",
        analysis: errorMessage,
        exactDigit: undefined,
        entryPoints: {
          primary: "Analysis Error",
          secondary: "Please check market selection and try again",
          timing: "Ready for retry",
        },
        marketCondition: "Error",
        riskLevel: "HIGH",
        expectedOutcome: "Failed",
      })
      onRunComplete(0)
    } finally {
      setIsAnalyzing(false)
      setCountdown(0)
    }
  }

  const getPredictionIcon = (type: PredictionType) => {
    switch (type) {
      case "over_under":
        return <TrendingUp className="h-5 w-5" />
      case "matches_differs":
        return <Target className="h-5 w-5" />
      case "even_odd":
        return <Hash className="h-5 w-5" />
      case "rise_fall":
        return <BarChart3 className="h-5 w-5" />
      case "accumulators":
        return <Zap className="h-5 w-5" />
      case "only_ups":
        return <ArrowUpRight className="h-5 w-5" />
      case "higher_lower":
        return <ArrowUpDown className="h-5 w-5" />
      default:
        return <TrendingUp className="h-5 w-5" />
    }
  }

  const renderPredictionOptions = () => {
    switch (predictionType) {
      case "over_under":
        return (
          <RadioGroup value={choice} onValueChange={setChoice}>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="over" id="over" />
              <Label htmlFor="over">Over</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="under" id="under" />
              <Label htmlFor="under">Under</Label>
            </div>
          </RadioGroup>
        )

      case "matches_differs":
        return (
          <div className="space-y-4">
            <div className="text-sm text-primary bg-muted p-3 rounded-lg">
              AI will analyze Deriv.com data and provide exact digit predictions with entry points
            </div>
            <RadioGroup value={choice} onValueChange={setChoice}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="matches" id="matches" />
                <Label htmlFor="matches">Matches</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="differs" id="differs" />
                <Label htmlFor="differs">Differs</Label>
              </div>
            </RadioGroup>
          </div>
        )

      case "even_odd":
        return (
          <RadioGroup value={choice} onValueChange={setChoice}>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="even" id="even" />
              <Label htmlFor="even">Even</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="odd" id="odd" />
              <Label htmlFor="odd">Odd</Label>
            </div>
          </RadioGroup>
        )

      case "rise_fall":
        return (
          <RadioGroup value={choice} onValueChange={setChoice}>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="rise" id="rise" />
              <Label htmlFor="rise">Rise</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="fall" id="fall" />
              <Label htmlFor="fall">Fall</Label>
            </div>
          </RadioGroup>
        )

      case "accumulators":
        return (
          <RadioGroup value={choice} onValueChange={setChoice}>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="accumulate" id="accumulate" />
              <Label htmlFor="accumulate">Accumulate</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="reset" id="reset" />
              <Label htmlFor="reset">Reset</Label>
            </div>
          </RadioGroup>
        )

      case "only_ups":
        return (
          <RadioGroup value={choice} onValueChange={setChoice}>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="only_up" id="only_up" />
              <Label htmlFor="only_up">Only Up</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="not_only_up" id="not_only_up" />
              <Label htmlFor="not_only_up">Break Up</Label>
            </div>
          </RadioGroup>
        )

      case "higher_lower":
        return (
          <RadioGroup value={choice} onValueChange={setChoice}>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="higher" id="higher" />
              <Label htmlFor="higher">Higher</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="lower" id="lower" />
              <Label htmlFor="lower">Lower</Label>
            </div>
          </RadioGroup>
        )
      default:
        return null
    }
  }

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-50">
      {/* Terminal-style modal with cyan borders */}
      <Card className="w-[500px] bg-black/95 border-[4px] border-cyan-500 cyan-glow shadow-2xl rounded-lg flex flex-col">
        {/* Terminal Header with red dots */}
        <CardHeader className="border-b-[2px] border-cyan-500 px-4 py-3 flex-shrink-0 bg-black">
          <CardTitle className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded-full bg-red-500"></span>
                <span className="h-3 w-3 rounded-full bg-red-500"></span>
                <span className="h-3 w-3 rounded-full bg-red-500"></span>
              </div>
              <Calculator className="h-5 w-5 text-cyan-500" />
              <span className="text-base font-bold text-cyan-500">AI Prediction Terminal</span>
            </div>
            {/* Status badge - single, clear indicator */}
            {isConnecting && (
              <div className="flex items-center gap-1.5 text-xs px-2 py-1 rounded border bg-black/80 text-cyan-400 border-cyan-500">
                <Loader2 className="h-3 w-3 animate-spin" />
                <span className="font-medium">Connecting...</span>
              </div>
            )}
            {error && !isConnecting && (
              <div className="flex items-center gap-1.5 text-xs px-2 py-1 rounded border bg-black/80 text-yellow-400 border-yellow-500">
                <WifiOff className="h-3 w-3" />
                <span className="font-medium">Fallback Mode</span>
              </div>
            )}
            {isConnected && !error && !isConnecting && (
              <div className="flex items-center gap-1.5 text-xs px-2 py-1 rounded border bg-black/80 text-lime-400 border-lime-500">
                <Wifi className="h-3 w-3" />
                <span className="font-medium">Live Deriv API</span>
              </div>
            )}
            {!isConnected && !error && !isConnecting && (
              <div className="flex items-center gap-1.5 text-xs px-2 py-1 rounded border bg-black/80 text-red-400 border-red-500">
                <WifiOff className="h-3 w-3" />
                <span className="font-medium">Offline</span>
              </div>
            )}
          </CardTitle>
        </CardHeader>

        {/* Content - Fixed height with no scroll for normal cases */}
        <div className="flex-1 overflow-hidden flex flex-col">
          <CardContent className="flex-1 overflow-y-auto px-4 py-3 space-y-2.5">
            {/* Symbol Control */}
            <div className="flex items-center justify-between gap-2">
              <Label htmlFor="symbol" className="text-xs font-medium">Market:</Label>
              <select
                id="symbol"
                value={selectedSymbol}
                onChange={(e) => setSelectedSymbol(e.target.value)}
                className="text-xs bg-input border border-border rounded px-2 py-1 text-foreground w-40"
              >
                {VOLATILITY_INDICES.map((market) => (
                  <option key={market.symbol} value={market.symbol}>
                    {market.display_name}
                  </option>
                ))}
              </select>
            </div>

            {/* Unified analysis info section */}
            <div className="bg-muted/50 p-2.5 rounded border border-border">
              <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                {getPredictionIcon(predictionType)}
                <span className="font-medium">
                  {predictionType === "over_under" && "Over/Under Analysis"}
                  {predictionType === "even_odd" && "Even/Odd Analysis"}
                  {predictionType === "rise_fall" && "Rise/Fall Analysis"}
                  {predictionType === "matches_differs" && "Matches/Differs Analysis"}
                  {predictionType === "accumulators" && "Accumulators Analysis"}
                  {predictionType === "only_ups" && "Only Ups Analysis"}
                  {predictionType === "higher_lower" && "Higher/Lower Analysis"}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mb-2">
                Using shared last {Math.min(SHARED_TICK_WINDOW, ticksBuffer.length)} ticks for analysis.
              </p>
              {error && (
                <div className="text-xs text-destructive bg-destructive/10 p-1.5 rounded border border-destructive/30 mb-2">
                  {error}
                </div>
              )}
              {/* Prediction options */}
              <div className="space-y-1.5">
                {renderPredictionOptions()}
              </div>
            </div>

            {/* Analyzing state - replaces content with terminal-style animation */}
            {isAnalyzing && (
              <div className="bg-black/90 border-[2px] border-cyan-500 p-4 rounded text-center space-y-3">
                {/* Fast-moving random codes */}
                <div className="h-24 overflow-hidden bg-black/80 border border-cyan-500/50 p-2 rounded">
                  <div className="analysis-matrix text-xs font-mono text-lime-400 whitespace-pre leading-tight text-left">
                    {`${randomCode}\n${randomCode}\n${randomCode}`}
                  </div>
                </div>
                
                {/* Countdown timer */}
                <div className="text-3xl font-bold text-cyan-500 animate-pulse">
                  {countdown}
                </div>
                
                <div className="text-sm font-semibold text-cyan-400 terminal-text">
                  <span className="animate-pulse">Analyzing market data...</span>
                </div>
                
                <div className="text-xs text-lime-400 flex flex-wrap justify-center gap-2">
                  <span className={countdown > 3 ? "font-medium text-cyan-400" : ""}>Fetch</span>
                  <span>→</span>
                  <span className={countdown <= 3 && countdown > 2 ? "font-medium text-cyan-400" : ""}>Analyze</span>
                  <span>→</span>
                  <span className={countdown <= 2 && countdown > 1 ? "font-medium text-cyan-400" : ""}>Calculate</span>
                  <span>→</span>
                  <span className={countdown <= 1 ? "font-medium text-cyan-400" : ""}>Generate</span>
                </div>
              </div>
            )}

            {/* Results display - terminal-style */}
            {result && !isAnalyzing && (
              <div className="bg-black/90 border-[2px] border-lime-500 p-3 rounded space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-cyan-400">Entry Point:</span>
                  <span className="font-bold text-lime-400">{result.entryPoints.primary}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-cyan-400">Confidence:</span>
                  <span className="font-bold text-lime-400">{result.confidence}%</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-cyan-400">Runs:</span>
                  <Badge variant="secondary" className="text-xs bg-cyan-900 text-cyan-400 border-cyan-500">{result.runs}</Badge>
                </div>
                <div className="border-t-[2px] border-cyan-500/50 pt-2">
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-lime-400">{result.marketCondition}</span>
                    <Badge
                      variant={
                        result.riskLevel === "LOW"
                          ? "secondary"
                          : result.riskLevel === "MEDIUM"
                            ? "outline"
                            : "destructive"
                      }
                      className={`text-xs ${
                        result.riskLevel === "LOW"
                          ? "bg-lime-900 text-lime-400 border-lime-500"
                          : result.riskLevel === "MEDIUM"
                            ? "bg-yellow-900 text-yellow-400 border-yellow-500"
                            : "bg-red-900 text-red-400 border-red-500"
                      }`}
                    >
                      {result.riskLevel}
                    </Badge>
                  </div>
                  <div className="text-xs text-cyan-400 italic">{result.entryPoints.timing}</div>
                </div>
              </div>
            )}
          </CardContent>
        </div>

        {/* Footer Buttons - Terminal-style */}
        <div className="border-t-[2px] border-cyan-500 bg-black px-4 py-3 flex gap-2 flex-shrink-0">
          <Button
            onClick={runAnalysis}
            disabled={isAnalyzing}
            className="flex-1 bg-cyan-600 hover:bg-cyan-700 text-black font-bold border-2 border-cyan-400"
          >
            {isAnalyzing ? "Analyzing..." : "Start Analysis"}
          </Button>
          <Button
            variant="outline"
            onClick={onClose}
            className="flex-1 border-2 border-cyan-500 text-cyan-400 hover:bg-cyan-900/50"
          >
            Close
          </Button>
        </div>
      </Card>
    </div>
  )
}
