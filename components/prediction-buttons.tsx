"use client"

import React, { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { TrendingUp, Target, Hash, BarChart3, Lock } from "lucide-react"

interface PredictionButtonsProps {
  onOpenPrediction: (type: string) => void
  canTrade: boolean
  ticksBufferLength: number
  runsThisSession: number
  maxRuns: number
}

const predictionTypes = [
  {
    id: "over_under",
    name: "Over/Under AI",
    icon: TrendingUp,
    description: "Predict if digit > or ≤ 4.5",
    color: "bg-green-600 hover:bg-green-700",
    entryType: "digit",
  },
  {
    id: "matches_differs",
    name: "Matches/Differs",
    icon: Target,
    description: "Match or differ from target",
    color: "bg-blue-600 hover:bg-blue-700",
    entryType: "digit",
  },
  {
    id: "even_odd",
    name: "Even/Odd",
    icon: Hash,
    description: "Predict even or odd digit",
    color: "bg-purple-600 hover:bg-purple-700",
    entryType: "category",
  },
  {
    id: "rise_fall",
    name: "Rise/Fall",
    icon: BarChart3,
    description: "Predict price direction",
    color: "bg-orange-600 hover:bg-orange-700",
    entryType: "category",
  },
]

// Fetch the prediction probability for each trade type from server API (token hidden)
async function fetchPrediction(type: string): Promise<{ probability: number; entry: string; summary: string } | null> {
  try {
    const res = await fetch(`/api/predict?type=${type}`)
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  }
}

export function PredictionButtons({
  onOpenPrediction,
  canTrade,
  ticksBufferLength,
  runsThisSession,
  maxRuns,
}: PredictionButtonsProps) {
  const isDisabled = !canTrade || ticksBufferLength < 10
  const [probabilities, setProbabilities] = useState<Record<string, { probability: number; entry: string; summary: string }>>({})

  useEffect(() => {
    predictionTypes.forEach((type) => {
      fetchPrediction(type.id).then((result) => {
        if (result) {
          setProbabilities((prev) => ({
            ...prev,
            [type.id]: result,
          }))
        }
      })
    })
  }, [ticksBufferLength])

  return (
    <div className="space-y-3">
      <div className="text-sm font-medium text-slate-100 mb-2">AI Prediction Tools</div>
      <div className="grid grid-cols-1 gap-2">
        {predictionTypes.map((type) => {
          const Icon = type.icon
          const prediction = probabilities[type.id]
          const probabilityText = prediction ? `${(prediction.probability * 100).toFixed(1)}%` : "..."
          let entryText = ""
          let summaryText = ""
          if (prediction) {
            if (type.entryType === "digit") {
              entryText = `Digit: ${prediction.entry}`
            } else if (type.id === "rise_fall") {
              entryText = `Recommendation: ${prediction.entry === "rise" ? "Rise" : "Fall"}`
            } else if (type.id === "even_odd") {
              entryText = `Recommendation: ${prediction.entry === "even" ? "Even" : "Odd"}`
            }
            summaryText = prediction.summary
          }
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
                  <div className="text-xs mt-1">
                    <span className="font-bold">Entry:</span> {entryText}
                    <span className="ml-2 font-bold">Probability:</span> {probabilityText}
                  </div>
                  {summaryText && (
                    <div className="text-xs mt-1 italic text-slate-300">{summaryText}</div>
                  )}
                </div>
                {!canTrade && <Lock className="h-3 w-3 flex-shrink-0" />}
              </div>
            </Button>
          )
        })}
      </div>
      {/* Session Info */}
      <div className="bg-slate-700/30 p-2 rounded text-xs text-slate-200">
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
