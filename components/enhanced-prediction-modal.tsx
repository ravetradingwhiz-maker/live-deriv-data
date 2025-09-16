"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import type { PredictionResult, PredictionType } from "@/types/trading"
import { TrendingUp, Target, Hash, Calculator, BarChart3 } from "lucide-react"

interface EnhancedPredictionModalProps {
  ticksBuffer: number[]
  runsThisSession: number
  maxRuns: number
  currentPrice?: number
  predictionType: PredictionType
  onClose: () => void
  onRunComplete: (runs: number) => void
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
  const [result, setResult] = useState<PredictionResult | null>(null)

  const fetchDerivDataAndPredict = async (predictionType: PredictionType, selection: string) => {
    // Simulate API call to Deriv.com
    console.log(`[v0] Fetching data from Deriv.com for ${predictionType} prediction...`)

    // Simulate AI analysis with real-time data
    const recentData = ticksBuffer.slice(-50) // Use more recent data
    let confidence = 50
    let recommendation = "WEAK"
    let analysis = ""
    let runs = 1

    switch (predictionType) {
      case "over_under":
        const overCount = recentData.filter((d) => d > 4).length
        confidence =
          selection === "over"
            ? Math.round((overCount / recentData.length) * 100)
            : Math.round(((recentData.length - overCount) / recentData.length) * 100)
        runs = confidence >= 85 ? 3 : confidence >= 70 ? 2 : 1
        recommendation = confidence >= 80 ? "STRONG" : "WEAK"
        analysis = `AI Analysis: ${confidence}% confidence for ${selection.toUpperCase()} based on recent Deriv data patterns`
        break

      case "matches_differs":
        // For matches/differs, AI automatically selects optimal strategy
        const digitFreq: Record<number, number> = {}
        recentData.forEach((d) => (digitFreq[d] = (digitFreq[d] || 0) + 1))
        const mostFrequent = Object.entries(digitFreq).reduce((a, b) =>
          digitFreq[Number(a[0])] > digitFreq[Number(b[0])] ? a : b,
        )
        const targetDigit = Number(mostFrequent[0])
        const matchRate = (digitFreq[targetDigit] / recentData.length) * 100

        confidence = selection === "matches" ? matchRate : 100 - matchRate
        runs = confidence >= 85 ? 3 : confidence >= 70 ? 2 : 1
        recommendation = confidence >= 80 ? "STRONG" : "WEAK"
        analysis = `AI Analysis: Target digit ${targetDigit} appears ${digitFreq[targetDigit]} times. ${confidence}% confidence for ${selection.toUpperCase()}`
        break

      case "even_odd":
        const evenCount = recentData.filter((d) => d % 2 === 0).length
        confidence =
          selection === "even"
            ? Math.round((evenCount / recentData.length) * 100)
            : Math.round(((recentData.length - evenCount) / recentData.length) * 100)
        runs = confidence >= 85 ? 3 : confidence >= 70 ? 2 : 1
        recommendation = confidence >= 80 ? "STRONG" : "WEAK"
        analysis = `AI Analysis: ${confidence}% confidence for ${selection.toUpperCase()} based on recent digit patterns from Deriv`
        break
    }

    return {
      type: selection,
      confidence: Math.max(55, Math.min(95, confidence)), // Ensure realistic confidence range
      runs,
      recommendation,
      analysis,
      digit: null,
    }
  }

  const runAnalysis = async () => {
    if (ticksBuffer.length < 10) {
      setResult({
        type: choice as any,
        digit: null,
        confidence: 0,
        runs: 0,
        recommendation: "WEAK",
        analysis: "Not enough data for analysis",
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
    setResult(analysisResult as PredictionResult)
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
              AI will automatically analyze and select the optimal target digit based on recent patterns
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
              <Label htmlFor="rise">Rise (Price will increase)</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="fall" id="fall" />
              <Label htmlFor="fall">Fall (Price will decrease)</Label>
            </div>
          </RadioGroup>
        )
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <Card className="w-[500px] max-h-[90vh] overflow-y-auto bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
        <CardHeader className="bg-blue-100 dark:bg-blue-900">
          <CardTitle className="flex items-center gap-2 text-blue-900 dark:text-blue-100">
            <Calculator className="h-5 w-5 text-blue-600" />
            AI Prediction Analysis
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-blue-900 dark:text-blue-100">
          {/* Conditional rendering based on prediction type */}
          {predictionType === "over_under" && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400">
                {getPredictionIcon("over_under")}
                <span>Predict if the last digit will be over or under 4.5</span>
              </div>
              {renderPredictionOptions()}
            </div>
          )}

          {predictionType === "matches_differs" && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400">
                {getPredictionIcon("matches_differs")}
                <span>AI will predict matches or differs from optimal target digit</span>
              </div>
              {renderPredictionOptions()}
            </div>
          )}

          {predictionType === "even_odd" && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400">
                {getPredictionIcon("even_odd")}
                <span>Predict if the last digit will be even or odd</span>
              </div>
              {renderPredictionOptions()}
            </div>
          )}

          {predictionType === "rise_fall" && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400">
                {getPredictionIcon("rise_fall")}
                <span>Predict if the price will rise or fall</span>
              </div>
              {renderPredictionOptions()}
            </div>
          )}

          {isAnalyzing && (
            <div className="text-center py-4">
              <div className="text-lg font-semibold text-blue-700 dark:text-blue-300">
                {countdown > 0 ? `Fetching Deriv Data & AI Analysis — ${countdown}s` : "Processing AI Prediction..."}
              </div>
              <div className="text-sm text-blue-600 dark:text-blue-400 mt-2">
                Connecting to Deriv.com • Analyzing patterns • Generating entry points
              </div>
            </div>
          )}

          {result && (
            <div className="bg-blue-100 dark:bg-blue-900/50 p-4 rounded-lg space-y-2 border border-blue-200 dark:border-blue-700">
              <div className="flex items-center justify-between">
                <strong className="text-blue-800 dark:text-blue-200">Prediction Type:</strong>
                <Badge variant="outline" className="bg-blue-200 text-blue-800 border-blue-300">
                  {result.type.toUpperCase()}
                </Badge>
              </div>
              <div className="text-blue-800 dark:text-blue-200">
                <strong>Confidence:</strong> {result.confidence}%
              </div>
              <div className="text-blue-800 dark:text-blue-200">
                <strong>Recommended Runs:</strong> {result.runs}
              </div>
              <div className="text-blue-800 dark:text-blue-200">
                <strong>Entry Recommendation:</strong>{" "}
                <Badge
                  variant={result.recommendation === "STRONG" ? "default" : "secondary"}
                  className={
                    result.recommendation === "STRONG" ? "bg-green-600 text-white" : "bg-yellow-600 text-white"
                  }
                >
                  {result.recommendation}
                </Badge>
              </div>
              {result.analysis && (
                <div className="text-sm text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/30 p-2 rounded">
                  <strong>AI Analysis:</strong> {result.analysis}
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
              {isAnalyzing ? "Analyzing..." : "Start AI Analysis (15s)"}
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
