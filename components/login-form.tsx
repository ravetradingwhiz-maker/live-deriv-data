"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useAuth } from "@/contexts/auth-context"
import { Eye, EyeOff, Lock, User, TrendingUp, Shield, Zap, MessageCircle } from "lucide-react"

// Mock reviews data
const MOCK_REVIEWS = [
  {
    id: 1,
    name: "Sarah Johnson",
    role: "Professional Trader",
    avatar: "SJ",
    rating: 5,
    review: "This platform has completely transformed my trading strategy. The AI predictions are incredibly accurate!",
    timestamp: "2 minutes ago",
    verified: true,
  },
  {
    id: 2,
    name: "Michael Chen",
    role: "Day Trader",
    avatar: "MC",
    rating: 5,
    review: "Best trading analysis tool I've ever used. The real-time data and backtesting features are outstanding.",
    timestamp: "5 minutes ago",
    verified: true,
  },
  {
    id: 3,
    name: "Emma Rodriguez",
    role: "Forex Analyst",
    avatar: "ER",
    rating: 4,
    review: "The technical indicators are spot-on. Made my first profitable month using this platform!",
    timestamp: "8 minutes ago",
    verified: true,
  },
  {
    id: 4,
    name: "David Thompson",
    role: "Crypto Trader",
    avatar: "DT",
    rating: 5,
    review: "Incredible accuracy on volatility predictions. The subscription is worth every penny.",
    timestamp: "12 minutes ago",
    verified: true,
  },
  {
    id: 5,
    name: "Lisa Wang",
    role: "Investment Manager",
    avatar: "LW",
    rating: 5,
    review: "Our team has increased profits by 40% since using this platform. Highly recommended!",
    timestamp: "15 minutes ago",
    verified: true,
  },
  {
    id: 6,
    name: "James Miller",
    role: "Swing Trader",
    avatar: "JM",
    rating: 4,
    review: "The backtesting feature helped me refine my strategy. Great platform for serious traders.",
    timestamp: "18 minutes ago",
    verified: true,
  },
]

