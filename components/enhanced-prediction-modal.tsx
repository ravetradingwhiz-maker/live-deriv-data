"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
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
  const [targetDigit, setTargetDigit] = useState<number>(5)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [countdown, setCountdown] = useState(0)
  const [result, setResult] = useState<PredictionResult | null>(null)

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

    const analysisResult = await performPredictionAnalysis(
      predictionType,
      choice,
      ticksBuffer,
      targetDigit,
      currentPrice,
    )
    setResult(analysisResult)
    setIsAnalyzing(false)
    setCountdown(0)
    onRunComplete(analysisResult.runs)
  }

  const performPredictionAnalysis = async (
    type: PredictionType,
    selection: string,
    buffer: number[],
    target?: number,
    price?: number,
  ): Promise<PredictionResult> => {
    const snapshot = buffer.slice(-40)

    switch (type) {
      case "over_under":
        return analyzeOverUnder(selection, snapshot)
      case "matches_differs":
        return analyzeMatchesDiffers(selection, snapshot, target || 5)
      case "even_odd":
        return analyzeEvenOdd(selection, snapshot)
      case "rise_fall":
        return analyzeRiseFall(selection, snapshot, price)
      default:
        throw new Error("Unknown prediction type")
    }
  }

  const analyzeOverUnder = (selection: string, snapshot: number[]): PredictionResult => {
    const sideDigits = snapshot.filter((d) => (selection === "over" ? d > 4 : d <= 4))
    const confidence = Math.round((sideDigits.length / snapshot.length) * 100)
    const runs = confidence >= 90 ? 3 : confidence >= 80 ? 2 : 1
    const recommendation = confidence >= 85 ? "STRONG" : "WEAK"

    const freq: Record<number, number> = {}
    sideDigits.forEach((d) => (freq[d] = (freq[d] || 0) + 1))

    let topDigit: number | null = null
    if (Object.keys(freq).length > 0) {
      const topEntry = Object.entries(freq).reduce((a, b) => (freq[Number(a[0])] > freq[Number(b[0])] ? a : b))
      topDigit = Number(topEntry[0])
    }

    return {
      type: selection as "over" | "under",
      digit: topDigit,
      confidence,
      runs: runs,
      recommendation,
      analysis: `${sideDigits.length} out of ${snapshot.length} recent digits are ${selection} 4.5`,
    }
  }

  const analyzeMatchesDiffers = (selection: string, snapshot: number[], target: number): PredictionResult => {
    const matchingDigits = snapshot.filter((d) => d === target)
    const matchRate = (matchingDigits.length / snapshot.length) * 100
    const confidence = selection === "matches" ? matchRate : 100 - matchRate
    const runs = confidence >= 85 ? 3 : confidence >= 70 ? 2 : 1
    const recommendation = confidence >= 80 ? "STRONG" : "WEAK"

    return {
      type: selection as "matches" | "differs",
      digit: target,
      targetDigit: target,
      confidence: Math.round(confidence),
      runs: runs,
      recommendation,
      analysis: `${matchingDigits.length} out of ${snapshot.length} recent digits ${
        selection === "matches" ? "match" : "don't match"
      } target digit ${target}`,
    }
  }

  const analyzeEvenOdd = (selection: string, snapshot: number[]): PredictionResult => {
    const evenDigits = snapshot.filter((d) => d % 2 === 0)
    const evenRate = (evenDigits.length / snapshot.length) * 100
    const confidence = selection === "even" ? evenRate : 100 - evenRate
    const runs = confidence >= 85 ? 3 : confidence >= 70 ? 2 : 1
    const recommendation = confidence >= 80 ? "STRONG" : "WEAK"

    return {
      type: selection as "even" | "odd",
      confidence: Math.round(confidence),
      runs: runs,
      recommendation,
      analysis: `${evenDigits.length} out of ${snapshot.length} recent digits are ${
        selection === "even" ? "even" : "odd"
      }`,
    }
  }

  const analyzeRiseFall = (selection: string, snapshot: number[], price?: number): PredictionResult => {
    if (!price) {
      return {
        type: selection as "rise" | "fall",
        confidence: 50,
        runs: 1,
        recommendation: "WEAK",
        analysis: "No current price data available",
      }
    }

    // Analyze recent price trend from digits
    const recentTrend = snapshot.slice(-10)
    let risingCount = 0
    for (let i = 1; i < recentTrend.length; i++) {
      if (recentTrend[i] > recentTrend[i - 1]) risingCount++
    }

    const trendStrength = (risingCount / (recentTrend.length - 1)) * 100
    const confidence = selection === "rise" ? trendStrength : 100 - trendStrength
    const runs = confidence >= 85 ? 3 : confidence >= 70 ? 2 : 1
    const recommendation = confidence >= 80 ? "STRONG" : "WEAK"

    return {
      type: selection as "rise" | "fall",
      confidence: Math.round(confidence),
      runs: runs,
      recommendation,
      priceDirection: selection as "up" | "down",
      analysis: `Recent trend shows ${risingCount} rising movements out of ${recentTrend.length - 1} intervals`,
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
              <Label htmlFor="over">Over (5-9)</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="under" id="under" />
              <Label htmlFor="under">Under (0-4)</Label>
            </div>
          </RadioGroup>
        )

      case "matches_differs":
        return (
          <div className="space-y-4">
            <div>
              <Label>Target Digit</Label>
              <Select value={targetDigit.toString()} onValueChange={(v) => setTargetDigit(Number(v))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((digit) => (
                    <SelectItem key={digit} value={digit.toString()}>
                      {digit}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
              <Label htmlFor="even">Even (0,2,4,6,8)</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="odd" id="odd" />
              <Label htmlFor="odd">Odd (1,3,5,7,9)</Label>
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
      <Card className="w-[500px] max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            AI Prediction Analysis
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Conditional rendering based on prediction type */}
          {predictionType === "over_under" && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                {getPredictionIcon("over_under")}
                <span>Predict if the last digit will be over or under 4.5</span>
              </div>
              {renderPredictionOptions()}
            </div>
          )}

          {predictionType === "matches_differs" && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                {getPredictionIcon("matches_differs")}
                <span>Predict if the last digit matches or differs from target</span>
              </div>
              {renderPredictionOptions()}
            </div>
          )}

          {predictionType === "even_odd" && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                {getPredictionIcon("even_odd")}
                <span>Predict if the last digit will be even or odd</span>
              </div>
              {renderPredictionOptions()}
            </div>
          )}

          {predictionType === "rise_fall" && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                {getPredictionIcon("rise_fall")}
                <span>Predict if the price will rise or fall</span>
              </div>
              {renderPredictionOptions()}
            </div>
          )}

          {isAnalyzing && (
            <div className="text-center py-4">
              <div className="text-lg font-semibold">
                {countdown > 0 ? `Analyzing — ${countdown}s` : "Processing..."}
              </div>
            </div>
          )}

          {result && (
            <div className="bg-muted p-4 rounded-lg space-y-2">
              <div className="flex items-center justify-between">
                <strong>Prediction Type:</strong>
                <Badge variant="outline">{result.type.toUpperCase()}</Badge>
              </div>
              {result.digit !== undefined && (
                <div>
                  <strong>Target Digit:</strong> {result.digit ?? result.targetDigit ?? "—"}
                </div>
              )}
              <div>
                <strong>Confidence:</strong> {result.confidence}%
              </div>
              <div>
                <strong>Runs:</strong> {result.runs}
              </div>
              <div>
                <strong>Recommendation:</strong>{" "}
                <Badge variant={result.recommendation === "STRONG" ? "default" : "secondary"}>
                  {result.recommendation}
                </Badge>
              </div>
              {result.analysis && (
                <div className="text-sm text-muted-foreground">
                  <strong>Analysis:</strong> {result.analysis}
                </div>
              )}
            </div>
          )}

          <div className="flex gap-2">
            <Button onClick={runAnalysis} disabled={isAnalyzing} className="flex-1">
              {isAnalyzing ? "Analyzing..." : "Start 15s Analysis"}
            </Button>
            <Button variant="outline" onClick={onClose} className="flex-1 bg-transparent">
              Close
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
