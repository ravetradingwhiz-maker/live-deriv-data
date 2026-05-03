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
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal Container */}
      <div className="relative w-full max-w-xl bg-gradient-to-br from-slate-950 via-slate-800 to-slate-900 rounded-2xl shadow-2xl border border-blue-500/30 overflow-hidden group hover:border-blue-500/50 transition-all duration-300">
        {/* Subtle panel glow */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600/10 via-transparent to-cyan-600/10 pointer-events-none" />
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-6 right-6 z-10 p-2 rounded-full bg-slate-700/70 hover:bg-slate-600 transition-all duration-200 hover:scale-110"
        >
          <X className="h-6 w-6 text-white" />
        </button>

        {/* Login Form - Scrollable Content */}
        <div className="relative w-full max-h-[85vh] overflow-y-auto pt-12 px-6 sm:px-10 pb-8">
          <LoginForm onBackClick={onClose} />
        </div>
      </div>
    </div>
  )
}
