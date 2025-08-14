"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { TrendingUp, TrendingDown, Minus } from "lucide-react"
import type { ChartData } from "@/types/trading"

interface TechnicalIndicatorsProps {
  data: ChartData[]
  currentCandle: any
}

export function TechnicalIndicators({ data, currentCandle }: TechnicalIndicatorsProps) {
  if (data.length === 0) {
    return (
      <Card className="bg-slate-800/90 border-slate-700 text-white">
        <CardHeader>
          <CardTitle className="text-lg">Technical Indicators</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-slate-400">Waiting for data...</p>
        </CardContent>
      </Card>
    )
  }

  const latest = data[data.length - 1]
  const currentPrice = currentCandle?.close || latest.close

  // RSI Analysis
  const getRSISignal = (rsi?: number) => {
    if (!rsi) return { signal: "N/A", color: "text-gray-400", icon: Minus }
    if (rsi > 70) return { signal: "Overbought", color: "text-red-400", icon: TrendingDown }
    if (rsi < 30) return { signal: "Oversold", color: "text-green-400", icon: TrendingUp }
    return { signal: "Neutral", color: "text-yellow-400", icon: Minus }
  }

  // MACD Analysis
  const getMACDSignal = (macd?: number, signal?: number) => {
    if (!macd || !signal) return { signal: "N/A", color: "text-gray-400", icon: Minus }
    if (macd > signal) return { signal: "Bullish", color: "text-green-400", icon: TrendingUp }
    return { signal: "Bearish", color: "text-red-400", icon: TrendingDown }
  }

  // Moving Average Analysis
  const getMASignal = (price: number, ma?: number) => {
    if (!ma) return { signal: "N/A", color: "text-gray-400", icon: Minus }
    if (price > ma) return { signal: "Above", color: "text-green-400", icon: TrendingUp }
    return { signal: "Below", color: "text-red-400", icon: TrendingDown }
  }

  // Bollinger Bands Analysis
  const getBollingerSignal = (price: number, upper?: number, lower?: number) => {
    if (!upper || !lower) return { signal: "N/A", color: "text-gray-400", icon: Minus }
    if (price > upper) return { signal: "Overbought", color: "text-red-400", icon: TrendingUp }
    if (price < lower) return { signal: "Oversold", color: "text-green-400", icon: TrendingDown }
    return { signal: "Normal", color: "text-yellow-400", icon: Minus }
  }

  const rsiSignal = getRSISignal(latest.rsi)
  const macdSignal = getMACDSignal(latest.macd, latest.macdSignal)
  const sma20Signal = getMASignal(currentPrice, latest.sma20)
  const sma50Signal = getMASignal(currentPrice, latest.sma50)
  const bollingerSignal = getBollingerSignal(currentPrice, latest.bollingerUpper, latest.bollingerLower)

  return (
    <Card className="bg-slate-800/90 border-slate-700 text-white">
      <CardHeader>
        <CardTitle className="text-lg">Technical Indicators</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* RSI */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-300">RSI (14)</span>
            <div className="flex items-center gap-2">
              <rsiSignal.icon className={`h-4 w-4 ${rsiSignal.color}`} />
              <Badge variant="outline" className={rsiSignal.color}>
                {rsiSignal.signal}
              </Badge>
            </div>
          </div>
          {latest.rsi && (
            <>
              <div className="flex justify-between text-xs text-slate-400">
                <span>Oversold (30)</span>
                <span>{latest.rsi.toFixed(1)}</span>
                <span>Overbought (70)</span>
              </div>
              <Progress value={latest.rsi} className="h-2" />
            </>
          )}
        </div>

        {/* MACD */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-300">MACD</span>
            <div className="flex items-center gap-2">
              <macdSignal.icon className={`h-4 w-4 ${macdSignal.color}`} />
              <Badge variant="outline" className={macdSignal.color}>
                {macdSignal.signal}
              </Badge>
            </div>
          </div>
          {latest.macd && latest.macdSignal && (
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div className="text-center">
                <div className="text-slate-400">MACD</div>
                <div className="font-bold">{latest.macd.toFixed(5)}</div>
              </div>
              <div className="text-center">
                <div className="text-slate-400">Signal</div>
                <div className="font-bold">{latest.macdSignal.toFixed(5)}</div>
              </div>
              <div className="text-center">
                <div className="text-slate-400">Histogram</div>
                <div
                  className={`font-bold ${latest.macdHistogram && latest.macdHistogram > 0 ? "text-green-400" : "text-red-400"}`}
                >
                  {latest.macdHistogram?.toFixed(5) || "N/A"}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Moving Averages */}
        <div className="space-y-3">
          <div className="text-sm text-slate-300">Moving Averages</div>

          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400">SMA 20</span>
            <div className="flex items-center gap-2">
              <span className="text-xs">{latest.sma20?.toFixed(5) || "N/A"}</span>
              <sma20Signal.icon className={`h-3 w-3 ${sma20Signal.color}`} />
              <Badge variant="outline" className={`text-xs ${sma20Signal.color}`}>
                {sma20Signal.signal}
              </Badge>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400">SMA 50</span>
            <div className="flex items-center gap-2">
              <span className="text-xs">{latest.sma50?.toFixed(5) || "N/A"}</span>
              <sma50Signal.icon className={`h-3 w-3 ${sma50Signal.color}`} />
              <Badge variant="outline" className={`text-xs ${sma50Signal.color}`}>
                {sma50Signal.signal}
              </Badge>
            </div>
          </div>
        </div>

        {/* Bollinger Bands */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-300">Bollinger Bands</span>
            <div className="flex items-center gap-2">
              <bollingerSignal.icon className={`h-4 w-4 ${bollingerSignal.color}`} />
              <Badge variant="outline" className={bollingerSignal.color}>
                {bollingerSignal.signal}
              </Badge>
            </div>
          </div>
          {latest.bollingerUpper && latest.bollingerLower && (
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div className="text-center">
                <div className="text-slate-400">Upper</div>
                <div className="font-bold text-red-400">{latest.bollingerUpper.toFixed(5)}</div>
              </div>
              <div className="text-center">
                <div className="text-slate-400">Middle</div>
                <div className="font-bold text-yellow-400">{latest.bollingerMiddle?.toFixed(5)}</div>
              </div>
              <div className="text-center">
                <div className="text-slate-400">Lower</div>
                <div className="font-bold text-green-400">{latest.bollingerLower.toFixed(5)}</div>
              </div>
            </div>
          )}
        </div>

        {/* Overall Signal */}
        <div className="pt-2 border-t border-slate-600">
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-300">Overall Signal</span>
            <Badge variant="outline" className="text-yellow-400">
              Mixed Signals
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
