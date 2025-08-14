import type { ChartData } from "@/types/trading"
import type { Trade, BacktestResult, BacktestConfig } from "@/types/backtesting"

export class BacktestingEngine {
  private trades: Trade[] = []
  private equity: number[] = []
  private equityDates: number[] = []
  private currentCapital = 0
  private openTrade: Trade | null = null
  private tradeId = 0

  constructor(private config: BacktestConfig) {
    this.currentCapital = config.initialCapital
  }

  runBacktest(data: ChartData[]): BacktestResult {
    this.reset()

    for (let i = 1; i < data.length; i++) {
      const signal = this.config.strategy.signals(data, i, this.config.strategy.parameters)
      const currentBar = data[i]

      this.processSignal(signal, currentBar, i)
      this.updateEquity(currentBar.timestamp)

      // Check stop loss and take profit
      if (this.openTrade) {
        this.checkExitConditions(currentBar, i)
      }
    }

    // Close any remaining open trade
    if (this.openTrade && data.length > 0) {
      this.closeTrade(data[data.length - 1], data.length - 1, "End of data")
    }

    return this.calculateResults()
  }

  private reset() {
    this.trades = []
    this.equity = []
    this.equityDates = []
    this.currentCapital = this.config.initialCapital
    this.openTrade = null
    this.tradeId = 0
  }

  private processSignal(signal: "buy" | "sell" | "hold", bar: ChartData, index: number) {
    if (signal === "hold") return

    if (signal === "buy" && !this.openTrade) {
      this.openTrade = {
        id: `trade_${++this.tradeId}`,
        type: "buy",
        entryPrice: bar.close,
        entryTime: bar.timestamp,
        quantity: this.config.positionSize,
        status: "open",
        reason: "Strategy signal",
      }
    } else if (signal === "sell" && this.openTrade && this.openTrade.type === "buy") {
      this.closeTrade(bar, index, "Strategy signal")
    }
  }

  private closeTrade(bar: ChartData, index: number, reason: string) {
    if (!this.openTrade) return

    const exitPrice = bar.close
    const commission = this.config.commission * 2 // Entry + Exit
    const slippage = exitPrice * this.config.slippage

    let pnl = 0
    if (this.openTrade.type === "buy") {
      pnl = (exitPrice - this.openTrade.entryPrice) * this.openTrade.quantity - commission - slippage
    }

    this.openTrade.exitPrice = exitPrice
    this.openTrade.exitTime = bar.timestamp
    this.openTrade.pnl = pnl
    this.openTrade.status = "closed"
    this.openTrade.reason = reason

    this.trades.push({ ...this.openTrade })
    this.currentCapital += pnl
    this.openTrade = null
  }

  private checkExitConditions(bar: ChartData, index: number) {
    if (!this.openTrade) return

    const currentPrice = bar.close
    const entryPrice = this.openTrade.entryPrice

    // Stop Loss
    if (this.config.stopLoss) {
      const stopLossPrice = entryPrice * (1 - this.config.stopLoss / 100)
      if (currentPrice <= stopLossPrice) {
        this.closeTrade(bar, index, "Stop Loss")
        return
      }
    }

    // Take Profit
    if (this.config.takeProfit) {
      const takeProfitPrice = entryPrice * (1 + this.config.takeProfit / 100)
      if (currentPrice >= takeProfitPrice) {
        this.closeTrade(bar, index, "Take Profit")
        return
      }
    }
  }

  private updateEquity(timestamp: number) {
    let currentEquity = this.currentCapital

    // Add unrealized PnL if there's an open trade
    if (this.openTrade) {
      // This would need current price, but we'll approximate
      currentEquity += 0 // Simplified for now
    }

    this.equity.push(currentEquity)
    this.equityDates.push(timestamp)
  }

  private calculateResults(): BacktestResult {
    const closedTrades = this.trades.filter((t) => t.status === "closed")
    const winningTrades = closedTrades.filter((t) => (t.pnl || 0) > 0)
    const losingTrades = closedTrades.filter((t) => (t.pnl || 0) < 0)

    const totalPnL = closedTrades.reduce((sum, t) => sum + (t.pnl || 0), 0)
    const winRate = closedTrades.length > 0 ? (winningTrades.length / closedTrades.length) * 100 : 0

    const wins = winningTrades.map((t) => t.pnl || 0)
    const losses = losingTrades.map((t) => Math.abs(t.pnl || 0))

    const averageWin = wins.length > 0 ? wins.reduce((a, b) => a + b, 0) / wins.length : 0
    const averageLoss = losses.length > 0 ? losses.reduce((a, b) => a + b, 0) / losses.length : 0

    const largestWin = wins.length > 0 ? Math.max(...wins) : 0
    const largestLoss = losses.length > 0 ? Math.max(...losses) : 0

    const profitFactor = averageLoss > 0 ? averageWin / averageLoss : 0

    // Calculate max drawdown
    let maxDrawdown = 0
    let peak = this.config.initialCapital

    for (const equity of this.equity) {
      if (equity > peak) peak = equity
      const drawdown = ((peak - equity) / peak) * 100
      if (drawdown > maxDrawdown) maxDrawdown = drawdown
    }

    // Simplified Sharpe ratio calculation
    const returns = this.equity.map((eq, i) => (i > 0 ? (eq - this.equity[i - 1]) / this.equity[i - 1] : 0))
    const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length
    const returnStdDev = Math.sqrt(returns.reduce((sum, ret) => sum + Math.pow(ret - avgReturn, 2), 0) / returns.length)
    const sharpeRatio = returnStdDev > 0 ? avgReturn / returnStdDev : 0

    return {
      trades: this.trades,
      totalTrades: closedTrades.length,
      winningTrades: winningTrades.length,
      losingTrades: losingTrades.length,
      winRate,
      totalPnL,
      maxDrawdown,
      sharpeRatio,
      profitFactor,
      averageWin,
      averageLoss,
      largestWin,
      largestLoss,
      equity: this.equity,
      equityDates: this.equityDates,
    }
  }
}
