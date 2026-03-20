"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import type { PredictionResult, PredictionType } from "@/types/trading"
import { TrendingUp, Target, Hash, BarChart3, Zap, Wifi, WifiOff, Loader2 } from "lucide-react"
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
      default:
        return "over"
    }
  }

  const [choice, setChoice] = useState<string>(getInitialChoice(predictionType))
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [countdown, setCountdown] = useState(0)
  const [result, setResult] = useState<EnhancedPredictionResult | null>(null)
  const [selectedSymbol, setSelectedSymbol] = useState("R_100") // Default to Volatility 100 Index

  const fetchDerivDataAndPredict = async (
    predictionType: PredictionType,
    selection: string,
  ): Promise<EnhancedPredictionResult> => {
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
      console.error("[v0] Error fetching Deriv prediction:", error)
      if (error instanceof Error && error.message.includes("Unable to establish connection")) {
        throw error // Re-throw connection errors to show user
      }
      // Fallback to simulated analysis if API fails for other reasons
      console.log("[v0] Falling back to local analysis...")
      return await fallbackAnalysis(predictionType, selection)
    }
  }

  const fallbackAnalysis = async (
    predictionType: PredictionType,
    selection: string,
  ): Promise<EnhancedPredictionResult> => {
    // Use existing simulated logic as fallback
    const recentData = ticksBuffer.slice(-100)
    const veryRecentData = ticksBuffer.slice(-20)

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
    setIsAnalyzing(true)
    let seconds = 15

    while (seconds > 0) {
      setCountdown(seconds)
      await new Promise((resolve) => setTimeout(resolve, 1000))
      seconds--
    }

    try {
      const analysisResult = await fetchDerivDataAndPredict(predictionType, choice)
      setResult(analysisResult)
      onRunComplete(analysisResult.runs)
    } catch (error) {
      console.error("[v0] Analysis failed:", error)
      setResult({
        type: choice as any,
        digit: null,
        confidence: 25,
        runs: 1,
        recommendation: "WEAK",
        analysis: error instanceof Error ? error.message : "Analysis failed - please try again",
        exactDigit: undefined,
        entryPoints: {
          primary: "Connection issue detected",
          secondary: "Please check your internet connection",
          timing: "Retry when connected",
        },
        marketCondition: "Connection Error",
        riskLevel: "HIGH",
        expectedOutcome: "Unable to complete analysis",
      })
      onRunComplete(1)
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
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <Card className="w-[520px] max-h-[85vh] overflow-y-auto bg-slate-900 border-slate-700 shadow-2xl rounded-2xl">
        <CardHeader className="bg-gradient-to-r from-slate-800 to-slate-800 border-b border-slate-700 rounded-t-2xl text-center py-4">
          <CardTitle className="flex flex-col items-center gap-2 text-white">
            <div className="flex items-center justify-center gap-2">
              <Calculator className="h-5 w-5 text-cyan-400" />
              <span className="text-lg font-bold">AI Prediction</span>
            </div>
            <div className="flex items-center justify-center gap-2 mt-1">
              {isConnected ? (
                <div className="flex items-center gap-1 text-green-400 bg-green-500/10 px-2 py-0.5 rounded-full text-xs border border-green-500/30">
                  <Wifi className="h-3 w-3" />
                  <span>Connected</span>
                </div>
              ) : (
                <div className="flex items-center gap-1 text-red-400 bg-red-500/10 px-2 py-0.5 rounded-full text-xs border border-red-500/30">
                  <WifiOff className="h-3 w-3" />
                  <span>Disconnected</span>
                </div>
              )}
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-slate-100 px-4 py-4">
          <div className="bg-slate-800/50 p-3 rounded-lg border border-slate-700">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-slate-300">API Status:</span>
              <Badge variant={isConnected ? "default" : "destructive"} className="rounded-full px-2 py-0.5 text-xs">
                {isConnecting ? "Connecting..." : isConnected ? "Connected" : "Disconnected"}
              </Badge>
            </div>
            {error && <div className="text-xs text-red-400 mt-1 bg-red-500/10 p-1.5 rounded border border-red-500/30">Error: {error}</div>}
            <div className="flex items-center justify-between mt-2">
              <span className="text-xs text-slate-300">Symbol:</span>
              <select
                value={selectedSymbol}
                onChange={(e) => setSelectedSymbol(e.target.value)}
                className="text-xs bg-slate-700 border border-slate-600 rounded px-2 py-1 text-slate-100"
              >
                {VOLATILITY_INDICES.map((market) => (
                  <option key={market.symbol} value={market.symbol}>
                    {market.display_name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {predictionType === "over_under" && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs text-cyan-300 bg-cyan-500/10 p-2.5 rounded border border-cyan-500/30">
                <div className="flex-shrink-0 w-6 h-6 bg-cyan-500/20 rounded-full flex items-center justify-center">
                  {getPredictionIcon("over_under")}
                </div>
                <span className="leading-tight">
                  {isConnected
                    ? "AI analyzing Deriv data for predictions"
                    : "Using fallback analysis"}
                </span>
              </div>
              <div className="bg-slate-800/50 p-2.5 rounded border border-slate-700">
                {renderPredictionOptions()}
              </div>
            </div>
          )}

          {predictionType === "matches_differs" && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs text-cyan-300 bg-cyan-500/10 p-2.5 rounded border border-cyan-500/30">
                <div className="flex-shrink-0 w-8 h-8 bg-cyan-100 rounded-full flex items-center justify-center">
                  {getPredictionIcon("matches_differs")}
                </div>
                <span>
                  AI will analyze Deriv.com data and provide exact digit predictions with entry points
                </span>
              </div>
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                {renderPredictionOptions()}
              </div>
            </div>
          )}

          {predictionType === "even_odd" && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs text-cyan-300 bg-cyan-500/10 p-2.5 rounded border border-cyan-500/30">
                <div className="flex-shrink-0 w-6 h-6 bg-cyan-500/20 rounded-full flex items-center justify-center">
                  <Hash className="h-4 w-4" />
                </div>
                <span className="leading-tight">
                  {isConnected
                    ? "AI predicting even/odd digits"
                    : "Fallback analysis active"}
                </span>
              </div>
              <div className="bg-slate-800/50 p-2.5 rounded border border-slate-700">
                {renderPredictionOptions()}
              </div>
            </div>
          )}

          {predictionType === "rise_fall" && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs text-cyan-300 bg-cyan-500/10 p-2.5 rounded border border-cyan-500/30">
                <div className="flex-shrink-0 w-6 h-6 bg-cyan-500/20 rounded-full flex items-center justify-center">
                  <BarChart3 className="h-4 w-4" />
                </div>
                <span>
                  {isConnected
                    ? "AI will analyze live price momentum and provide precise entry points"
                    : "Trend analysis available - API recommended for accuracy"}
                </span>
              </div>
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                {renderPredictionOptions()}
              </div>
            </div>
          )}

          {isAnalyzing && (
            <div className="text-center py-4 bg-slate-800/50 p-4 rounded border border-slate-700">
              <div className="relative inline-flex items-center justify-center mb-3">
                {/* Animated analysis circle with flowing particles */}
                <AnimatedAnalysisCircle countdown={countdown} isConnected={isConnected} />
              </div>

              <div className="space-y-2">
                <div className="text-sm font-bold text-cyan-300">
                  {countdown > 0 ? (
                    <span className="animate-pulse">
                      {isConnected ? "Analyzing Data" : "Processing Data"}
                    </span>
                  ) : (
                    <span className="flex items-center justify-center gap-2">
                      <Zap className="h-4 w-4 text-cyan-400 animate-pulse" />
                      Generating Predictions
                      <Zap className="h-4 w-4 text-cyan-400 animate-pulse" />
                    </span>
                  )}
                </div>

                {/* Animated progress steps */}
                <div className="flex flex-col items-center justify-center gap-1 text-xs text-slate-400 mt-2">
                  {isConnected ? (
                    <div className="flex flex-wrap items-center justify-center gap-1 text-xs">
                      <span className={countdown > 11 ? "text-cyan-300 font-medium" : "text-slate-500"}>Fetching</span>
                      <span className="opacity-30">•</span>
                      <span className={countdown <= 11 && countdown > 7 ? "text-cyan-300 font-medium" : "text-slate-500"}>
                        Analyze
                      </span>
                      <span className="opacity-30">•</span>
                      <span className={countdown <= 7 && countdown > 3 ? "text-cyan-300 font-medium" : "text-slate-500"}>
                        Calculate
                      </span>
                      <span className="opacity-30">•</span>
                      <span className={countdown <= 3 ? "text-cyan-300 font-medium" : "text-slate-500"}>Generate</span>
                    </div>
                  ) : (
                    <div className="flex flex-wrap items-center justify-center gap-1 text-xs">
                      <span className={countdown > 9 ? "text-cyan-300 font-medium" : "text-slate-500"}>Analyze</span>
                      <span className="opacity-30">•</span>
                      <span className={countdown <= 9 && countdown > 5 ? "text-cyan-300 font-medium" : "text-slate-500"}>
                        Detect
                      </span>
                      <span className="opacity-30">•</span>
                      <span className={countdown <= 5 ? "text-cyan-300 font-medium" : "text-slate-500"}>Compute</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {result && (
            <div className="bg-slate-800/50 p-3 rounded space-y-2 border border-slate-700">
              <div className="space-y-2">
                <div className="bg-slate-700/50 p-2.5 rounded space-y-1.5 border border-slate-600">
                  <div className="flex items-center justify-between text-xs">
                    <strong className="text-slate-200">Entry:</strong>
                    <span className="font-bold text-cyan-400">{result.entryPoints.primary}</span>
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <strong className="text-slate-200">Runs:</strong>
                    <Badge className="bg-cyan-600/60 text-cyan-100 text-xs">{result.runs}</Badge>
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <strong className="text-slate-200">Confidence:</strong>
                    <span className="font-bold text-cyan-400">{result.confidence}%</span>
                  </div>
                </div>

                <div className="bg-slate-700/30 p-2 rounded space-y-1 border border-slate-600/50">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-300">Market: {result.marketCondition}</span>
                    <Badge className={`rounded px-1.5 py-0.5 text-xs ${
                      result.riskLevel === "LOW"
                        ? "bg-green-600/60 text-green-100"
                        : result.riskLevel === "MEDIUM"
                          ? "bg-yellow-600/60 text-yellow-100"
                          : "bg-red-600/60 text-red-100"
                    }`}>
                      {result.riskLevel}
                    </Badge>
                  </div>
                  <div className="text-xs text-slate-400 italic">{result.entryPoints.timing}</div>
                </div>
              </div>
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <Button
              onClick={runAnalysis}
              disabled={isAnalyzing}
              className="flex-1 bg-cyan-600 hover:bg-cyan-700 text-white font-semibold rounded py-2 text-sm"
            >
              {isAnalyzing ? "Analyzing..." : "Analyze"}
            </Button>
            <Button variant="outline" onClick={onClose} className="flex-1 bg-slate-700/50 hover:bg-slate-700 border-slate-600 text-slate-100 font-semibold rounded py-2 text-sm">
              Close
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
