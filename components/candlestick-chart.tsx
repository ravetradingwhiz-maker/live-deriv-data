"use client"

import { ResponsiveContainer, ComposedChart, XAxis, YAxis, CartesianGrid, Bar, Line, Tooltip, Area } from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer } from "@/components/ui/chart"
import { Button } from "@/components/ui/button"
import { useState } from "react"
import type { ChartData, CandleData, IndicatorSettings } from "@/types/trading"

interface CandlestickChartProps {
  data: ChartData[]
  currentCandle: CandleData | null
  symbol?: string
}

// Custom candlestick bar component
const CandlestickBar = (props: any) => {
  const { payload, x, y, width, height } = props
  if (!payload) return null

  const { open, high, low, close } = payload
  const isGreen = close >= open
  const color = isGreen ? "#22c55e" : "#ef4444"

  const bodyHeight = Math.abs(close - open)
  const bodyY = Math.min(open, close)
  const wickTop = high
  const wickBottom = low

  // Scale values to chart coordinates
  const scale = height / (high - low || 1)
  const chartBodyHeight = bodyHeight * scale
  const chartBodyY = y + (wickTop - bodyY) * scale
  const wickX = x + width / 2

  return (
    <g>
      {/* Upper wick */}
      <line x1={wickX} y1={y} x2={wickX} y2={chartBodyY} stroke={color} strokeWidth={1} />
      {/* Lower wick */}
      <line x1={wickX} y1={chartBodyY + chartBodyHeight} x2={wickX} y2={y + height} stroke={color} strokeWidth={1} />
      {/* Body */}
      <rect
        x={x + 2}
        y={chartBodyY}
        width={width - 4}
        height={Math.max(chartBodyHeight, 1)}
        fill={isGreen ? color : "transparent"}
        stroke={color}
        strokeWidth={1}
      />
    </g>
  )
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload
    return (
      <div className="bg-popover border border-border rounded-lg p-3 text-sm">
        <p className="font-semibold">{label}</p>
        <div className="space-y-1 mt-2">
          <p>
            Open: <span className="text-blue-500">{data.open?.toFixed(5)}</span>
          </p>
          <p>
            High: <span className="text-green-500">{data.high?.toFixed(5)}</span>
          </p>
          <p>
            Low: <span className="text-red-500">{data.low?.toFixed(5)}</span>
          </p>
          <p>
            Close: <span className="text-yellow-500">{data.close?.toFixed(5)}</span>
          </p>
          <p>
            Volume: <span className="text-muted-foreground">{data.volume}</span>
          </p>
        </div>
      </div>
    )
  }
  return null
}

