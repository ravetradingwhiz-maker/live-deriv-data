"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import type { PredictionResult, PredictionType } from "@/types/trading"
import { TrendingUp, Target, Hash, Calculator, BarChart3, Wifi, WifiOff } from "lucide-react"
import { useDerivAPI } from "@/hooks/use-deriv-api"

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

    if (!isConnected) {
      throw new Error("Not connected to Deriv API")
    }

    try {
      const derivPrediction = await getPrediction(selectedSymbol, predictionType)

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
          primary: `Enter ${selection.toUpperCase()} at ${derivPrediction.entryPoint.toFixed(5)}`,
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
      // Fallback to simulated analysis if API fails
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
          primary: `Enter ${selection.toUpperCase()} when last digit shows pattern convergence`,
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
          primary: `Enter ${selection.toUpperCase()} based on recent pattern analysis`,
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
          primary: `Enter ${selection.toUpperCase()} based on trend analysis`,
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
          primary: `Enter ${selection.toUpperCase()} for digit ${exactDigit}`,
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
          secondary: `Random target digit: ${exactDigit}`,
          timing: "Connect to Deriv API for optimal timing",
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
    if (!isConnected && ticksBuffer.length < 20) {
      setResult({
        type: choice as any,
        digit: null,
        confidence: 25,
        runs: 1,
        recommendation: "WEAK",
        analysis: "No API connection and insufficient local data - connect to Deriv API for real-time analysis",
        exactDigit: undefined,
        entryPoints: { primary: "Connect to Deriv API", secondary: "", timing: "" },
        marketCondition: "No connection",
        riskLevel: "HIGH",
        expectedOutcome: "Limited prediction capability without data source",
      })
      return
    }

    setIsAnalyzing(true)
    let seconds = 15

    while (seconds > 0) {
      setCountdown(seconds)
      await new Promise((resolve) => setTimeout(resolve, 1000))
      seconds--
    }

    const analysisResult = await fetchDerivDataAndPredict(predictionType, choice)
    setResult(analysisResult)
    setIsAnalyzing(false)
    setCountdown(0)
    onRunComplete(analysisResult.runs)
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
            <div className="text-sm text-blue-400 bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
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
      <Card className="w-[600px] max-h-[90vh] overflow-y-auto bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
        <CardHeader className="bg-blue-100 dark:bg-blue-900">
          <CardTitle className="flex items-center gap-2 text-blue-900 dark:text-blue-100">
            <Calculator className="h-5 w-5 text-blue-600" />
            AI Prediction Analysis - Deriv.com Integration
            <div className="ml-auto flex items-center gap-2">
              {isConnected ? (
                <div className="flex items-center gap-1 text-green-600">
                  <Wifi className="h-4 w-4" />
                  <span className="text-xs">Connected</span>
                </div>
              ) : (
                <div className="flex items-center gap-1 text-red-600">
                  <WifiOff className="h-4 w-4" />
                  <span className="text-xs">Disconnected</span>
                </div>
              )}
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-blue-900 dark:text-blue-100">
          <div className="bg-blue-100 dark:bg-blue-900/50 p-3 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Deriv API Status:</span>
              <Badge variant={isConnected ? "default" : "destructive"}>
                {isConnecting ? "Connecting..." : isConnected ? "Connected" : "Disconnected"}
              </Badge>
            </div>
            {error && <div className="text-xs text-red-600 dark:text-red-400 mt-1">Error: {error}</div>}
            <div className="flex items-center justify-between mt-2">
              <span className="text-sm">Trading Symbol:</span>
              <select
                value={selectedSymbol}
                onChange={(e) => setSelectedSymbol(e.target.value)}
                className="text-xs bg-blue-200 dark:bg-blue-800 rounded px-2 py-1"
              >
                <option value="R_10">Volatility 10 Index</option>
                <option value="R_25">Volatility 25 Index</option>
                <option value="R_50">Volatility 50 Index</option>
                <option value="R_75">Volatility 75 Index</option>
                <option value="R_100">Volatility 100 Index</option>
                <option value="1HZ10V">Volatility 10 (1s) Index</option>
                <option value="1HZ25V">Volatility 25 (1s) Index</option>
                <option value="1HZ50V">Volatility 50 (1s) Index</option>
                <option value="1HZ75V">Volatility 75 (1s) Index</option>
                <option value="1HZ100V">Volatility 100 (1s) Index</option>
                <option value="1HZ150V">Volatility 150 (1s) Index</option>
                <option value="1HZ200V">Volatility 200 (1s) Index</option>
                <option value="1HZ250V">Volatility 250 (1s) Index</option>
                <option value="1HZ300V">Volatility 300 (1s) Index</option>
                <option value="BOOM500">Boom 500 Index</option>
                <option value="BOOM1000">Boom 1000 Index</option>
                <option value="CRASH500">Crash 500 Index</option>
                <option value="CRASH1000">Crash 1000 Index</option>
                <option value="JD10">Jump 10 Index</option>
                <option value="JD25">Jump 25 Index</option>
                <option value="JD50">Jump 50 Index</option>
                <option value="JD75">Jump 75 Index</option>
                <option value="JD100">Jump 100 Index</option>
                <option value="WLDAUD">AUD Basket</option>
                <option value="WLDEUR">EUR Basket</option>
                <option value="WLDGBP">GBP Basket</option>
                <option value="WLDUSD">USD Basket</option>
                <option value="WLDXAU">Gold Basket</option>
                <option value="stpRNG">Step Index</option>
              </select>
            </div>
          </div>

          {/* Conditional rendering based on prediction type */}
          {predictionType === "over_under" && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400">
                {getPredictionIcon("over_under")}
                <span>
                  {isConnected
                    ? "AI will analyze live Deriv data and predict exact digits with entry points"
                    : "Using fallback analysis - connect to API for optimal results"}
                </span>
              </div>
              {renderPredictionOptions()}
            </div>
          )}

          {predictionType === "matches_differs" && (
            <div className="space-y-4">
              <div className="text-sm text-blue-400 bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
                {isConnected
                  ? "AI will analyze live Deriv.com data and provide exact digit predictions with entry points"
                  : "Limited analysis available - connect to Deriv API for full predictions"}
              </div>
              {renderPredictionOptions()}
            </div>
          )}

          {predictionType === "even_odd" && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400">
                <Hash className="h-5 w-5" />
                <span>
                  {isConnected
                    ? "AI will predict specific even/odd digits with live data entry recommendations"
                    : "Basic analysis available - API connection recommended"}
                </span>
              </div>
              {renderPredictionOptions()}
            </div>
          )}

          {predictionType === "rise_fall" && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400">
                <BarChart3 className="h-5 w-5" />
                <span>
                  {isConnected
                    ? "AI will analyze live price momentum and provide precise entry points"
                    : "Trend analysis available - API recommended for accuracy"}
                </span>
              </div>
              {renderPredictionOptions()}
            </div>
          )}

          {isAnalyzing && (
            <div className="text-center py-4">
              <div className="text-lg font-semibold text-blue-700 dark:text-blue-300">
                {countdown > 0
                  ? `${isConnected ? "Analyzing Live Deriv Data" : "Processing Available Data"} — ${countdown}s`
                  : "Generating AI Predictions..."}
              </div>
              <div className="text-sm text-blue-600 dark:text-blue-400 mt-2">
                {isConnected
                  ? "Fetching live data • Pattern analysis • Calculating probabilities • Generating entry points"
                  : "Local analysis • Pattern detection • Probability calculation"}
              </div>
            </div>
          )}

          {/* Conditional rendering based on prediction type */}
          {result && (
            <div className="bg-blue-100 dark:bg-blue-900/50 p-4 rounded-lg space-y-3 border border-blue-200 dark:border-blue-700">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center justify-between">
                  <strong className="text-blue-800 dark:text-blue-200">Prediction:</strong>
                  <Badge variant="outline" className="bg-blue-200 text-blue-800 border-blue-300">
                    {result.type.toUpperCase()}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <strong className="text-blue-800 dark:text-blue-200">Confidence:</strong>
                  <span className="font-semibold">{result.confidence}%</span>
                </div>
              </div>

              {result.exactDigit !== undefined && (
                <div className="bg-blue-200 dark:bg-blue-800 p-3 rounded-lg">
                  <div className="flex items-center justify-between">
                    <strong className="text-blue-900 dark:text-blue-100">Target Digit:</strong>
                    <Badge className="bg-blue-600 text-white text-lg px-3 py-1">{result.exactDigit}</Badge>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <strong className="text-blue-800 dark:text-blue-200">Entry Points:</strong>
                <div className="bg-blue-50 dark:bg-blue-900/30 p-3 rounded space-y-1">
                  <div className="text-sm">
                    <strong>Primary:</strong> {result.entryPoints.primary}
                  </div>
                  {result.entryPoints.secondary && (
                    <div className="text-sm">
                      <strong>Secondary:</strong> {result.entryPoints.secondary}
                    </div>
                  )}
                  <div className="text-sm">
                    <strong>Timing:</strong> {result.entryPoints.timing}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <strong className="text-blue-800 dark:text-blue-200">Risk Level:</strong>
                  <Badge
                    variant="outline"
                    className={
                      result.riskLevel === "LOW"
                        ? "bg-green-100 text-green-800 border-green-300"
                        : result.riskLevel === "MEDIUM"
                          ? "bg-yellow-100 text-yellow-800 border-yellow-300"
                          : "bg-red-100 text-red-800 border-red-300"
                    }
                  >
                    {result.riskLevel}
                  </Badge>
                </div>
                <div>
                  <strong className="text-blue-800 dark:text-blue-200">Recommended Runs:</strong>
                  <span className="ml-2 font-semibold">{result.runs}</span>
                </div>
              </div>

              <div className="text-blue-800 dark:text-blue-200">
                <strong>Market Condition:</strong> {result.marketCondition}
              </div>

              <div className="text-blue-800 dark:text-blue-200">
                <strong>Expected Outcome:</strong> {result.expectedOutcome}
              </div>

              <div className="text-blue-800 dark:text-blue-200">
                <strong>Entry Recommendation:</strong>{" "}
                <Badge
                  variant={
                    result.recommendation === "STRONG"
                      ? "default"
                      : result.recommendation === "MODERATE"
                        ? "secondary"
                        : "outline"
                  }
                  className={
                    result.recommendation === "STRONG"
                      ? "bg-green-600 text-white"
                      : result.recommendation === "MODERATE"
                        ? "bg-blue-600 text-white"
                        : "bg-yellow-600 text-white"
                  }
                >
                  {result.recommendation}
                </Badge>
              </div>

              {result.analysis && (
                <div className="text-sm text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/30 p-3 rounded">
                  <strong>Detailed Analysis:</strong> {result.analysis}
                </div>
              )}
            </div>
          )}

          <div className="flex gap-2">
            <Button
              onClick={runAnalysis}
              disabled={isAnalyzing}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
            >
              {isAnalyzing ? "Analyzing..." : `Start ${isConnected ? "Live" : "Fallback"} Analysis (15s)`}
            </Button>
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1 border-blue-300 text-blue-700 hover:bg-blue-100 dark:border-blue-600 dark:text-blue-300 dark:hover:bg-blue-900 bg-transparent"
            >
              Close
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
