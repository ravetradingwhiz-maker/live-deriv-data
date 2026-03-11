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
      <div className="relative w-full max-w-sm mx-auto max-h-[85vh] overflow-y-auto bg-black/90 backdrop-blur rounded-full shadow-2xl border border-slate-700">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-10 p-2 rounded-lg bg-slate-800/80 hover:bg-slate-700 transition-colors"
        >
          <X className="h-5 w-5 text-white" />
        </button>

        {/* Login Form */}
        <div>
          <LoginForm onBackClick={onClose} />
        </div>
      </div>
    </div>
  )
}
