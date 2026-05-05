"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { useDerivWebSocket } from "@/hooks/use-deriv-websocket"
import { useAuth } from "@/contexts/AuthContext"
import { EnhancedPredictionModal } from "@/components/enhanced-prediction-modal"
import { DashboardHeader } from "@/components/dashboard-header"
import { FloatingContactButtons } from "@/components/floating-contact-buttons"
import { MatrixBackground } from "@/components/matrix-background"
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
  Target,
  Hash,
  BarChart3,
  Zap,
} from "lucide-react"
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

  // Auto-connect to first market on mount
  useEffect(() => {
    if (markets.length > 0 && !selectedMarket && !subscribedSymbol) {
      const firstMarket = markets[0].symbol
      setSelectedMarket(firstMarket)
      subscribeTicks(firstMarket)
    }
  }, [markets, selectedMarket, subscribedSymbol, subscribeTicks])

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
    <div className="min-h-screen bg-white dark:bg-black relative">
      {/* Matrix Background */}
      <MatrixBackground intensity={0.5} opacity={0.3} />
      
      {/* Main Content */}
      <div className="relative z-10">
        <DashboardHeader />

      <div className="max-w-7xl mx-auto p-4 space-y-6">
        {/* Market Selection and Status */}
        <Card className="bg-white dark:bg-black border-[3px] border-cyan-500 cyan-glow">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-2xl font-bold text-black dark:text-cyan-400">Live Market Analysis</CardTitle>
              <div className="flex items-center gap-3">
                {!hasRealTimeData && (
                  <Badge variant="outline" className={`text-xs ${isMinangedwaUser ? "text-red-500 dark:text-green-500" : "text-yellow-500"}`}>
                    {accessLevel}
                  </Badge>
                )}
                {isConnected ? (
                  <div className="flex items-center gap-2 text-red-500 dark:text-lime-400">
                    <Wifi className="h-5 w-5" />
                    <span className="text-sm font-medium">Connected</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-red-400">
                    <WifiOff className="h-5 w-5" />
                    <span className="text-sm font-medium">Disconnected</span>
                  </div>
                )}
                {!isConnected && connectionAttempts > 0 && (
                  <Button size="sm" variant="ghost" onClick={reconnect} className="text-xs text-black dark:text-cyan-400 hover:text-black dark:hover:text-cyan-300">
                    <RefreshCw className="h-4 w-4 mr-1" />
                    Retry
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm mb-2 block text-black dark:text-cyan-400">Market Symbol (Auto-connected)</label>
                <Select value={selectedMarket} onValueChange={(val) => { setSelectedMarket(val); subscribeTicks(val); }}>
                  <SelectTrigger className="bg-white dark:bg-black border-2 border-cyan-500/50 text-black dark:text-cyan-400">
                    <SelectValue placeholder="-- choose market --" />
                  </SelectTrigger>
                  <SelectContent className="bg-white dark:bg-black border-2 border-cyan-500">
                    {markets.map((market) => (
                      <SelectItem key={market.symbol} value={market.symbol} className="text-black dark:text-cyan-400">
                        {market.display_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {lastTick && (
                <div className="bg-white dark:bg-black border-2 border-lime-500 p-4 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-black dark:text-cyan-400">Last Digit:</span>
                    <div className="flex items-center gap-2">
                      <span className="text-3xl font-bold text-red-500 dark:text-lime-400">{lastTick.digit}</span>
                      {lastTick.digit > 4 ? (
                        <TrendingUp className="h-5 w-5 text-red-500 dark:text-lime-400" />
                      ) : (
                        <TrendingDown className="h-5 w-5 text-red-400" />
                      )}
                    </div>
                  </div>
                  <div className="text-xs text-black dark:text-cyan-400">Quote: {lastTick.quote.toFixed(5)}</div>
                  <div className="text-xs text-black dark:text-cyan-400">
                    {lastTick.digit % 2 === 0 ? "Even" : "Odd"} | {lastTick.digit > 4 ? "Over" : "Under"} 4.5
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-4 text-xs text-black dark:text-cyan-400">
              <div>Status: <span className="text-red-500 dark:text-lime-400">{status}</span></div>
              <div>Buffer: <span className="text-red-500 dark:text-lime-400">{ticksBuffer.length} ticks</span></div>
              <div>Plan: <span className="text-red-500 dark:text-lime-400">{user?.subscription}</span></div>
            </div>
          </CardContent>
        </Card>

        {/* Contract Type Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Over/Under Card */}
          <Card className="bg-white dark:bg-black border-[3px] border-cyan-500 cyan-glow">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-bold flex items-center gap-2 text-black dark:text-cyan-400">
                <TrendingUp className="h-5 w-5" />
                Over / Under
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {enoughDataForAdvanced ? (
                <>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-black dark:text-cyan-400">Signal</span>
                    <Badge variant="outline" className="text-red-500 dark:text-lime-400 border-lime-500">
                      {ticksBuffer.filter((d) => d > 4).length > ticksBuffer.length / 2 ? "Over" : "Under"}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-black dark:text-cyan-400">Over Count</span>
                    <span className="font-semibold text-red-500 dark:text-lime-400">{ticksBuffer.filter((d) => d > 4).length}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-black dark:text-cyan-400">Under Count</span>
                    <span className="font-semibold text-red-500 dark:text-lime-400">{ticksBuffer.filter((d) => d <= 4).length}</span>
                  </div>
                  <Button 
                    onClick={() => handleOpenPrediction("over_under")}
                    className="w-full bg-cyan-600 hover:bg-cyan-700 text-black font-bold border-2 border-cyan-400"
                    disabled={!canTrade}
                  >
                    Deeper Analysis
                  </Button>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">Waiting for data...</p>
              )}
            </CardContent>
          </Card>

          {/* Matches/Differs Card */}
          <Card className="bg-white dark:bg-black border-[3px] border-cyan-500 cyan-glow">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-bold flex items-center gap-2 text-black dark:text-cyan-400">
                <Target className="h-5 w-5" />
                Matches / Differs
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {enoughDataForAdvanced && lastTick ? (
                <>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-black dark:text-cyan-400">Last Digit</span>
                    <Badge variant="outline" className="text-red-500 dark:text-lime-400 border-lime-500 text-lg">
                      {lastTick.digit}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-black dark:text-cyan-400">Frequency</span>
                    <span className="font-semibold text-red-500 dark:text-lime-400">
                      {((ticksBuffer.filter((d) => d === lastTick.digit).length / ticksBuffer.length) * 100).toFixed(1)}%
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-black dark:text-cyan-400">Pattern</span>
                    <span className="text-xs text-red-500 dark:text-lime-400">
                      {ticksBuffer.filter((d) => d === lastTick.digit).length > 3 ? "Repeating" : "Scattered"}
                    </span>
                  </div>
                  <Button 
                    onClick={() => handleOpenPrediction("matches_differs")}
                    className="w-full bg-cyan-600 hover:bg-cyan-700 text-black font-bold border-2 border-cyan-400"
                    disabled={!canTrade}
                  >
                    Deeper Analysis
                  </Button>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">Waiting for data...</p>
              )}
            </CardContent>
          </Card>

          {/* Even/Odd Card */}
          <Card className="bg-white dark:bg-black border-[3px] border-cyan-500 cyan-glow">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-bold flex items-center gap-2 text-black dark:text-cyan-400">
                <Hash className="h-5 w-5" />
                Even / Odd
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {enoughDataForAdvanced ? (
                <>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-black dark:text-cyan-400">Signal</span>
                    <Badge variant="outline" className="text-red-500 dark:text-lime-400 border-lime-500">
                      {ticksBuffer.filter((d) => d % 2 === 0).length > ticksBuffer.length / 2 ? "Even" : "Odd"}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-black dark:text-cyan-400">Even Count</span>
                    <span className="font-semibold text-red-500 dark:text-lime-400">{ticksBuffer.filter((d) => d % 2 === 0).length}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-black dark:text-cyan-400">Odd Count</span>
                    <span className="font-semibold text-red-500 dark:text-lime-400">{ticksBuffer.filter((d) => d % 2 !== 0).length}</span>
                  </div>
                  <Button 
                    onClick={() => handleOpenPrediction("even_odd")}
                    className="w-full bg-cyan-600 hover:bg-cyan-700 text-black font-bold border-2 border-cyan-400"
                    disabled={!canTrade}
                  >
                    Deeper Analysis
                  </Button>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">Waiting for data...</p>
              )}
            </CardContent>
          </Card>

          {/* Rise/Fall Card */}
          <Card className="bg-white dark:bg-black border-[3px] border-cyan-500 cyan-glow">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-bold flex items-center gap-2 text-black dark:text-cyan-400">
                <BarChart3 className="h-5 w-5" />
                Rise / Fall
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {enoughDataForAdvanced ? (
                <>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-black dark:text-cyan-400">Trend</span>
                    <Badge variant="outline" className={momentumPct >= 0 ? "text-red-500 dark:text-lime-400 border-lime-500" : "text-red-400 border-red-500"}>
                      {momentumPct >= 0 ? "Rise" : "Fall"}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-black dark:text-cyan-400">Momentum</span>
                    <span className={`font-semibold ${momentumPct >= 0 ? "text-red-500 dark:text-lime-400" : "text-red-400"}`}>
                      {momentumPct >= 0 ? "+" : ""}{momentumPct.toFixed(2)}%
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-black dark:text-cyan-400">Strength</span>
                    <span className="text-xs text-red-500 dark:text-lime-400">
                      {Math.abs(momentumPct) > 0.5 ? "Strong" : "Weak"}
                    </span>
                  </div>
                  <Button 
                    onClick={() => handleOpenPrediction("rise_fall")}
                    className="w-full bg-cyan-600 hover:bg-cyan-700 text-black font-bold border-2 border-cyan-400"
                    disabled={!canTrade}
                  >
                    Deeper Analysis
                  </Button>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">Waiting for data...</p>
              )}
            </CardContent>
          </Card>

          {/* Accumulators Card */}
          <Card className="bg-white dark:bg-black border-[3px] border-cyan-500 cyan-glow">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-bold flex items-center gap-2 text-black dark:text-cyan-400">
                <CircleChevronUp className="h-5 w-5" />
                Accumulators
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {enoughDataForAdvanced ? (
                <>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-black dark:text-cyan-400">Stability</span>
                    <Badge variant="outline" className="text-red-500 dark:text-lime-400 border-lime-500">
                      {accumulatorSignal}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-black dark:text-cyan-400">Confidence</span>
                    <span className="font-semibold text-red-500 dark:text-lime-400">{accumulatorConfidence}%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-black dark:text-cyan-400">Risk</span>
                    <Badge
                      variant="outline"
                      className={`${
                        accumulatorRisk === "LOW"
                          ? "text-red-500 dark:text-lime-400 border-lime-500"
                          : accumulatorRisk === "MEDIUM"
                            ? "text-yellow-400 border-yellow-500"
                            : "text-red-400 border-red-500"
                      }`}
                    >
                      {accumulatorRisk}
                    </Badge>
                  </div>
                  <Button 
                    onClick={() => handleOpenPrediction("accumulators")}
                    className="w-full bg-cyan-600 hover:bg-cyan-700 text-black font-bold border-2 border-cyan-400"
                    disabled={!canTrade}
                  >
                    Deeper Analysis
                  </Button>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">Waiting for data...</p>
              )}
            </CardContent>
          </Card>

          {/* Only Ups Card */}
          <Card className="bg-white dark:bg-black border-[3px] border-cyan-500 cyan-glow">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-bold flex items-center gap-2 text-black dark:text-cyan-400">
                <ArrowUpRight className="h-5 w-5" />
                Only Ups
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {enoughDataForAdvanced ? (
                <>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-black dark:text-cyan-400">Signal</span>
                    <Badge
                      variant="outline"
                      className={`${
                        onlyUpsSignal === "GO"
                          ? "text-red-500 dark:text-lime-400 border-lime-500"
                          : onlyUpsSignal === "WATCH"
                            ? "text-yellow-400 border-yellow-500"
                            : "text-red-400 border-red-500"
                      }`}
                    >
                      {onlyUpsSignal}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-black dark:text-cyan-400">Confidence</span>
                    <span className="font-semibold text-red-500 dark:text-lime-400">{onlyUpsConfidence}%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-black dark:text-cyan-400">Up-tick Ratio</span>
                    <span className="font-semibold text-red-500 dark:text-lime-400">{(upTickRatio * 100).toFixed(0)}%</span>
                  </div>
                  <Button 
                    onClick={() => handleOpenPrediction("only_ups")}
                    className="w-full bg-cyan-600 hover:bg-cyan-700 text-black font-bold border-2 border-cyan-400"
                    disabled={!canTrade}
                  >
                    Deeper Analysis
                  </Button>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">Waiting for data...</p>
              )}
            </CardContent>
          </Card>

          {/* Higher/Lower Card */}
          <Card className="bg-white dark:bg-black border-[3px] border-cyan-500 cyan-glow">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-bold flex items-center gap-2 text-black dark:text-cyan-400">
                <MoveUpRight className="h-5 w-5" />
                Higher / Lower
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {enoughDataForAdvanced ? (
                <>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-black dark:text-cyan-400">Bias</span>
                    <Badge 
                      variant="outline" 
                      className={higherLowerSignal === "Higher" ? "text-red-500 dark:text-lime-400 border-lime-500" : "text-red-400 border-red-500"}
                    >
                      {higherLowerSignal}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-black dark:text-cyan-400">Confidence</span>
                    <span className="font-semibold text-red-500 dark:text-lime-400">{higherLowerConfidence}%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-black dark:text-cyan-400">Momentum</span>
                    <span className={`font-semibold ${momentumPct >= 0 ? "text-red-500 dark:text-lime-400" : "text-red-400"}`}>
                      {momentumPct >= 0 ? "+" : ""}{momentumPct.toFixed(2)}%
                    </span>
                  </div>
                  <Button 
                    onClick={() => handleOpenPrediction("higher_lower")}
                    className="w-full bg-cyan-600 hover:bg-cyan-700 text-black font-bold border-2 border-cyan-400"
                    disabled={!canTrade}
                  >
                    Deeper Analysis
                  </Button>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">Waiting for data...</p>
              )}
            </CardContent>
          </Card>
        </div>

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
    </div>
  )
}
