import type { TradingStrategy } from "@/types/backtesting"
import type { ChartData } from "@/types/trading"

export const tradingStrategies: TradingStrategy[] = [
  {
    id: "sma_crossover",
    name: "SMA Crossover",
    description: "Buy when fast SMA crosses above slow SMA, sell when it crosses below",
    parameters: {
      fastPeriod: 20,
      slowPeriod: 50,
    },
    signals: (data: ChartData[], index: number, params: Record<string, number>) => {
      if (index < 2) return "hold"

      const current = data[index]
      const previous = data[index - 1]

      if (!current.sma20 || !current.sma50 || !previous.sma20 || !previous.sma50) {
        return "hold"
      }

      // Golden cross - fast SMA crosses above slow SMA
      if (previous.sma20 <= previous.sma50 && current.sma20 > current.sma50) {
        return "buy"
      }

      // Death cross - fast SMA crosses below slow SMA
      if (previous.sma20 >= previous.sma50 && current.sma20 < current.sma50) {
        return "sell"
      }

      return "hold"
    },
  },
  {
    id: "rsi_oversold",
    name: "RSI Oversold/Overbought",
    description: "Buy when RSI is oversold (<30), sell when overbought (>70)",
    parameters: {
      oversoldLevel: 30,
      overboughtLevel: 70,
    },
    signals: (data: ChartData[], index: number, params: Record<string, number>) => {
      const current = data[index]

      if (!current.rsi) return "hold"

      if (current.rsi < params.oversoldLevel) {
        return "buy"
      }

      if (current.rsi > params.overboughtLevel) {
        return "sell"
      }

      return "hold"
    },
  },
  {
    id: "macd_signal",
    name: "MACD Signal",
    description: "Buy when MACD crosses above signal line, sell when it crosses below",
    parameters: {
      fastPeriod: 12,
      slowPeriod: 26,
      signalPeriod: 9,
    },
    signals: (data: ChartData[], index: number, params: Record<string, number>) => {
      if (index < 2) return "hold"

      const current = data[index]
      const previous = data[index - 1]

      if (!current.macd || !current.macdSignal || !previous.macd || !previous.macdSignal) {
        return "hold"
      }

      // MACD crosses above signal line
      if (previous.macd <= previous.macdSignal && current.macd > current.macdSignal) {
        return "buy"
      }

      // MACD crosses below signal line
      if (previous.macd >= previous.macdSignal && current.macd < current.macdSignal) {
        return "sell"
      }

      return "hold"
    },
  },
  {
    id: "bollinger_bounce",
    name: "Bollinger Band Bounce",
    description: "Buy when price touches lower band, sell when it touches upper band",
    parameters: {
      period: 20,
      stdDev: 2,
    },
    signals: (data: ChartData[], index: number, params: Record<string, number>) => {
      const current = data[index]

      if (!current.bollingerUpper || !current.bollingerLower) return "hold"

      // Price touches lower band - oversold
      if (current.close <= current.bollingerLower) {
        return "buy"
      }

      // Price touches upper band - overbought
      if (current.close >= current.bollingerUpper) {
        return "sell"
      }

      return "hold"
    },
  },
  {
    id: "multi_indicator",
    name: "Multi-Indicator Strategy",
    description: "Combines RSI, MACD, and SMA signals for confirmation",
    parameters: {
      rsiOversold: 30,
      rsiOverbought: 70,
    },
    signals: (data: ChartData[], index: number, params: Record<string, number>) => {
      if (index < 2) return "hold"

      const current = data[index]
      const previous = data[index - 1]

      if (!current.rsi || !current.macd || !current.macdSignal || !current.sma20 || !current.sma50) {
        return "hold"
      }

      let bullishSignals = 0
      let bearishSignals = 0

      // RSI signals
      if (current.rsi < params.rsiOversold) bullishSignals++
      if (current.rsi > params.rsiOverbought) bearishSignals++

      // MACD signals
      if (current.macd > current.macdSignal) bullishSignals++
      if (current.macd < current.macdSignal) bearishSignals++

      // SMA signals
      if (current.close > current.sma20 && current.sma20 > current.sma50) bullishSignals++
      if (current.close < current.sma20 && current.sma20 < current.sma50) bearishSignals++

      // Need at least 2 confirming signals
      if (bullishSignals >= 2) return "buy"
      if (bearishSignals >= 2) return "sell"

      return "hold"
    },
  },
]
