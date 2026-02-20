"use client"

import { useEffect, useState } from "react"
import { Brain, TrendingUp, AlertCircle } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface TradingInsight {
  id: string
  title: string
  description: string
  type: "bullish" | "bearish" | "neutral"
  confidence: number
}

export function AITradingInsights() {
  const [insights, setInsights] = useState<TradingInsight[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchInsights = async () => {
      try {
        setIsLoading(true)
        const response = await fetch("/api/ai-insights", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            symbol: "EURUSD",
            timeframe: "1h",
            context: "recent market volatility and support/resistance levels",
          }),
        })

        if (!response.ok) throw new Error("Failed to fetch insights")

        const data = await response.json()
        setInsights(data.insights)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error")
      } finally {
        setIsLoading(false)
      }
    }

    fetchInsights()

    // Refresh insights every 5 minutes
    const interval = setInterval(fetchInsights, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [])

  if (isLoading) {
    return (
      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <Brain className="h-5 w-5 text-blue-400" />
            AI Trading Insights
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-12 bg-slate-700/50 rounded animate-pulse" />
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <Brain className="h-5 w-5 text-blue-400" />
            AI Trading Insights
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-yellow-400 text-sm">
            <AlertCircle className="h-4 w-4" />
            <span>Unable to load insights</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="bg-slate-800/50 border-slate-700">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-white">
          <Brain className="h-5 w-5 text-blue-400" />
          AI Trading Insights
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {insights.length > 0 ? (
            insights.map((insight) => (
              <div
                key={insight.id}
                className={`p-3 rounded-lg border ${
                  insight.type === "bullish"
                    ? "bg-green-900/20 border-green-700/50"
                    : insight.type === "bearish"
                      ? "bg-red-900/20 border-red-700/50"
                      : "bg-slate-700/30 border-slate-600/50"
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <h4 className="text-sm font-semibold text-white flex items-center gap-2">
                    <TrendingUp
                      className={`h-4 w-4 ${
                        insight.type === "bullish"
                          ? "text-green-400"
                          : insight.type === "bearish"
                            ? "text-red-400"
                            : "text-slate-400"
                      }`}
                    />
                    {insight.title}
                  </h4>
                  <span
                    className={`text-xs font-medium px-2 py-1 rounded ${
                      insight.confidence >= 0.8
                        ? "bg-green-900/40 text-green-300"
                        : insight.confidence >= 0.6
                          ? "bg-blue-900/40 text-blue-300"
                          : "bg-yellow-900/40 text-yellow-300"
                    }`}
                  >
                    {Math.round(insight.confidence * 100)}%
                  </span>
                </div>
                <p className="text-xs text-slate-300">{insight.description}</p>
              </div>
            ))
          ) : (
            <p className="text-sm text-slate-400">No insights available at the moment</p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
