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
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal Container */}
      <div className="relative w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 p-2 rounded-lg bg-slate-800/90 hover:bg-slate-700 transition-colors"
        >
          <X className="h-5 w-5 text-white" />
        </button>

        {/* Login Form */}
        <div className="pt-4">
          <LoginForm onBackClick={onClose} />
        </div>
      </div>
    </div>
  )
}
