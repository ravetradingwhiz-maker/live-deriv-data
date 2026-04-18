"use client"

import type React from "react"
import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useAuth } from "@/contexts/auth-context"
import { Lock, Zap, Check } from "lucide-react"

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
      {/* Main Login Card */}
      <Card className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/50 backdrop-blur-sm shadow-lg hover:shadow-xl transition-shadow duration-300">
        <CardContent className="p-6 space-y-6">
          {/* Form Section */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Access Code Input */}
            <div className="space-y-2.5">
              <label htmlFor="accessCode" className="text-sm font-semibold text-slate-900 dark:text-slate-100 block">
                Access Code
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-3.5 h-4 w-4 text-slate-400 dark:text-slate-500 pointer-events-none" />
                <Input
                  id="accessCode"
                  type="text"
                  placeholder="Enter your access code"
                  value={accessCode}
                  onChange={(e) => setAccessCode(e.target.value)}
                  className="pl-10 h-11 bg-slate-50 dark:bg-slate-800/50 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder:text-slate-500 dark:placeholder:text-slate-500 rounded-lg focus:ring-2 focus:ring-primary/50 dark:focus:ring-cyan-500/50 focus:border-transparent transition-all"
                />
              </div>
            </div>

            {/* Error Alert */}
            {error && (
              <Alert className="border border-red-200 dark:border-red-900/30 bg-red-50 dark:bg-red-950/20 py-3 px-4">
                <AlertDescription className="text-red-600 dark:text-red-400 text-sm font-medium">
                  {error}
                </AlertDescription>
              </Alert>
            )}

            {/* Sign In Button */}
            <Button 
              type="submit" 
              disabled={isLoading}
              className="w-full h-11 bg-gradient-to-r from-primary to-cyan-500 dark:from-cyan-500 dark:to-blue-500 hover:from-primary/90 hover:to-cyan-600 dark:hover:from-cyan-600 dark:hover:to-blue-600 text-white font-semibold rounded-lg transition-all duration-200 shadow-md hover:shadow-lg disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Verifying...
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  <Zap className="h-4 w-4" />
                  Sign In
                </span>
              )}
            </Button>
          </form>

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200 dark:border-slate-700" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="px-2 bg-white dark:bg-slate-900/60 text-slate-500 dark:text-slate-400">or continue with</span>
            </div>
          </div>

          {/* Get Access Button */}
          <button
            onClick={() => {
              const phoneNumber = "447453756837"
              const message = "Hello, I'm interested in accessing your trading platform."
              const encodedMessage = encodeURIComponent(message)
              const whatsappURL = `https://wa.me/${phoneNumber}?text=${encodedMessage}`
              window.open(whatsappURL, "_blank")
            }}
            className="w-full h-11 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-semibold rounded-lg transition-all duration-200 shadow-md hover:shadow-lg flex items-center justify-center gap-2 dark:from-green-600 dark:to-emerald-600 dark:hover:from-green-700 dark:hover:to-emerald-700"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.67-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.076 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421-7.403h-.004a9.87 9.87 0 00-4.855 1.34c-1.487.853-2.753 2.136-3.68 3.737C5.853 10.634 5.273 12.242 5.273 13.9c0 2.694.675 5.193 1.968 7.218l.244.468-1.017 3.718 3.902-1.026.455.182c1.976 1.001 4.04 1.533 6.15 1.533 2.108 0 4.172-.532 6.148-1.533l.455-.182 3.902 1.026-.244-.468C19.012 19.093 19.687 16.594 19.687 13.9c0-1.658-.579-3.266-1.634-4.771-.929-1.601-2.195-2.884-3.682-3.737a9.87 9.87 0 00-4.855-1.34M12 0C5.383 0 0 5.383 0 12s5.383 12 12 12 12-5.383 12-12S18.617 0 12 0z" />
            </svg>
            Request Access
          </button>

          {/* Security Info */}
          <div className="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/30 rounded-lg">
            <Check className="h-4 w-4 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-blue-700 dark:text-blue-300">
              Your access code is encrypted and secure. Never share it with anyone.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
