export interface Market {
  symbol: string
  display_name: string
}

export interface TickData {
  quote: number
  symbol: string
  epoch?: number
  pip_size?: number
}

export interface PredictionResult {
  type: "over" | "under" | "matches" | "differs" | "even" | "odd" | "rise" | "fall"
  digit?: number | null
  confidence: number
  runs: number
  recommendation: "STRONG" | "WEAK"
  analysis?: string
  targetDigit?: number
  priceDirection?: "up" | "down"
}

export interface WebSocketMessage {
  active_symbols?: Array<{
    symbol: string
    display_name: string
    market?: string
    market_display_name?: string
    submarket?: string
    submarket_display_name?: string
  }>
  tick?: TickData
  ping?: number
  pong?: number
  subscription?: {
    id: string
  }
  error?: {
    code: string
    message: string
    details?: any
  }
  req_id?: number
}

export interface CandleData {
  timestamp: number
  open: number
  high: number
  low: number
  close: number
  volume: number
}

export interface IndicatorData {
  sma20?: number
  sma50?: number
  ema12?: number
  ema26?: number
  rsi?: number
  macd?: number
  macdSignal?: number
  macdHistogram?: number
  bollingerUpper?: number
  bollingerMiddle?: number
  bollingerLower?: number
}

export interface ChartData extends CandleData, IndicatorData {
  time: string
  color: string
}

export interface IndicatorSettings {
  showSMA20: boolean
  showSMA50: boolean
  showEMA12: boolean
  showEMA26: boolean
  showRSI: boolean
  showMACD: boolean
  showBollinger: boolean
}

export type PredictionType = "over_under" | "matches_differs" | "even_odd" | "rise_fall"