export function CandlestickChart({ data, currentCandle, symbol }: CandlestickChartProps) {
  const [indicators, setIndicators] = useState<IndicatorSettings>({
    showSMA20: true,
    showSMA50: true,
    showEMA12: false,
    showEMA26: false,
    showRSI: false,
    showMACD: false,
    showBollinger: true,
  })

  // Combine historical data with current candle
  const chartData = [...data]
  if (currentCandle) {
    const currentChartData: ChartData = {
      ...currentCandle,
      time: new Date(currentCandle.timestamp).toLocaleTimeString(),
      color: currentCandle.close >= currentCandle.open ? "#22c55e" : "#ef4444",
    }
    chartData.push(currentChartData)
  }

  const minPrice = Math.min(...chartData.map((d) => Math.min(d.low, d.bollingerLower || d.low))) * 0.999
  const maxPrice = Math.max(...chartData.map((d) => Math.max(d.high, d.bollingerUpper || d.high))) * 1.001

  const toggleIndicator = (indicator: keyof IndicatorSettings) => {
    setIndicators((prev) => ({ ...prev, [indicator]: !prev[indicator] }))
  }

  return (
    <Card className="bg-card/90 border-border">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">
            Price Chart {symbol && `(${symbol})`}
            <span className="text-sm text-muted-foreground ml-2">1m intervals</span>
          </CardTitle>
        </div>

        {/* Indicator Toggle Buttons */}
        <div className="flex flex-wrap gap-2 mt-2">
          <Button
            size="sm"
            variant={indicators.showSMA20 ? "default" : "outline"}
            onClick={() => toggleIndicator("showSMA20")}
            className="text-xs"
          >
            SMA20
          </Button>
          <Button
            size="sm"
            variant={indicators.showSMA50 ? "default" : "outline"}
            onClick={() => toggleIndicator("showSMA50")}
            className="text-xs"
          >
            SMA50
          </Button>
          <Button
            size="sm"
            variant={indicators.showBollinger ? "default" : "outline"}
            onClick={() => toggleIndicator("showBollinger")}
            className="text-xs"
          >
            Bollinger
          </Button>
          <Button
            size="sm"
            variant={indicators.showEMA12 ? "default" : "outline"}
            onClick={() => toggleIndicator("showEMA12")}
            className="text-xs"
          >
            EMA12
          </Button>
          <Button
            size="sm"
            variant={indicators.showEMA26 ? "default" : "outline"}
            onClick={() => toggleIndicator("showEMA26")}
            className="text-xs"
          >
            EMA26
          </Button>
        </div>
      </CardHeader>

      <CardContent>
        <ChartContainer
          config={{
            price: { label: "Price", color: "hsl(var(--chart-1))" },
            sma20: { label: "SMA 20", color: "#3b82f6" },
            sma50: { label: "SMA 50", color: "#8b5cf6" },
            ema12: { label: "EMA 12", color: "#10b981" },
            ema26: { label: "EMA 26", color: "#f59e0b" },
            bollinger: { label: "Bollinger Bands", color: "#6b7280" },
          }}
          className="h-[400px]"
        >
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="time" stroke="hsl(var(--muted-foreground))" fontSize={10} interval="preserveStartEnd" />
              <YAxis
                domain={[minPrice, maxPrice]}
                stroke="hsl(var(--muted-foreground))"
                fontSize={10}
                tickFormatter={(value) => value.toFixed(5)}
              />
              <Tooltip content={<CustomTooltip />} />

              {/* Bollinger Bands */}
              {indicators.showBollinger && (
                <>
                  <Area
                    type="monotone"
                    dataKey="bollingerUpper"
                    stroke="#6b7280"
                    fill="#6b7280"
                    fillOpacity={0.1}
                    strokeWidth={1}
                    strokeDasharray="2 2"
                  />
                  <Area
                    type="monotone"
                    dataKey="bollingerLower"
                    stroke="#6b7280"
                    fill="#6b7280"
                    fillOpacity={0.1}
                    strokeWidth={1}
                    strokeDasharray="2 2"
                  />
                  <Line
                    type="monotone"
                    dataKey="bollingerMiddle"
                    stroke="#6b7280"
                    strokeWidth={1}
                    dot={false}
                    strokeDasharray="5 5"
                  />
                </>
              )}

              {/* Candlestick bars */}
              <Bar dataKey="high" shape={<CandlestickBar />} fill="transparent" />

              {/* Moving Averages */}
              {indicators.showSMA20 && (
                <Line type="monotone" dataKey="sma20" stroke="#3b82f6" strokeWidth={2} dot={false} />
              )}
              {indicators.showSMA50 && (
                <Line type="monotone" dataKey="sma50" stroke="#8b5cf6" strokeWidth={2} dot={false} />
              )}
              {indicators.showEMA12 && (
                <Line type="monotone" dataKey="ema12" stroke="#10b981" strokeWidth={2} dot={false} />
              )}
              {indicators.showEMA26 && (
                <Line type="monotone" dataKey="ema26" stroke="#f59e0b" strokeWidth={2} dot={false} />
              )}

              {/* Current price line */}
              {currentCandle && (
                <Line
                  type="monotone"
                  dataKey="close"
                  stroke="#fbbf24"
                  strokeWidth={2}
                  dot={false}
                  strokeDasharray="5 5"
                />
              )}
            </ComposedChart>
          </ResponsiveContainer>
        </ChartContainer>

        {/* Current Values Display */}
        {currentCandle && (
          <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
            <div className="bg-muted/50 p-2 rounded">
              <div className="text-muted-foreground">Current Price</div>
              <div className="text-lg font-bold text-yellow-500">{currentCandle.close.toFixed(5)}</div>
            </div>
            <div className="bg-muted/50 p-2 rounded">
              <div className="text-muted-foreground">Volume</div>
              <div className="text-lg font-bold text-blue-500">{currentCandle.volume}</div>
            </div>
            {data.length > 0 && data[data.length - 1].sma20 && (
              <div className="bg-muted/50 p-2 rounded">
                <div className="text-muted-foreground">SMA 20</div>
                <div className="text-sm font-bold text-blue-500">{data[data.length - 1].sma20?.toFixed(5)}</div>
              </div>
            )}
            {data.length > 0 && data[data.length - 1].rsi && (
              <div className="bg-muted/50 p-2 rounded">
                <div className="text-muted-foreground">RSI</div>
                <div className="text-sm font-bold text-purple-500">{data[data.length - 1].rsi?.toFixed(1)}</div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
