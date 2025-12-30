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

export const VOLATILITY_INDICES = [
  { symbol: "1HZ10V", display_name: "Volatility 10 (1s) Index" },
  { symbol: "R_10", display_name: "Volatility 10 Index" },
  { symbol: "1HZ15V", display_name: "Volatility 15 (1s) Index" },
  { symbol: "1HZ25V", display_name: "Volatility 25 (1s) Index" },
  { symbol: "R_25", display_name: "Volatility 25 Index" },
  { symbol: "1HZ30V", display_name: "Volatility 30 (1s) Index" },
  { symbol: "1HZ50V", display_name: "Volatility 50 (1s) Index" },
  { symbol: "R_50", display_name: "Volatility 50 Index" },
  { symbol: "1HZ75V", display_name: "Volatility 75 (1s) Index" },
  { symbol: "R_75", display_name: "Volatility 75 Index" },
  { symbol: "1HZ90V", display_name: "Volatility 90 (1s) Index" },
  { symbol: "1HZ100V", display_name: "Volatility 100 (1s) Index" },
  { symbol: "R_100", display_name: "Volatility 100 Index" },
]
