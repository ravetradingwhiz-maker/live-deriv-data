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

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3">
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
