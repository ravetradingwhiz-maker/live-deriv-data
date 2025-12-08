"use client"

import type React from "react"
import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useAuth } from "@/contexts/auth-context"
import { Lock, Shield, Zap, MessageCircle, ArrowLeft } from "lucide-react"
import Image from "next/image"

interface LoginFormProps {
  onBackClick?: () => void
}

export function LoginForm({ onBackClick }: LoginFormProps) {
  const { login, isLoading } = useAuth()
  const [accessCode, setAccessCode] = useState("")
  const [error, setError] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (!accessCode) {
      setError("Please enter your access code")
      return
    }

    const success = await login({ accessCode })
    if (!success) {
      setError("Invalid access code")
    }
  }

  const handleGetAccess = () => {
    const phoneNumber = "254775317514"
    const message = "Hello mentor, am ready to purchase your trading software package"
    const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`

    window.open(whatsappUrl, "_blank")
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        {onBackClick && (
          <button
            onClick={onBackClick}
            className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>
        )}

        {/* Logo and Branding */}
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Image src="/deriv-logo.png" alt="Deriv Pro Logo" width={48} height={48} className="rounded-lg" />
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
            <p className="text-center text-slate-400">Sign in with your access code</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="accessCode" className="text-white">
                  Access Code
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  <Input
                    id="accessCode"
                    type="text"
                    placeholder="Enter your access code"
                    value={accessCode}
                    onChange={(e) => setAccessCode(e.target.value)}
                    className="pl-10 bg-slate-700 border-slate-600 text-white placeholder:text-slate-400"
                  />
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
                <div className="text-sm text-slate-300">Don't have an access code?</div>
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
              <Lock className="h-6 w-6 text-blue-400" />
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
          <p>© 2025 Live Deriv Data Analysis Platform. All rights reserved.</p>
          <p className="mt-1">Professional trading tools for serious traders.</p>
        </div>
      </div>
    </div>
  )
}
