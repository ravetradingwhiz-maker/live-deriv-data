export interface Trade {
  id: string
  type: "buy" | "sell"
  entryPrice: number
  exitPrice?: number
  entryTime: number
  exitTime?: number
  quantity: number
  pnl?: number
  status: "open" | "closed"
  reason: string
}

export interface BacktestResult {
  trades: Trade[]
  totalTrades: number
  winningTrades: number
  losingTrades: number
  winRate: number
  totalPnL: number
  maxDrawdown: number
  sharpeRatio: number
  profitFactor: number
  averageWin: number
  averageLoss: number
  largestWin: number
  largestLoss: number
  equity: number[]
  equityDates: number[]
}

export interface TradingStrategy {
  id: string
  name: string
  description: string
  parameters: Record<string, number>
  signals: (data: any[], index: number, params: Record<string, number>) => "buy" | "sell" | "hold"
}

export interface BacktestConfig {
  strategy: TradingStrategy
  initialCapital: number
  positionSize: number
  stopLoss?: number
  takeProfit?: number
  commission: number
  slippage: number
}
