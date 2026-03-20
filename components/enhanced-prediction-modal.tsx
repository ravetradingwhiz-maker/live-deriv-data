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
    const radioClasses = "space-y-1.5"
    const itemClasses = "flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity"
    const labelClasses = "text-sm font-medium text-foreground cursor-pointer"

    switch (predictionType) {
      case "over_under":
        return (
          <RadioGroup value={choice} onValueChange={setChoice} className={radioClasses}>
            <div className={itemClasses}>
              <RadioGroupItem value="over" id="over" />
              <Label htmlFor="over" className={labelClasses}>Over 4.5</Label>
            </div>
            <div className={itemClasses}>
              <RadioGroupItem value="under" id="under" />
              <Label htmlFor="under" className={labelClasses}>Under 5</Label>
            </div>
          </RadioGroup>
        )

      case "matches_differs":
        return (
          <RadioGroup value={choice} onValueChange={setChoice} className={radioClasses}>
            <div className={itemClasses}>
              <RadioGroupItem value="matches" id="matches" />
              <Label htmlFor="matches" className={labelClasses}>Matches Last</Label>
            </div>
            <div className={itemClasses}>
              <RadioGroupItem value="differs" id="differs" />
              <Label htmlFor="differs" className={labelClasses}>Differs from Last</Label>
            </div>
          </RadioGroup>
        )

      case "even_odd":
        return (
          <RadioGroup value={choice} onValueChange={setChoice} className={radioClasses}>
            <div className={itemClasses}>
              <RadioGroupItem value="even" id="even" />
              <Label htmlFor="even" className={labelClasses}>Even</Label>
            </div>
            <div className={itemClasses}>
              <RadioGroupItem value="odd" id="odd" />
              <Label htmlFor="odd" className={labelClasses}>Odd</Label>
            </div>
          </RadioGroup>
        )

      case "rise_fall":
        return (
          <RadioGroup value={choice} onValueChange={setChoice} className={radioClasses}>
            <div className={itemClasses}>
              <RadioGroupItem value="rise" id="rise" />
              <Label htmlFor="rise" className={labelClasses}>Rise</Label>
            </div>
            <div className={itemClasses}>
              <RadioGroupItem value="fall" id="fall" />
              <Label htmlFor="fall" className={labelClasses}>Fall</Label>
            </div>
          </RadioGroup>
        )
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 dark:bg-black/60 flex items-center justify-center z-50">
      <Card className="w-[520px] max-h-[80vh] overflow-hidden bg-card border border-border shadow-2xl rounded-lg flex flex-col">
        {/* Header */}
        <CardHeader className="border-b border-border bg-muted/30 px-4 py-3 flex-shrink-0">
          <CardTitle className="flex flex-col items-center gap-1.5 text-card-foreground">
            <div className="flex items-center justify-center gap-2">
              <Calculator className="h-5 w-5 text-primary" />
              <span className="text-base font-bold">AI Prediction Analysis</span>
            </div>
            {/* Single, clear status badge */}
            <div className="flex items-center justify-center">
              {isConnected && !error ? (
                <div className="flex items-center gap-1 text-xs text-green-700 dark:text-green-300 bg-green-100 dark:bg-green-950 px-2 py-1 rounded-full border border-green-300 dark:border-green-700">
                  <Wifi className="h-3 w-3" />
                  <span>Connected to Deriv</span>
                </div>
              ) : error ? (
                <div className="flex items-center gap-1 text-xs text-red-700 dark:text-red-300 bg-red-100 dark:bg-red-950 px-2 py-1 rounded-full border border-red-300 dark:border-red-700">
                  <WifiOff className="h-3 w-3" />
                  <span>Using fallback mode</span>
                </div>
              ) : (
                <div className="flex items-center gap-1 text-xs text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-950 px-2 py-1 rounded-full border border-amber-300 dark:border-amber-700">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  <span>Connecting...</span>
                </div>
              )}
            </div>
          </CardTitle>
        </CardHeader>

        {/* Scrollable content area */}
        <CardContent className="flex-1 overflow-y-auto px-4 py-3 space-y-2.5">
          {/* Symbol and API Status - Compact Control Panel */}
          <div className="bg-muted/50 p-2.5 rounded border border-border">
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="text-xs font-medium text-muted-foreground">Market:</span>
              <select
                value={selectedSymbol}
                onChange={(e) => setSelectedSymbol(e.target.value)}
                className="text-xs bg-background border border-input rounded px-2 py-1 text-foreground"
              >
                {VOLATILITY_INDICES.map((market) => (
                  <option key={market.symbol} value={market.symbol}>
                    {market.display_name}
                  </option>
                ))}
              </select>
            </div>
            {error && (
              <div className="text-xs text-red-700 dark:text-red-300 bg-red-100 dark:bg-red-950 p-1.5 rounded border border-red-300 dark:border-red-700">
                {error}
              </div>
            )}
          </div>

          {/* Prediction Type Options - Unified Section */}
          <div className="bg-muted/50 p-2.5 rounded border border-border">
            <div className="flex items-center gap-2 mb-2">
              <div className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center text-primary">
                {getPredictionIcon(predictionType)}
              </div>
              <span className="text-xs font-medium text-foreground">
                {predictionType === "over_under" && "Over/Under"}
                {predictionType === "even_odd" && "Even/Odd"}
                {predictionType === "rise_fall" && "Rise/Fall"}
                {predictionType === "matches_differs" && "Matches/Differs"}
              </span>
            </div>
            <div className="text-xs text-muted-foreground mb-2">
              {isConnected ? "Live Deriv data analysis" : "Using historical data"}
            </div>
            <div className="space-y-1.5">
              {renderPredictionOptions()}
            </div>
          </div>

          {isAnalyzing && (
            <div className="text-center bg-muted p-3 rounded border border-border space-y-2">
              <div className="relative inline-flex items-center justify-center h-16">
                <AnimatedAnalysisCircle countdown={countdown} isConnected={isConnected} />
              </div>

              <div className="text-sm font-bold text-foreground">
                {countdown > 0 ? (
                  <span className="animate-pulse">
                    {isConnected ? "Analyzing live data..." : "Processing data..."}
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-1.5 text-xs">
                    <Zap className="h-4 w-4 text-primary animate-pulse" />
                    Generating predictions
                    <Zap className="h-4 w-4 text-primary animate-pulse" />
                  </span>
                )}
              </div>

              {/* Progress steps - condensed */}
              <div className="flex flex-wrap items-center justify-center gap-1 text-xs text-muted-foreground mt-1">
                {isConnected ? (
                  <>
                    <span className={countdown > 11 ? "font-medium text-foreground" : ""}>Fetch</span>
                    <span>•</span>
                    <span className={countdown <= 11 && countdown > 7 ? "font-medium text-foreground" : ""}>Analyze</span>
                    <span>•</span>
                    <span className={countdown <= 7 && countdown > 3 ? "font-medium text-foreground" : ""}>Calc</span>
                    <span>•</span>
                    <span className={countdown <= 3 ? "font-medium text-foreground" : ""}>Gen</span>
                  </>
                ) : (
                  <>
                    <span className={countdown > 9 ? "font-medium text-foreground" : ""}>Analyze</span>
                    <span>•</span>
                    <span className={countdown <= 9 && countdown > 5 ? "font-medium text-foreground" : ""}>Detect</span>
                    <span>•</span>
                    <span className={countdown <= 5 ? "font-medium text-foreground" : ""}>Compute</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Results Section */}
          {result && (
            <div className="bg-muted p-2.5 rounded border border-border space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <strong className="text-foreground">Entry Point:</strong>
                <span className="font-bold text-primary">{result.entryPoints.primary}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <strong className="text-foreground">Runs:</strong>
                <Badge variant="secondary" className="text-xs">{result.runs}</Badge>
              </div>
              <div className="flex items-center justify-between text-xs">
                <strong className="text-foreground">Confidence:</strong>
                <span className="font-bold text-primary">{result.confidence}%</span>
              </div>
              <div className="flex items-center justify-between text-xs pt-1 border-t border-border">
                <span className="text-muted-foreground">{result.marketCondition}</span>
                <Badge variant={
                  result.riskLevel === "LOW" ? "secondary" :
                  result.riskLevel === "MEDIUM" ? "outline" : "destructive"
                } className="text-xs">
                  {result.riskLevel} Risk
                </Badge>
              </div>
              <div className="text-xs text-muted-foreground italic mt-1">{result.entryPoints.timing}</div>
            </div>
          )}

          {/* Action Buttons - Fixed at bottom, no scroll */}
        </CardContent>

        {/* Footer - Fixed buttons */}
        <div className="border-t border-border bg-muted/30 px-4 py-3 flex gap-2 flex-shrink-0">
          <Button
            onClick={runAnalysis}
            disabled={isAnalyzing}
            className="flex-1 font-semibold py-2"
          >
            {isAnalyzing ? "Analyzing..." : "Start Analysis"}
          </Button>
          <Button
            variant="outline"
            onClick={onClose}
            className="flex-1 font-semibold py-2"
          >
            Close
          </Button>
        </div>
      </Card>
    </div>
  )
}
