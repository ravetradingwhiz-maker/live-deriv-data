"use client"

import { useState } from "react"
import { MessageCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { LiveChatPopup } from "./live-chat-popup"

export function FloatingContactButtons() {
  const [isChatOpen, setIsChatOpen] = useState(false)

  const handleSupportClick = () => {
    setIsChatOpen(true)
  }

  const handleWhatsAppClick = () => {
    const phoneNumber = "447453756837"
    const message = "Hello, I've seen your trading videos and I'm interested in buying your software and joining your mentorship. What's the price and how do I get started?"
    const encodedMessage = encodeURIComponent(message)
    const whatsappURL = `https://wa.me/${phoneNumber}?text=${encodedMessage}`
    window.open(whatsappURL, "_blank")
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3">
      {/* WhatsApp Button */}
      <Button
        onClick={handleWhatsAppClick}
        className="w-14 h-14 rounded-full bg-[#25D366] hover:bg-[#20BA5A] shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-110 p-0 flex items-center justify-center"
        title="Contact via WhatsApp"
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
