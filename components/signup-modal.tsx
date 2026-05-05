'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { X } from 'lucide-react'
import Image from 'next/image'

interface SignUpModalProps {
  isOpen: boolean
  onClose: () => void
}

export function SignUpModal({ isOpen, onClose }: SignUpModalProps) {
  // Handle ESC key press
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
      document.body.style.overflow = 'hidden'
    }

    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = 'unset'
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop overlay */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 transition-opacity duration-300"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Container */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-8">
        <div className="w-full max-w-md md:max-w-lg bg-black/80 backdrop-blur border border-slate-700 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-300">
          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 hover:bg-slate-700 rounded-lg transition-colors text-slate-400 hover:text-white z-10"
            aria-label="Close modal"
          >
            <X className="h-6 w-6" />
          </button>

          {/* Modal Content */}
          <div className="p-8 md:p-12 space-y-6">
            {/* Logo and Title */}
            <div className="flex items-center gap-3 justify-center mb-8">
              <div className="w-12 h-12 bg-red-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg">d</span>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">Live Deriv Data Analysis</h1>
                <p className="text-sm text-slate-400">Professional Trading Platform</p>
              </div>
            </div>

            {/* Welcome Section */}
            <div className="text-center space-y-3 bg-slate-800/30 p-6 rounded-lg border border-slate-700">
              <h2 className="text-2xl font-bold text-white">Welcome</h2>
              <p className="text-slate-300">Sign up with your Deriv account to get started with our professional trading analysis platform.</p>
            </div>

            {/* Main CTA Button */}
            <div className="space-y-4">
              <a
                href="https://track.deriv.com/_CNojBBdK_Cu6tyDIijdDK2Nd7ZgqdRLk/1/"
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full"
              >
                <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 text-lg rounded-lg transition-all hover:shadow-lg hover:shadow-blue-600/50">
                  Sign Up with Deriv
                </Button>
              </a>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-700"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-black/80 text-slate-400">or</span>
                </div>
              </div>

              <Button
                onClick={onClose}
                variant="outline"
                className="w-full border-slate-600 text-white hover:bg-slate-700"
              >
                Continue Browsing
              </Button>
            </div>

            {/* Features List */}
            <div className="space-y-3 text-sm">
              <p className="text-slate-400 font-semibold">Why join us?</p>
              <ul className="space-y-2">
                <li className="flex items-center gap-2 text-slate-300">
                  <div className="w-1.5 h-1.5 bg-cyan-500 rounded-full"></div>
                  Real-time trading data and analysis
                </li>
                <li className="flex items-center gap-2 text-slate-300">
                  <div className="w-1.5 h-1.5 bg-cyan-500 rounded-full"></div>
                  AI-powered predictions
                </li>
                <li className="flex items-center gap-2 text-slate-300">
                  <div className="w-1.5 h-1.5 bg-cyan-500 rounded-full"></div>
                  Professional backtesting tools
                </li>
              </ul>
            </div>

            {/* Footer */}
            <div className="text-center text-xs text-slate-500 pt-4 border-t border-slate-700">
              <p>By signing up, you agree to our Terms & Conditions</p>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
