"use client"

import type React from "react"
import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useAuth } from "@/contexts/AuthContext"
import { Lock, Zap, Check } from "lucide-react"

const ACCESS_MESSAGE =
  "Hello, I've seen your trading videos and I'm interested in buying your software and joining your mentorship. What's the price and how do I get started?"

const openTelegramWithMessage = () => {
  // Copy to clipboard as a fallback — Telegram pre-fill via t.me ?text= is best-effort
  if (typeof navigator !== "undefined" && navigator.clipboard) {
    navigator.clipboard.writeText(ACCESS_MESSAGE).catch(() => {})
  }
  window.open(`https://t.me/live_deriv?text=${encodeURIComponent(ACCESS_MESSAGE)}`, "_blank")
}

const openWhatsAppWithMessage = () => {
  window.open(`https://wa.me/61421883113?text=${encodeURIComponent(ACCESS_MESSAGE)}`, "_blank")
}

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
      <Card className="bg-black/90 border-[4px] border-cyan-500 cyan-glow backdrop-blur-sm shadow-2xl">
        <CardContent className="p-6 space-y-6">
          {/* Form Section */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Access Code Input */}
            <div className="space-y-2.5">
              <label htmlFor="accessCode" className="text-sm font-semibold text-cyan-400 block">
                Access Code
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-3.5 h-4 w-4 text-cyan-400 pointer-events-none" />
                <Input
                  id="accessCode"
                  type="text"
                  placeholder="Enter your access code"
                  value={accessCode}
                  onChange={(e) => setAccessCode(e.target.value)}
                  className="pl-10 h-11 bg-black/80 border-2 border-cyan-500/50 text-cyan-400 placeholder:text-cyan-600 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-all"
                />
              </div>
            </div>

            {/* Error Alert */}
            {error && (
              <Alert className="border-2 border-red-500 bg-red-950/30 py-3 px-4">
                <AlertDescription className="text-red-400 text-sm font-medium">
                  {error}
                </AlertDescription>
              </Alert>
            )}

            {/* Sign In Button */}
            <Button 
              type="submit" 
              disabled={isLoading}
              className="w-full h-11 bg-cyan-600 hover:bg-cyan-700 text-black font-bold rounded-lg transition-all duration-200 shadow-lg border-2 border-cyan-400 disabled:opacity-60 disabled:cursor-not-allowed"
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

          {/* Request-Access CTA — same prominence as the old "Request Access" button */}
          <div className="rounded-lg border-2 border-cyan-500/60 bg-gradient-to-br from-cyan-950/40 to-black/40 p-4 space-y-3">
            <div className="flex items-center justify-center gap-2">
              <Lock className="h-4 w-4 text-[#25D366]" />
              <h3 className="text-sm font-bold text-[#25D366] uppercase tracking-wide">
                Request Access Code
              </h3>
            </div>
            <p className="text-center text-xs text-slate-300 leading-relaxed">
              Message us on <span className="font-semibold text-[#0088CC]">Telegram</span> or{" "}
              <span className="font-semibold text-[#25D366]">WhatsApp</span> to request your access code.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={openTelegramWithMessage}
                className="h-11 bg-[#0088CC] hover:bg-[#0077B5] text-white font-bold rounded-lg transition-all duration-200 shadow-md hover:shadow-lg flex items-center justify-center gap-2"
              >
                {/* Telegram paper-plane icon */}
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212-.07-.062-.174-.041-.249-.024-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
                </svg>
                Telegram
              </button>
              <button
                onClick={openWhatsAppWithMessage}
                className="h-11 bg-[#25D366] hover:bg-[#20BA5A] text-white font-bold rounded-lg transition-all duration-200 shadow-md hover:shadow-lg flex items-center justify-center gap-2"
              >
                {/* WhatsApp icon */}
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.67-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.076 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0 0 20.464 3.488" />
                </svg>
                WhatsApp
              </button>
            </div>
          </div>

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
