"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useDerivWebSocket } from "@/hooks/use-deriv-websocket"
import { useAuth } from "@/contexts/auth-context"
import { EnhancedPredictionModal } from "@/components/enhanced-prediction-modal"
import { PredictionButtons } from "@/components/prediction-buttons"
import { DashboardHeader } from "@/components/dashboard-header"
import { SubscriptionManager } from "@/components/subscription-manager"
import { TrendingUp, TrendingDown, Wifi, WifiOff, Lock, RefreshCw } from "lucide-react"
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-primary/10 to-background">
      <DashboardHeader />

      <div className="max-w-6xl mx-auto p-4 space-y-4">
        <Tabs defaultValue="trading" className="w-full">
          <TabsList className="grid w-full grid-cols-4 bg-card/90">
            <TabsTrigger
              value="trading"
              className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              Trading
            </TabsTrigger>
            <TabsTrigger
              value="analysis"
              className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              Analysis
            </TabsTrigger>
            <TabsTrigger
              value="backtesting"
              disabled={!canBacktest}
              className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground disabled:opacity-50"
            >
              Backtesting {!canBacktest && <Lock className="h-3 w-3 ml-1" />}
            </TabsTrigger>
            <TabsTrigger
              value="account"
              className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              Account
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
                        <Badge variant="outline" className="text-xs text-yellow-500">
                          Limited
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

          <TabsContent value="account" className="space-y-4">
            <SubscriptionManager />
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
    </div>
  )
}
