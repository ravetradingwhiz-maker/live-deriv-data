"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useAuth } from "@/contexts/auth-context"
import { Check, Crown, Zap, Shield, TrendingUp } from "lucide-react"
import type { SubscriptionPlan } from "@/types/auth"

const subscriptionPlans: SubscriptionPlan[] = [
  {
    id: "free",
    name: "Free",
    price: 0,
    features: ["Basic chart viewing", "Limited indicators", "1 backtest per day", "Community support"],
    maxStrategies: 1,
    maxBacktests: 1,
    realTimeData: false,
    advancedIndicators: false,
  },
  {
    id: "premium",
    name: "Premium",
    price: 49,
    features: [
      "Real-time data feeds",
      "Advanced indicators",
      "Unlimited backtests",
      "5 custom strategies",
      "Email support",
      "Export capabilities",
    ],
    maxStrategies: 5,
    maxBacktests: -1,
    realTimeData: true,
    advancedIndicators: true,
  },
  {
    id: "enterprise",
    name: "Enterprise",
    price: 199,
    features: [
      "Everything in Premium",
      "Unlimited strategies",
      "API access",
      "White-label options",
      "Priority support",
      "Custom indicators",
      "Multi-user accounts",
    ],
    maxStrategies: -1,
    maxBacktests: -1,
    realTimeData: true,
    advancedIndicators: true,
  },
]

export function SubscriptionManager() {
  const { user, updateUser } = useAuth()

  if (!user) return null

  const currentPlan = subscriptionPlans.find((plan) => plan.id === user.subscription)

  const handleUpgrade = (planId: string) => {
    // In a real app, this would integrate with a payment processor
    updateUser({ subscription: planId as any })
  }

  const getPlanIcon = (planId: string) => {
    switch (planId) {
      case "enterprise":
        return <Crown className="h-5 w-5 text-purple-400" />
      case "premium":
        return <Zap className="h-5 w-5 text-blue-400" />
      default:
        return <Shield className="h-5 w-5 text-gray-400" />
    }
  }

  return (
    <Card className="bg-slate-800/90 border-slate-700 text-white">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Subscription Management
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Current Plan */}
        <div className="bg-slate-700/50 p-4 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-lg font-semibold">Current Plan</h3>
            <Badge className="bg-green-600">Active</Badge>
          </div>
          <div className="flex items-center gap-3">
            {getPlanIcon(user.subscription)}
            <div>
              <div className="font-semibold">{currentPlan?.name}</div>
              <div className="text-sm text-slate-400">${currentPlan?.price}/month</div>
            </div>
          </div>
        </div>

        {/* Available Plans */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {subscriptionPlans.map((plan) => (
            <Card
              key={plan.id}
              className={`bg-slate-700/50 border-slate-600 ${
                plan.id === user.subscription ? "ring-2 ring-blue-500" : ""
              }`}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    {getPlanIcon(plan.id)}
                    {plan.name}
                  </CardTitle>
                  {plan.id === user.subscription && (
                    <Badge variant="outline" className="text-xs">
                      Current
                    </Badge>
                  )}
                </div>
                <div className="text-2xl font-bold">
                  ${plan.price}
                  <span className="text-sm font-normal text-slate-400">/month</span>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="space-y-2">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-center gap-2 text-sm">
                      <Check className="h-4 w-4 text-green-400 flex-shrink-0" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                <div className="space-y-2 text-xs text-slate-400">
                  <div>Strategies: {plan.maxStrategies === -1 ? "Unlimited" : plan.maxStrategies}</div>
                  <div>Backtests: {plan.maxBacktests === -1 ? "Unlimited" : `${plan.maxBacktests}/day`}</div>
                </div>

                {plan.id !== user.subscription && (
                  <Button
                    onClick={() => handleUpgrade(plan.id)}
                    className="w-full"
                    variant={plan.id === "enterprise" ? "default" : "outline"}
                  >
                    {plan.price > (currentPlan?.price || 0) ? "Upgrade" : "Downgrade"}
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Usage Stats */}
        <div className="bg-slate-700/50 p-4 rounded-lg">
          <h3 className="text-lg font-semibold mb-3">Usage Statistics</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <div className="text-slate-400">Strategies Used</div>
              <div className="font-semibold">
                3 / {currentPlan?.maxStrategies === -1 ? "∞" : currentPlan?.maxStrategies}
              </div>
            </div>
            <div>
              <div className="text-slate-400">Backtests Today</div>
              <div className="font-semibold">
                7 / {currentPlan?.maxBacktests === -1 ? "∞" : currentPlan?.maxBacktests}
              </div>
            </div>
            <div>
              <div className="text-slate-400">Real-time Data</div>
              <div className="font-semibold">{currentPlan?.realTimeData ? "✓ Enabled" : "✗ Disabled"}</div>
            </div>
            <div>
              <div className="text-slate-400">Advanced Indicators</div>
              <div className="font-semibold">{currentPlan?.advancedIndicators ? "✓ Enabled" : "✗ Disabled"}</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