// Reviews popup component
function LiveReviews() {
  const [currentReview, setCurrentReview] = useState(0)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const showReview = () => {
      setIsVisible(true)
      setTimeout(() => setIsVisible(false), 4000) // Show for 4 seconds
    }

    const interval = setInterval(() => {
      setCurrentReview((prev) => (prev + 1) % MOCK_REVIEWS.length)
      showReview()
    }, 6000) // New review every 6 seconds

    // Show first review immediately
    showReview()

    return () => clearInterval(interval)
  }, [])

  const review = MOCK_REVIEWS[currentReview]

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <div
        className={`transform transition-all duration-500 ease-in-out ${
          isVisible ? "translate-y-0 opacity-100" : "translate-y-full opacity-0"
        }`}
      >
        <div className="bg-slate-800/95 backdrop-blur-sm border border-slate-600 rounded-lg p-4 max-w-sm shadow-2xl">
          <div className="flex items-start gap-3">
            <div className="bg-blue-600 rounded-full w-10 h-10 flex items-center justify-center text-white font-semibold text-sm">
              {review.avatar}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h4 className="text-white font-semibold text-sm truncate">{review.name}</h4>
                {review.verified && (
                  <div className="bg-green-600 rounded-full w-4 h-4 flex items-center justify-center">
                    <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                )}
              </div>
              <p className="text-slate-400 text-xs mb-2">{review.role}</p>
              <div className="flex items-center gap-1 mb-2">
                {[...Array(5)].map((_, i) => (
                  <svg
                    key={i}
                    className={`w-3 h-3 ${i < review.rating ? "text-yellow-400" : "text-slate-600"}`}
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>
              <p className="text-slate-300 text-sm leading-relaxed mb-2">"{review.review}"</p>
              <p className="text-slate-500 text-xs">{review.timestamp}</p>
            </div>
          </div>

          {/* Live indicator */}
          <div className="absolute top-2 right-2 flex items-center gap-1">
            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
            <span className="text-red-400 text-xs font-medium">LIVE</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export function LoginForm() {
  const { login, isLoading } = useAuth()
  const [credentials, setCredentials] = useState({ username: "", password: "" })
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (!credentials.username || !credentials.password) {
      setError("Please enter both username and password")
      return
    }

    const success = await login(credentials)
    if (!success) {
      setError("Invalid username or password")
    }
  }

  const handleGetAccess = () => {
    const phoneNumber = "254775317514"
    const message = "Hello mentor, am ready to purchase your trading software package"
    const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`

    // Open WhatsApp in a new tab/window
    window.open(whatsappUrl, "_blank")
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Logo and Branding */}
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="bg-blue-600 p-3 rounded-lg">
              <TrendingUp className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Live Deriv Data Analysis</h1>
              <p className="text-sm text-slate-400">Professional Trading Platform</p>
            </div>
          </div>
        </div>

        {/* Login Card */}
        <Card className="bg-slate-800/90 border-slate-700 backdrop-blur-sm">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl text-center text-white">Welcome Back</CardTitle>
            <p className="text-center text-slate-400">Sign in to your trading account</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username" className="text-white">
                  Username
                </Label>
                <div className="relative">
                  <User className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  <Input
                    id="username"
                    type="text"
                    placeholder="Enter your username"
                    value={credentials.username}
                    onChange={(e) => setCredentials((prev) => ({ ...prev, username: e.target.value }))}
                    className="pl-10 bg-slate-700 border-slate-600 text-white placeholder:text-slate-400"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-white">
                  Password
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    value={credentials.password}
                    onChange={(e) => setCredentials((prev) => ({ ...prev, password: e.target.value }))}
                    className="pl-10 pr-10 bg-slate-700 border-slate-600 text-white placeholder:text-slate-400"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3 text-slate-400 hover:text-white"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {error && (
                <Alert className="border-red-500 bg-red-500/10">
                  <AlertDescription className="text-red-400">{error}</AlertDescription>
                </Alert>
              )}

              <Button type="submit" disabled={isLoading} className="w-full bg-blue-600 hover:bg-blue-700">
                {isLoading ? "Signing in..." : "Sign In"}
              </Button>
            </form>

            {/* Get Access Section */}
            <div className="space-y-3">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-slate-600" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-slate-800 px-2 text-slate-400">Need Access?</span>
                </div>
              </div>

              <div className="bg-slate-700/30 p-4 rounded-lg text-center space-y-3">
                <div className="text-sm text-slate-300">Don't have an account yet?</div>
                <p className="text-xs text-slate-400">
                  Get instant access to our professional trading platform with advanced analytics, real-time data, and
                  powerful backtesting tools.
                </p>
                <Button
                  type="button"
                  onClick={handleGetAccess}
                  className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold"
                >
                  <MessageCircle className="h-4 w-4 mr-2" />
                  Get Access via WhatsApp
                </Button>
                <p className="text-xs text-slate-500">Click to contact our mentor directly</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Features */}
        <div className="grid grid-cols-3 gap-4 text-center">
          <div className="space-y-2">
            <div className="bg-green-600/20 p-3 rounded-lg mx-auto w-fit">
              <Shield className="h-6 w-6 text-green-400" />
            </div>
            <div className="text-xs text-slate-400">Secure Trading</div>
          </div>
          <div className="space-y-2">
            <div className="bg-blue-600/20 p-3 rounded-lg mx-auto w-fit">
              <TrendingUp className="h-6 w-6 text-blue-400" />
            </div>
            <div className="text-xs text-slate-400">Real-time Data</div>
          </div>
          <div className="space-y-2">
            <div className="bg-purple-600/20 p-3 rounded-lg mx-auto w-fit">
              <Zap className="h-6 w-6 text-purple-400" />
            </div>
            <div className="text-xs text-slate-400">Advanced Tools</div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-xs text-slate-500">
          <p>© 2024 Live Deriv Data Analysis Platform. All rights reserved.</p>
          <p className="mt-1">Professional trading tools for serious traders.</p>
        </div>
      </div>

      {/* Add Live Reviews component here */}
      <LiveReviews />
    </div>
  )
}
