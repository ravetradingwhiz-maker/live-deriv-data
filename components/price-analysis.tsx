"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { TrendingUp, TrendingDown, Minus } from "lucide-react"
import type { ChartData } from "@/types/trading"

interface PriceAnalysisProps {
  data: ChartData[]
  ticksBuffer: number[]
}

export function PriceAnalysis({ data, ticksBuffer }: PriceAnalysisProps) {
  if (data.length < 2) {
    return (
      <Card className="bg-slate-800/90 border-slate-700 text-white">
        <CardHeader>
          <CardTitle className="text-lg">Price Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-slate-400">Waiting for more data...</p>
        </CardContent>
      </Card>
    )
  }

  const latest = data[data.length - 1]
  const previous = data[data.length - 2]
  const priceChange = latest.close - previous.close
  const priceChangePercent = (priceChange / previous.close) * 100

  // Calculate digit distribution
  const digitCounts = ticksBuffer.reduce(
    (acc, digit) => {
      acc[digit] = (acc[digit] || 0) + 1
      return acc
    },
    {} as Record<number, number>,
  )

  const totalTicks = ticksBuffer.length
  const overCount = ticksBuffer.filter((d) => d > 4).length
  const underCount = ticksBuffer.filter((d) => d <= 4).length

  const trend = priceChange > 0 ? "up" : priceChange < 0 ? "down" : "neutral"

  return (
    <Card className="bg-slate-800/90 border-slate-700 text-white">
      <CardHeader>
        <CardTitle className="text-lg">Price Analysis</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Price Movement */}
        <div className="flex items-center justify-between">
          <span className="text-slate-300">Price Change</span>
          <div className="flex items-center gap-2">
            {trend === "up" && <TrendingUp className="h-4 w-4 text-green-400" />}
            {trend === "down" && <TrendingDown className="h-4 w-4 text-red-400" />}
            {trend === "neutral" && <Minus className="h-4 w-4 text-gray-400" />}
            <span
              className={`font-bold ${
                trend === "up" ? "text-green-400" : trend === "down" ? "text-red-400" : "text-gray-400"
              }`}
            >
              {priceChangePercent.toFixed(3)}%
            </span>
          </div>
        </div>

        {/* Over/Under Distribution */}
        <div className="space-y-2">
          <div className="text-slate-300 text-sm">Digit Distribution</div>
          <div className="flex justify-between">
            <div className="text-center">
              <div className="text-red-400 font-bold">{underCount}</div>
              <div className="text-xs text-slate-400">Under (0-4)</div>
            </div>
            <div className="text-center">
              <div className="text-green-400 font-bold">{overCount}</div>
              <div className="text-xs text-slate-400">Over (5-9)</div>
            </div>
          </div>
          <div className="w-full bg-slate-700 rounded-full h-2">
            <div
              className="bg-green-400 h-2 rounded-full transition-all duration-300"
              style={{ width: `${totalTicks ? (overCount / totalTicks) * 100 : 0}%` }}
            />
          </div>
        </div>

        {/* Individual Digit Frequency */}
        <div className="space-y-2">
          <div className="text-slate-300 text-sm">Digit Frequency</div>
          <div className="grid grid-cols-5 gap-1">
            {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((digit) => {
              const count = digitCounts[digit] || 0
              const percentage = totalTicks ? (count / totalTicks) * 100 : 0
              return (
                <div key={digit} className="text-center">
                  <Badge
                    variant={digit > 4 ? "default" : "secondary"}
                    className={`w-full text-xs ${digit > 4 ? "bg-green-600" : "bg-red-600"}`}
                  >
                    {digit}
                  </Badge>
                  <div className="text-xs text-slate-400 mt-1">{percentage.toFixed(0)}%</div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Market Sentiment */}
        <div className="flex items-center justify-between">
          <span className="text-slate-300">Market Sentiment</span>
          <Badge variant={overCount > underCount ? "default" : "secondary"}>
            {overCount > underCount ? "Bullish" : underCount > overCount ? "Bearish" : "Neutral"}
          </Badge>
        </div>
      </CardContent>
    </Card>
  )
}
