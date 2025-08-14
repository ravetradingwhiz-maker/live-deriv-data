"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts"
import { BacktestingEngine } from "@/utils/backtesting-engine"
import { tradingStrategies } from "@/utils/trading-strategies"
import { generateHistoricalData } from "@/utils/historical-data-generator"
import type { ChartData } from "@/types/trading"
import type { BacktestResult, BacktestConfig } from "@/types/backtesting"
import { Play, TrendingUp, DollarSign, Target, AlertTriangle } from "lucide-react"

interface BacktestingPanelProps {
  liveData: ChartData[]
}

export function BacktestingPanel({ liveData }: BacktestingPanelProps) {
  const [selectedStrategy, setSelectedStrategy] = useState(tradingStrategies[0].id)
  const [config, setConfig] = useState<BacktestConfig>({
    strategy: tradingStrategies[0],
    initialCapital: 10000,
    positionSize: 100,
    stopLoss: 2,
    takeProfit: 4,
    commission: 0.1,
    slippage: 0.01,
  })
  const [result, setResult] = useState<BacktestResult | null>(null)
  const [isRunning, setIsRunning] = useState(false)
  const [useHistoricalData, setUseHistoricalData] = useState(true)

  const runBacktest = async () => {
    setIsRunning(true)

    // Simulate processing time
    await new Promise((resolve) => setTimeout(resolve, 1000))

    const strategy = tradingStrategies.find((s) => s.id === selectedStrategy)
    if (!strategy) return

    const testConfig: BacktestConfig = {
      ...config,
      strategy,
    }

    // Use historical data or live data
    const testData = useHistoricalData ? generateHistoricalData(100, 300, 0.015) : liveData

    if (testData.length < 50) {
      alert("Not enough data for backtesting. Need at least 50 data points.")
      setIsRunning(false)
      return
    }

    const engine = new BacktestingEngine(testConfig)
    const backTestResult = engine.runBacktest(testData)

    setResult(backTestResult)
    setIsRunning(false)
  }

  const updateConfig = (key: keyof BacktestConfig, value: any) => {
    setConfig((prev) => ({ ...prev, [key]: value }))
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(value)
  }

  const formatPercentage = (value: number) => {
    return `${value.toFixed(2)}%`
  }

  // Prepare equity curve data for chart
  const equityData = result
    ? result.equity.map((equity, index) => ({
        time: new Date(result.equityDates[index]).toLocaleDateString(),
        equity,
        drawdown:
          ((Math.max(...result.equity.slice(0, index + 1)) - equity) / Math.max(...result.equity.slice(0, index + 1))) *
          100,
      }))
    : []

  // Prepare trade distribution data
  const tradeDistribution = result
    ? [
        { name: "Winning Trades", value: result.winningTrades, fill: "#22c55e" },
        { name: "Losing Trades", value: result.losingTrades, fill: "#ef4444" },
      ]
    : []

  return (
    <Card className="bg-slate-800/90 border-slate-700 text-white">
      <CardHeader>
        <CardTitle className="text-xl flex items-center gap-2">
          <Target className="h-5 w-5" />
          Strategy Backtesting
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="config" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="config">Configuration</TabsTrigger>
            <TabsTrigger value="results">Results</TabsTrigger>
            <TabsTrigger value="trades">Trade History</TabsTrigger>
          </TabsList>

          <TabsContent value="config" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Trading Strategy</Label>
                <Select value={selectedStrategy} onValueChange={setSelectedStrategy}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {tradingStrategies.map((strategy) => (
                      <SelectItem key={strategy.id} value={strategy.id}>
                        {strategy.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-slate-400">
                  {tradingStrategies.find((s) => s.id === selectedStrategy)?.description}
                </p>
              </div>

              <div className="space-y-2">
                <Label>Data Source</Label>
                <Select
                  value={useHistoricalData ? "historical" : "live"}
                  onValueChange={(v) => setUseHistoricalData(v === "historical")}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="historical">Generated Historical Data</SelectItem>
                    <SelectItem value="live">Live Session Data ({liveData.length} points)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Initial Capital</Label>
                <Input
                  type="number"
                  value={config.initialCapital}
                  onChange={(e) => updateConfig("initialCapital", Number(e.target.value))}
                />
              </div>

              <div className="space-y-2">
                <Label>Position Size</Label>
                <Input
                  type="number"
                  value={config.positionSize}
                  onChange={(e) => updateConfig("positionSize", Number(e.target.value))}
                />
              </div>

              <div className="space-y-2">
                <Label>Stop Loss (%)</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={config.stopLoss || ""}
                  onChange={(e) => updateConfig("stopLoss", e.target.value ? Number(e.target.value) : undefined)}
                />
              </div>

              <div className="space-y-2">
                <Label>Take Profit (%)</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={config.takeProfit || ""}
                  onChange={(e) => updateConfig("takeProfit", e.target.value ? Number(e.target.value) : undefined)}
                />
              </div>

              <div className="space-y-2">
                <Label>Commission (%)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={config.commission}
                  onChange={(e) => updateConfig("commission", Number(e.target.value))}
                />
              </div>

              <div className="space-y-2">
                <Label>Slippage (%)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={config.slippage}
                  onChange={(e) => updateConfig("slippage", Number(e.target.value))}
                />
              </div>
            </div>

            <Button onClick={runBacktest} disabled={isRunning} className="w-full bg-blue-600 hover:bg-blue-700">
              <Play className="h-4 w-4 mr-2" />
              {isRunning ? "Running Backtest..." : "Run Backtest"}
            </Button>
          </TabsContent>

          <TabsContent value="results" className="space-y-4">
            {!result ? (
              <div className="text-center py-8 text-slate-400">
                <Target className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Run a backtest to see results</p>
              </div>
            ) : (
              <>
                {/* Performance Metrics */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-slate-700/50 p-3 rounded-lg">
                    <div className="flex items-center gap-2 mb-1">
                      <DollarSign className="h-4 w-4 text-green-400" />
                      <span className="text-sm text-slate-300">Total P&L</span>
                    </div>
                    <div className={`text-lg font-bold ${result.totalPnL >= 0 ? "text-green-400" : "text-red-400"}`}>
                      {formatCurrency(result.totalPnL)}
                    </div>
                  </div>

                  <div className="bg-slate-700/50 p-3 rounded-lg">
                    <div className="flex items-center gap-2 mb-1">
                      <TrendingUp className="h-4 w-4 text-blue-400" />
                      <span className="text-sm text-slate-300">Win Rate</span>
                    </div>
                    <div className="text-lg font-bold text-blue-400">{formatPercentage(result.winRate)}</div>
                  </div>

                  <div className="bg-slate-700/50 p-3 rounded-lg">
                    <div className="flex items-center gap-2 mb-1">
                      <AlertTriangle className="h-4 w-4 text-red-400" />
                      <span className="text-sm text-slate-300">Max Drawdown</span>
                    </div>
                    <div className="text-lg font-bold text-red-400">{formatPercentage(result.maxDrawdown)}</div>
                  </div>

                  <div className="bg-slate-700/50 p-3 rounded-lg">
                    <div className="flex items-center gap-2 mb-1">
                      <Target className="h-4 w-4 text-purple-400" />
                      <span className="text-sm text-slate-300">Profit Factor</span>
                    </div>
                    <div className="text-lg font-bold text-purple-400">{result.profitFactor.toFixed(2)}</div>
                  </div>
                </div>

                {/* Additional Metrics */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-slate-400">Total Trades:</span>
                    <span className="ml-2 font-semibold">{result.totalTrades}</span>
                  </div>
                  <div>
                    <span className="text-slate-400">Winning Trades:</span>
                    <span className="ml-2 font-semibold text-green-400">{result.winningTrades}</span>
                  </div>
                  <div>
                    <span className="text-slate-400">Losing Trades:</span>
                    <span className="ml-2 font-semibold text-red-400">{result.losingTrades}</span>
                  </div>
                  <div>
                    <span className="text-slate-400">Average Win:</span>
                    <span className="ml-2 font-semibold">{formatCurrency(result.averageWin)}</span>
                  </div>
                  <div>
                    <span className="text-slate-400">Average Loss:</span>
                    <span className="ml-2 font-semibold">{formatCurrency(result.averageLoss)}</span>
                  </div>
                  <div>
                    <span className="text-slate-400">Sharpe Ratio:</span>
                    <span className="ml-2 font-semibold">{result.sharpeRatio.toFixed(2)}</span>
                  </div>
                </div>

                {/* Equity Curve */}
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold">Equity Curve</h3>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={equityData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                        <XAxis dataKey="time" stroke="#9ca3af" fontSize={10} />
                        <YAxis stroke="#9ca3af" fontSize={10} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "#1f2937",
                            border: "1px solid #374151",
                            borderRadius: "6px",
                          }}
                        />
                        <Line type="monotone" dataKey="equity" stroke="#22c55e" strokeWidth={2} dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Trade Distribution */}
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold">Trade Distribution</h3>
                  <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={tradeDistribution}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                        <XAxis dataKey="name" stroke="#9ca3af" fontSize={10} />
                        <YAxis stroke="#9ca3af" fontSize={10} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "#1f2937",
                            border: "1px solid #374151",
                            borderRadius: "6px",
                          }}
                        />
                        <Bar dataKey="value" fill="#3b82f6" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </>
            )}
          </TabsContent>

          <TabsContent value="trades" className="space-y-4">
            {!result ? (
              <div className="text-center py-8 text-slate-400">
                <Target className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Run a backtest to see trade history</p>
              </div>
            ) : (
              <div className="space-y-2">
                <h3 className="text-lg font-semibold">Trade History ({result.trades.length} trades)</h3>
                <div className="max-h-96 overflow-y-auto space-y-2">
                  {result.trades.map((trade) => (
                    <div key={trade.id} className="bg-slate-700/50 p-3 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Badge variant={trade.type === "buy" ? "default" : "secondary"}>
                            {trade.type.toUpperCase()}
                          </Badge>
                          <span className="text-sm text-slate-300">{trade.id}</span>
                        </div>
                        <div className={`font-semibold ${(trade.pnl || 0) >= 0 ? "text-green-400" : "text-red-400"}`}>
                          {formatCurrency(trade.pnl || 0)}
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-xs text-slate-400">
                        <div>
                          <div>Entry: {trade.entryPrice.toFixed(5)}</div>
                          <div>Exit: {trade.exitPrice?.toFixed(5) || "Open"}</div>
                        </div>
                        <div>
                          <div>Quantity: {trade.quantity}</div>
                          <div>Reason: {trade.reason}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
