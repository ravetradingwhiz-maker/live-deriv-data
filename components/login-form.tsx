"use client"

import type React from "react"
import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useAuth } from "@/contexts/auth-context"
import { Lock, Shield, Zap, ArrowLeft } from "lucide-react"
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
    // Contact functionality disabled
  }

  return (
    <div className="w-full space-y-4">
      {onBackClick && (
        <button
          onClick={onBackClick}
          className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-sm"
        >
          <ArrowLeft className="h-4 w-4" />
            Back
          </button>
        )}

        {/* Login Card */}
        <Card className="bg-slate-800/80 border-slate-600 backdrop-blur-sm w-full shadow-xl">
          <CardHeader className="space-y-2 pb-4">
            <CardTitle className="text-3xl text-center text-white font-bold">Welcome Back</CardTitle>
            <p className="text-center text-base text-slate-300">Enter your access code</p>
          </CardHeader>
          <CardContent className="space-y-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-3">
                <Label htmlFor="accessCode" className="text-white text-lg font-semibold">
                  Access Code
                </Label>
                <div className="relative">
                  <Lock className="absolute left-4 top-4 h-5 w-5 text-slate-400" />
                  <Input
                    id="accessCode"
                    type="text"
                    placeholder="Enter your access code"
                    value={accessCode}
                    onChange={(e) => setAccessCode(e.target.value)}
                    className="pl-12 bg-slate-700 border-slate-600 text-white placeholder:text-slate-400 h-12 text-lg rounded-lg"
                  />
                </div>
              </div>

              {error && (
                <Alert className="border-red-500 bg-red-500/10">
                  <AlertDescription className="text-red-400">{error}</AlertDescription>
                </Alert>
              )}

              <Button type="submit" disabled={isLoading} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold h-12 text-lg rounded-lg transition-all duration-200 disabled:opacity-50">
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

                {/* WhatsApp Contact Button */}
                <button
                  onClick={() => {
                    const phoneNumber = "447453756837"
                    const message = "Hello, I've seen your trading videos and I'm interested in buying your software and joining your mentorship. What's the price and how do I get started?"
                    const encodedMessage = encodeURIComponent(message)
                    const whatsappURL = `https://wa.me/${phoneNumber}?text=${encodedMessage}`
                    window.open(whatsappURL, "_blank")
                  }}
                  className="w-full bg-[#25D366] hover:bg-[#20BA5A] text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center gap-2 mt-3"
                >
                  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.67-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.076 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421-7.403h-.004a9.87 9.87 0 00-4.855 1.34c-1.487.853-2.753 2.136-3.68 3.737C5.853 10.634 5.273 12.242 5.273 13.9c0 2.694.675 5.193 1.968 7.218l.244.468-1.017 3.718 3.902-1.026.455.182c1.976 1.001 4.04 1.533 6.15 1.533 2.108 0 4.172-.532 6.148-1.533l.455-.182 3.902 1.026-.244-.468C19.012 19.093 19.687 16.594 19.687 13.9c0-1.658-.579-3.266-1.634-4.771-.929-1.601-2.195-2.884-3.682-3.737a9.87 9.87 0 00-4.855-1.34M12 0C5.383 0 0 5.383 0 12s5.383 12 12 12 12-5.383 12-12S18.617 0 12 0z" />
                  </svg>
                  Contact via WhatsApp
                </button>
              </div>
            </div>
          </CardContent>
        </Card>



        {/* Footer */}
        <div className="text-center text-xs text-slate-500 mt-2">
          <p>© 2023 Live Deriv Data Analysis Platform.</p>
        </div>
    </div>
  )
}
