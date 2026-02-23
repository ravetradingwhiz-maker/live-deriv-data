'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ContactSupport } from '@/components/contact-support'
import { Button } from '@/components/ui/button'
import { ChevronLeft } from 'lucide-react'

export default function ContactPage() {
  const router = useRouter()

  return (
    <div className="min-h-screen bg-black/20">
      {/* Back Button Header */}
      <div className="border-b border-slate-700 bg-black/40 backdrop-blur sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <Button
            onClick={() => router.back()}
            variant="ghost"
            className="text-slate-300 hover:text-white flex items-center gap-2"
          >
            <ChevronLeft className="h-4 w-4" />
            Back
          </Button>
        </div>
      </div>

      {/* Contact Support Component */}
      <ContactSupport />
    </div>
  )
}
