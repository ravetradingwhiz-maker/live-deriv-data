"use client"

import { LoginForm } from "@/components/login-form"
import { X } from "lucide-react"

interface LoginModalProps {
  isOpen: boolean
  onClose: () => void
}

export function LoginModal({ isOpen, onClose }: LoginModalProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal Container */}
      <div className="relative w-[360px] h-[480px] bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-full shadow-2xl border border-slate-700 overflow-hidden flex items-center justify-center">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 p-2 rounded-lg bg-slate-700/60 hover:bg-slate-600 transition-colors"
        >
          <X className="h-5 w-5 text-white" />
        </button>

        {/* Login Form - Scrollable Content */}
        <div className="w-full h-full overflow-y-auto pt-8 px-6 pb-6 flex flex-col items-center justify-center">
          <LoginForm onBackClick={onClose} />
        </div>
      </div>
    </div>
  )
}
