"use client"

import { Button } from "@/components/ui/button"
import { TrendingUp, Target, Hash, BarChart3, Lock } from "lucide-react"

interface PredictionButtonsProps {
  onOpenPrediction: (type: string) => void
  canTrade: boolean
  ticksBufferLength: number
  runsThisSession: number
  maxRuns: number
}

export function PredictionButtons({
  onOpenPrediction,
  canTrade,
  ticksBufferLength,
  runsThisSession,
  maxRuns,
}: PredictionButtonsProps) {
  const isDisabled = !canTrade || ticksBufferLength < 10

  const predictionTypes = [
    {
      id: "over_under",
      name: "Over/Under AI",
      icon: TrendingUp,
      description: "Predict if digit > or ≤ 4.5",
      color: "bg-green-600 hover:bg-green-700",
    },
    {
      id: "matches_differs",
      name: "Matches/Differs",
      icon: Target,
      description: "Match or differ from target",
      color: "bg-blue-600 hover:bg-blue-700",
    },
    {
      id: "even_odd",
      name: "Even/Odd",
      icon: Hash,
      description: "Predict even or odd digit",
      color: "bg-purple-600 hover:bg-purple-700",
    },
    {
      id: "rise_fall",
      name: "Rise/Fall",
      icon: BarChart3,
      description: "Predict price direction",
      color: "bg-orange-600 hover:bg-orange-700",
    },
  ]

  return (
    <div className="space-y-3">
      <div className="text-sm font-medium text-slate-300 mb-2">AI Prediction Tools</div>
      <div className="grid grid-cols-1 gap-2">
        {predictionTypes.map((type) => {
          const Icon = type.icon
          return (
            <Button
              key={type.id}
              onClick={() => onOpenPrediction(type.id)}
              disabled={isDisabled}
              className={`w-full ${type.color} text-white justify-start h-auto p-3`}
            >
              <div className="flex items-center gap-3 w-full">
                <Icon className="h-4 w-4 flex-shrink-0" />
                <div className="flex-1 text-left">
                  <div className="font-semibold text-sm">{type.name}</div>
                  <div className="text-xs opacity-90">{type.description}</div>
                </div>
                {!canTrade && <Lock className="h-3 w-3 flex-shrink-0" />}
              </div>
            </Button>
          )
        })}
      </div>

      {/* Session Info */}
      <div className="bg-slate-700/30 p-2 rounded text-xs text-slate-400">
        <div className="flex justify-between">
          <span>Session Runs:</span>
          <span>{runsThisSession}</span>
        </div>
        <div className="flex justify-between">
          <span>Data Points:</span>
          <span>{ticksBufferLength}</span>
        </div>
      </div>
    </div>
  )
}
