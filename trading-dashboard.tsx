"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useDerivWebSocket } from "@/hooks/use-deriv-websocket"
import { useAuth } from "@/contexts/AuthContext"
import { EnhancedPredictionModal } from "@/components/enhanced-prediction-modal"
import { PredictionButtons } from "@/components/prediction-buttons"
import { DashboardHeader } from "@/components/dashboard-header"
import { FloatingContactButtons } from "@/components/floating-contact-buttons"
import {
  TrendingUp,
  TrendingDown,
  Wifi,
  WifiOff,
  Lock,
  RefreshCw,
  LineChart,
  CandlestickChart as CandlestickIcon,
  FlaskConical,
  CircleChevronUp,
  ArrowUpRight,
  MoveUpRight,
  ShieldAlert,
} from "lucide-react"
import { CandlestickChart } from "@/components/candlestick-chart"
import { PriceAnalysis } from "@/components/price-analysis"
import { TechnicalIndicators } from "@/components/technical-indicators"
import { BacktestingPanel } from "@/components/backtesting-panel"
import type { PredictionType } from "@/types/trading"

export default function TradingDashboard() {
  const { user } = useAuth()
  const {
    status,
    markets,
    subscribedSymbol,
    ticksBuffer,
    lastTick,
    candleData,
    currentCandle,
    subscribeTicks,
    unsubscribeTicks,
    isConnected,
    connectionAttempts,
    reconnect,
  } = useDerivWebSocket()

  const [selectedMarket, setSelectedMarket] = useState<string>("")
  const [showPredictionModal, setShowPredictionModal] = useState(false)
  const [selectedPredictionType, setSelectedPredictionType] = useState<string>("over_under")
  const [runsThisSession, setRunsThisSession] = useState(0)

  const handleStartAnalysis = () => {
    if (selectedMarket) {
      subscribeTicks(selectedMarket)
      setRunsThisSession(0)
    }
  }

  const handleOpenPrediction = (type: string) => {
    setSelectedPredictionType(type)
    setShowPredictionModal(true)
  }

  const handleRunComplete = (runs: number) => {
    setRunsThisSession((prev) => prev + runs)
  }

  // Check permissions
  const canTrade = user?.permissions.includes("all") || user?.permissions.includes("trade")
  const canBacktest = user?.permissions.includes("all") || user?.permissions.includes("backtest")
  const hasRealTimeData = user?.subscription === "premium" || user?.subscription === "enterprise"
  
  // Check if user is Minangedwa123 for full access display
  const isMinangedwaUser = user?.username === "minangedwa"
  const accessLevel = isMinangedwaUser ? "full access" : "Limited"

  const advancedWindow = candleData.slice(-20)
  const enoughDataForAdvanced = advancedWindow.length >= 8 && ticksBuffer.length >= 20

  const lastClose = advancedWindow.length ? advancedWindow[advancedWindow.length - 1].close : 0
  const firstClose = advancedWindow.length ? advancedWindow[0].close : 0
  const momentumPct = firstClose ? ((lastClose - firstClose) / firstClose) * 100 : 0

  const upTickRatio = ticksBuffer.length ? ticksBuffer.filter((d) => d > 4).length / ticksBuffer.length : 0
  const recentReturns = advancedWindow
    .slice(1)
    .map((c, i) => (advancedWindow[i].close ? (c.close - advancedWindow[i].close) / advancedWindow[i].close : 0))
  const meanReturn = recentReturns.length ? recentReturns.reduce((a, b) => a + b, 0) / recentReturns.length : 0
  const returnVariance = recentReturns.length
    ? recentReturns.reduce((sum, r) => sum + Math.pow(r - meanReturn, 2), 0) / recentReturns.length
    : 0
  const volatility = Math.sqrt(returnVariance)

  const higherLowerSignal = momentumPct >= 0 ? "Higher" : "Lower"
  const higherLowerConfidence = Math.min(96, Math.max(52, Math.round(50 + Math.abs(momentumPct) * 7 + upTickRatio * 14)))

  const onlyUpsBiasScore = upTickRatio * 0.55 + (momentumPct > 0 ? 0.45 : 0)
  const onlyUpsSignal = onlyUpsBiasScore > 0.68 ? "GO" : onlyUpsBiasScore > 0.55 ? "WATCH" : "WAIT"
  const onlyUpsConfidence = Math.min(95, Math.max(45, Math.round(onlyUpsBiasScore * 100)))

  const accumulatorSafetyRaw = 1 - Math.min(1, volatility * 180)
  const accumulatorSignal = accumulatorSafetyRaw > 0.68 ? "Stable" : accumulatorSafetyRaw > 0.48 ? "Moderate" : "Risky"
  const accumulatorConfidence = Math.round(Math.min(95, Math.max(35, accumulatorSafetyRaw * 100)))
  const accumulatorRisk = accumulatorSafetyRaw > 0.68 ? "LOW" : accumulatorSafetyRaw > 0.48 ? "MEDIUM" : "HIGH"

  return (
    <div className="min-h-screen bg-black/20">
      <DashboardHeader />

      <div className="max-w-6xl mx-auto p-4 space-y-4">
        <Tabs defaultValue="analysis" className="w-full">
          <TabsList className="mx-auto flex h-auto w-full max-w-2xl items-center justify-center gap-2 rounded-2xl border border-cyan-500/20 bg-slate-900/70 p-2 shadow-[0_0_24px_rgba(0,217,217,0.08)] backdrop-blur-md">
            <TabsTrigger
              value="analysis"
              className="group flex min-w-[140px] items-center justify-center gap-2 rounded-xl border border-transparent px-4 py-2.5 font-semibold tracking-wide text-slate-300 transition-all duration-200 hover:border-cyan-400/30 hover:bg-slate-800/80 hover:text-white data-[state=active]:border-cyan-300/50 data-[state=active]:bg-gradient-to-r data-[state=active]:from-cyan-500/90 data-[state=active]:to-blue-500/90 data-[state=active]:text-white data-[state=active]:shadow-[0_8px_24px_rgba(14,165,233,0.35)]"
            >
              <LineChart className="h-4 w-4" />
              Analysis
            </TabsTrigger>
            <TabsTrigger
              value="trading"
              className="group flex min-w-[140px] items-center justify-center gap-2 rounded-xl border border-transparent px-4 py-2.5 font-semibold tracking-wide text-slate-300 transition-all duration-200 hover:border-cyan-400/30 hover:bg-slate-800/80 hover:text-white data-[state=active]:border-cyan-300/50 data-[state=active]:bg-gradient-to-r data-[state=active]:from-cyan-500/90 data-[state=active]:to-blue-500/90 data-[state=active]:text-white data-[state=active]:shadow-[0_8px_24px_rgba(14,165,233,0.35)]"
            >
              <CandlestickIcon className="h-4 w-4" />
              Trading
            </TabsTrigger>
            <TabsTrigger
              value="backtesting"
              disabled={!canBacktest}
              className="group flex min-w-[140px] items-center justify-center gap-2 rounded-xl border border-transparent px-4 py-2.5 font-semibold tracking-wide text-slate-300 transition-all duration-200 hover:border-cyan-400/30 hover:bg-slate-800/80 hover:text-white data-[state=active]:border-cyan-300/50 data-[state=active]:bg-gradient-to-r data-[state=active]:from-cyan-500/90 data-[state=active]:to-blue-500/90 data-[state=active]:text-white data-[state=active]:shadow-[0_8px_24px_rgba(14,165,233,0.35)] disabled:cursor-not-allowed disabled:opacity-45"
            >
              <FlaskConical className="h-4 w-4" />
              Backtesting {!canBacktest && <Lock className="h-3 w-3 ml-1" />}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="trading" className="space-y-4">
            {/* Main Control Panel and Technical Indicators */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Technical Indicators Panel */}
              <div className="lg:col-span-2">
                <TechnicalIndicators data={candleData} currentCandle={currentCandle} />
              </div>

              {/* Price Analysis Panel */}
              <div>
                <PriceAnalysis data={candleData} ticksBuffer={ticksBuffer} />
              </div>
            </div>

            {/* Candlestick Chart */}
            {subscribedSymbol && (
              <CandlestickChart data={candleData} currentCandle={currentCandle} symbol={subscribedSymbol} />
            )}
          </TabsContent>

          <TabsContent value="analysis" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Live Deriv Data Analysis Panel */}
              <Card className="bg-card/90 border-border backdrop-blur-sm">
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-xl font-bold">Live Deriv Data Analysis</CardTitle>
                    <div className="flex items-center gap-2">
                      {!hasRealTimeData && (
                        <Badge variant="outline" className={`text-xs ${isMinangedwaUser ? "text-green-500" : "text-yellow-500"}`}>
                          {accessLevel}
                        </Badge>
                      )}
                      {isConnected ? (
                        <Wifi className="h-4 w-4 text-green-500" />
                      ) : (
                        <WifiOff className="h-4 w-4 text-red-500" />
                      )}
                      {!isConnected && connectionAttempts > 0 && (
                        <Button size="sm" variant="ghost" onClick={reconnect} className="text-xs">
                          <RefreshCw className="h-3 w-3 mr-1" />
                          Retry
                        </Button>
                      )}
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  <div>
                    <label className="text-sm mb-2 block">Select market (Volatility indices)</label>
                    <Select value={selectedMarket} onValueChange={setSelectedMarket}>
                      <SelectTrigger className="bg-background border-border">
                        <SelectValue placeholder="-- choose market --" />
                      </SelectTrigger>
                      <SelectContent className="bg-popover border-border">
                        {markets.map((market) => (
                          <SelectItem key={market.symbol} value={market.symbol}>
                            {market.display_name} ({market.symbol})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      onClick={handleStartAnalysis}
                      disabled={!selectedMarket || !isConnected || !canTrade}
                      className="flex-1"
                    >
                      Start Analysis
                    </Button>
                    <Button
                      onClick={unsubscribeTicks}
                      disabled={!subscribedSymbol}
                      variant="secondary"
                      className="flex-1"
                    >
                      Stop Analysis
                    </Button>
                  </div>

                  <PredictionButtons
                    onOpenPrediction={handleOpenPrediction}
                    canTrade={canTrade}
                    ticksBufferLength={ticksBuffer.length}
                    runsThisSession={runsThisSession}
                    maxRuns={999}
                  />

                  {lastTick && (
                    <div className="bg-muted/50 p-3 rounded-lg">
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Last digit:</span>
                        <div className="flex items-center gap-2">
                          <span className="text-2xl font-bold text-green-500">{lastTick.digit}</span>
                          {lastTick.digit > 4 ? (
                            <TrendingUp className="h-4 w-4 text-green-500" />
                          ) : (
                            <TrendingDown className="h-4 w-4 text-red-500" />
                          )}
                        </div>
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">Quote: {lastTick.quote.toFixed(5)}</div>
                      <div className="text-xs text-muted-foreground mt-1">
                        Type: {lastTick.digit % 2 === 0 ? "Even" : "Odd"} | {lastTick.digit > 4 ? "Over" : "Under"} 4.5
                      </div>
                    </div>
                  )}

                  <div className="text-xs text-muted-foreground space-y-1">
                    <div>Status: {status}</div>
                    <div>Buffer: {ticksBuffer.length} ticks</div>
                    <div>Plan: {user?.subscription}</div>
                    {connectionAttempts > 0 && <div>Connection attempts: {connectionAttempts}/5</div>}
                  </div>
                </CardContent>
              </Card>

              {/* Price Analysis Panel */}
              <PriceAnalysis data={candleData} ticksBuffer={ticksBuffer} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="bg-card/90 border-border backdrop-blur-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <CircleChevronUp className="h-4 w-4 text-cyan-400" />
                    Accumulators
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {enoughDataForAdvanced ? (
                    <>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Stability</span>
                        <Badge variant="outline" className="text-cyan-400">
                          {accumulatorSignal}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Confidence</span>
                        <span className="font-semibold">{accumulatorConfidence}%</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Risk</span>
                        <span
                          className={`text-xs font-semibold ${
                            accumulatorRisk === "LOW"
                              ? "text-green-500"
                              : accumulatorRisk === "MEDIUM"
                                ? "text-yellow-500"
                                : "text-red-500"
                          }`}
                        >
                          {accumulatorRisk}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Best in low-volatility phases with smooth tick behavior.
                      </p>
                    </>
                  ) : (
                    <p className="text-sm text-muted-foreground">Waiting for more live data...</p>
                  )}
                </CardContent>
              </Card>

              <Card className="bg-card/90 border-border backdrop-blur-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <ArrowUpRight className="h-4 w-4 text-green-400" />
                    Only Ups
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {enoughDataForAdvanced ? (
                    <>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Signal</span>
                        <Badge
                          variant="outline"
                          className={`${
                            onlyUpsSignal === "GO"
                              ? "text-green-500"
                              : onlyUpsSignal === "WATCH"
                                ? "text-yellow-500"
                                : "text-red-500"
                          }`}
                        >
                          {onlyUpsSignal}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Confidence</span>
                        <span className="font-semibold">{onlyUpsConfidence}%</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Up-tick Ratio</span>
                        <span className="text-xs font-semibold text-green-500">{(upTickRatio * 100).toFixed(0)}%</span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Entry quality improves when momentum and up-tick pressure align.
                      </p>
                    </>
                  ) : (
                    <p className="text-sm text-muted-foreground">Waiting for more live data...</p>
                  )}
                </CardContent>
              </Card>

              <Card className="bg-card/90 border-border backdrop-blur-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <MoveUpRight className="h-4 w-4 text-blue-400" />
                    Higher / Lower
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {enoughDataForAdvanced ? (
                    <>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Bias</span>
                        <Badge variant="outline" className={higherLowerSignal === "Higher" ? "text-green-500" : "text-red-500"}>
                          {higherLowerSignal}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Confidence</span>
                        <span className="font-semibold">{higherLowerConfidence}%</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Momentum</span>
                        <span className={`text-xs font-semibold ${momentumPct >= 0 ? "text-green-500" : "text-red-500"}`}>
                          {momentumPct >= 0 ? "+" : ""}
                          {momentumPct.toFixed(2)}%
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <ShieldAlert className="h-3.5 w-3.5" />
                        Use with short horizon confirmation before entry.
                      </div>
                    </>
                  ) : (
                    <p className="text-sm text-muted-foreground">Waiting for more live data...</p>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="backtesting" className="space-y-4">
            {canBacktest ? (
              <BacktestingPanel liveData={candleData} />
            ) : (
              <Card className="bg-card/90 border-border">
                <CardContent className="text-center py-12">
                  <Lock className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-xl font-semibold mb-2">Backtesting Locked</h3>
                  <p className="text-muted-foreground mb-4">
                    Upgrade to Premium or Enterprise to access backtesting features.
                  </p>
                  <Button>Upgrade Now</Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>

        {showPredictionModal && (
          <EnhancedPredictionModal
            ticksBuffer={ticksBuffer}
            runsThisSession={runsThisSession}
            maxRuns={999}
            currentPrice={lastTick?.quote}
            predictionType={selectedPredictionType as PredictionType}
            onClose={() => setShowPredictionModal(false)}
            onRunComplete={handleRunComplete}
          />
        )}
      </div>
      <FloatingContactButtons />
    </div>
  )
}
