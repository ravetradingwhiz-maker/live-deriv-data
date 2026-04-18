"use client"

import { LoginModal } from "@/components/login-modal"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex flex-col">
      {/* Header with back button */}
      <div className="p-4">
        <Link href="/">
          <Button variant="ghost" className="flex items-center gap-2 text-slate-300 hover:text-white">
            <ArrowLeft className="h-4 w-4" />
            Back to Home
          </Button>
        </Link>
      </div>

      {/* Login Modal - Always Open */}
      <div className="flex-1 flex items-center justify-center">
        <LoginModal isOpen={true} onClose={() => {}} />
      </div>
    </div>
  )
}
