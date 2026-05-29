"use client"

import { useEffect, useRef, useState } from "react"
import { MessageCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { LiveChatPopup } from "./live-chat-popup"
import { useAuth } from "@/contexts/AuthContext"

const TELEGRAM_URL = "https://t.me/live_deriv"
const WHATSAPP_URL = "https://wa.me/61421883113"
const ACCESS_MESSAGE =
  "Hello, I've seen your trading videos and I'm interested in buying your software and joining your mentorship. What's the price and how do I get started?"

export function FloatingContactButtons() {
  const { isAuthenticated } = useAuth()
  const [isChatOpen, setIsChatOpen] = useState(false)
  const [isChooserOpen, setIsChooserOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  // Close the chooser when clicking outside
  useEffect(() => {
    if (!isChooserOpen) return
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsChooserOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [isChooserOpen])

  // Hide both floating circles once the user is logged in.
  if (isAuthenticated) return null

  const handleSupportClick = () => {
    setIsChatOpen(true)
  }

  const handleContactCircleClick = () => {
    setIsChooserOpen(prev => !prev)
  }

  const openTelegram = () => {
    // Pre-fill via ?text= when the client supports it, plus copy to clipboard so
    // the user can paste even if the Telegram client doesn't honour the param.
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(ACCESS_MESSAGE).catch(() => {})
    }
    window.open(`${TELEGRAM_URL}?text=${encodeURIComponent(ACCESS_MESSAGE)}`, "_blank")
    setIsChooserOpen(false)
  }

  const openWhatsApp = () => {
    window.open(`${WHATSAPP_URL}?text=${encodeURIComponent(ACCESS_MESSAGE)}`, "_blank")
    setIsChooserOpen(false)
  }

  return (
    <div ref={containerRef} className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
      {/* Chooser pop-out — appears when the green contact circle is tapped */}
      {isChooserOpen && (
        <div className="flex flex-col items-end gap-2 animate-in fade-in slide-in-from-bottom-2 duration-200">
          {/* Telegram option (blue) */}
          <button
            onClick={openTelegram}
            className="flex items-center gap-2 px-4 h-11 rounded-full bg-[#0088CC] hover:bg-[#0077B5] text-white font-semibold shadow-lg transition-all"
            title="Contact via Telegram"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212-.07-.062-.174-.041-.249-.024-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
            </svg>
            Telegram
          </button>
          {/* WhatsApp option (green) */}
          <button
            onClick={openWhatsApp}
            className="flex items-center gap-2 px-4 h-11 rounded-full bg-[#25D366] hover:bg-[#20BA5A] text-white font-semibold shadow-lg transition-all"
            title="Contact via WhatsApp"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.67-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.076 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0 0 20.464 3.488" />
            </svg>
            WhatsApp
          </button>
        </div>
      )}

      {/* Main green contact circle — opens the TG / WA chooser */}
      <Button
        onClick={handleContactCircleClick}
        className="w-14 h-14 rounded-full bg-[#25D366] hover:bg-[#20BA5A] shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-110 p-0 flex items-center justify-center"
        title="Contact us"
        aria-label="Contact options"
        aria-expanded={isChooserOpen}
      >
        <svg className="h-6 w-6 text-white" viewBox="0 0 24 24" fill="currentColor">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.67-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.076 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421-7.403h-.004a9.87 9.87 0 00-4.855 1.34c-1.487.853-2.753 2.136-3.68 3.737C5.853 10.634 5.273 12.242 5.273 13.9c0 2.694.675 5.193 1.968 7.218l.244.468-1.017 3.718 3.902-1.026.455.182c1.976 1.001 4.04 1.533 6.15 1.533 2.108 0 4.172-.532 6.148-1.533l.455-.182 3.902 1.026-.244-.468C19.012 19.093 19.687 16.594 19.687 13.9c0-1.658-.579-3.266-1.634-4.771-.929-1.601-2.195-2.884-3.682-3.737a9.87 9.87 0 00-4.855-1.34M12 0C5.383 0 0 5.383 0 12s5.383 12 12 12 12-5.383 12-12S18.617 0 12 0z" />
        </svg>
      </Button>

      {/* Support/Chat Button */}
      <Button
        onClick={handleSupportClick}
        className="w-14 h-14 rounded-full bg-white hover:bg-gray-100 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-110 p-0 flex items-center justify-center"
        title="Technical Support"
      >
        <MessageCircle className="h-6 w-6 text-gray-700" />
      </Button>

      {/* Live Chat Pop-up */}
      <LiveChatPopup isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} />
    </div>
  )
}
