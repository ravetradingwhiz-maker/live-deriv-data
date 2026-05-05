"use client"

import { LoginForm } from "@/components/login-form"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-background dark:bg-slate-950 flex flex-col overflow-hidden">
      {/* Subtle gradient background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary/10 dark:bg-cyan-500/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-primary/10 dark:bg-blue-500/5 rounded-full blur-3xl" />
      </div>

      {/* Header with back button */}
      <div className="relative z-10 p-6 flex justify-between items-center">
        <Link href="/">
          <Button 
            variant="ghost" 
            className="flex items-center gap-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
        </Link>
        <div className="text-xs font-semibold text-slate-400 dark:text-slate-500 tracking-widest uppercase">
          Secure Access
        </div>
      </div>

      {/* Main login content - centered with proper spacing */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 py-8">
        <div className="w-full max-w-md">
          {/* Header section */}
          <div className="text-center mb-8 space-y-3">
            <div className="flex justify-center mb-4">
              <div className="h-12 w-12 rounded-lg bg-primary dark:bg-cyan-500 flex items-center justify-center shadow-lg">
                <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
            </div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
              Live Deriv Data
            </h1>
            <p className="text-slate-600 dark:text-slate-400 text-sm font-medium">
              Access your trading intelligence platform
            </p>
          </div>

          {/* Login form */}
          <LoginForm />
        </div>
      </div>

      {/* Footer */}
      <div className="relative z-10 text-center py-6 border-t border-slate-200 dark:border-slate-800">
        <p className="text-xs text-slate-500 dark:text-slate-600">
          © 2024 Live Deriv Data. All rights reserved.
        </p>
      </div>
    </div>
  )
}
