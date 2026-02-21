"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { X, Send, Home, MessageSquare, ExternalLink, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { useAuth } from "@/contexts/auth-context"
import { cn } from "@/lib/utils"

interface Message {
  id: string
  text: string
  sender: "user" | "agent"
  timestamp: Date
}

export function LiveChatPopup({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { user } = useAuth()
  const [view, setView] = useState<"home" | "chat">("home")
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      text: "Hello! How can we help you today?",
      sender: "agent",
      timestamp: new Date(),
    },
  ])
  const [inputValue, setInputValue] = useState("")
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault()
    if (!inputValue.trim()) return

    const newMessage: Message = {
      id: Date.now().toString(),
      text: inputValue,
      sender: "user",
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, newMessage])
    setInputValue("")

    // Simulate agent response
    setTimeout(() => {
      const response: Message = {
        id: (Date.now() + 1).toString(),
        text: "Thanks for your message. One of our agents will be with you shortly.",
        sender: "agent",
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, response])
    }, 1500)
  }

  if (!isOpen) return null

  return (
    <div className="fixed bottom-24 right-6 z-[60] w-[360px] max-w-[90vw] overflow-hidden rounded-2xl bg-black/80 backdrop-blur shadow-2xl transition-all animate-in slide-in-from-bottom-5 duration-300">
      {/* Header */}
      <div className="relative bg-[#FF444F] p-6 pb-12">
        <div className="flex items-center justify-between">
          <img src="/deriv-logo.png" alt="Deriv" className="h-6 brightness-0 invert" />
          <div className="flex items-center gap--2">
            <div className="flex -space-x-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-8 w-8 rounded-full border-2 border-[#FF444F] bg-gray-200 overflow-hidden">
                  <img
                    src={`/agent-.jpg?height=32&width=32&query=agent-${i}`}
                    alt="Agent"
                    className="h-full w-full object-cover"
                  />
                </div>
              ))}
            </div>
            <button onClick={onClose} className="ml-2 rounded-full p-1 text-white hover:bg-white/20">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="mt-8 text-white">
          <h2 className="text-2xl font-bold leading-tight">
            Hi {user?.username || "there"} 👋
            <br />
            How can we help?
          </h2>
        </div>

        {/* Decorative white-to-transparent fade */}
        <div className="absolute bottom-0 left-0 h-16 w-full bg-gradient-to-t from-white to-transparent" />
      </div>

      {/* Content Area */}
      <div
        className="relative -mt-6 h-[400px] overflow-y-auto bg-black/60 px-4 pb-16 pt-2 custom-scrollbar"
        ref={scrollRef}
      >
        {view === "home" ? (
          <div className="flex flex-col gap-4">
            {/* Recent Message Card */}
            <Card className="cursor-pointer border-gray-100 p-4 transition-colors hover:bg-gray-50 shadow-sm">
              <div className="mb-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">Recent message</div>
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 flex-shrink-0 rounded-full bg-gray-100 overflow-hidden">
                  <img src="/agents.jpg" alt="Agents" />
                </div>
                <div className="flex-1 overflow-hidden">
                  <div className="truncate text-sm font-medium text-gray-900">
                    Tell us your trading experience level s...
                  </div>
                  <div className="text-xs text-gray-400">Deriv • 22m</div>
                </div>
                <ArrowRight className="h-4 w-4 text-gray-300" />
              </div>
            </Card>

            {/* Send Message Button */}
            <Button
              onClick={() => setView("chat")}
              className="flex w-full items-center justify-between rounded-xl border border-gray-100 bg-white py-6 text-gray-900 shadow-sm hover:bg-gray-50 hover:shadow-md transition-all group"
              variant="outline"
            >
              <span className="font-semibold">Send us a message</span>
              <Send className="h-5 w-5 text-[#FF444F] group-hover:translate-x-1 transition-transform" />
            </Button>

            {/* Links List */}
            <div className="rounded-xl border border-gray-100 bg-white shadow-sm overflow-hidden">
              {[
                { label: "Help Centre", href: "https://deriv.com/help-centre" },
                { label: "Deriv Blog", href: "https://deriv.com/blog" },
                { label: "Deriv YouTube", href: "https://youtube.com/deriv" },
              ].map((link, idx) => (
                <a
                  key={idx}
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cn(
                    "flex items-center justify-between px-4 py-3.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors",
                    idx !== 2 && "border-bottom border-gray-50",
                  )}
                >
                  {link.label}
                  <ExternalLink className="h-4 w-4 text-gray-400" />
                </a>
              ))}
            </div>

            {/* Bottom Support Graphics */}
            <div className="mt-4 flex flex-col items-center justify-center p-4 text-center">
              <div className="h-24 w-24 opacity-20 mb-2">
                <svg viewBox="0 0 100 100" fill="currentColor">
                  <path d="M50 20C30 20 15 35 15 55c0 20 35 25 35 25s35-5 35-25c0-20-15-35-35-35zm0 50c-8 0-15-7-15-15s7-15 15-15 15 7 15 15-7 15-15 15z" />
                  <path d="M50 45a5 5 0 100 10 5 5 0 000-10z" />
                </svg>
              </div>
              <p className="text-xs text-gray-400">Security and privacy are our top priorities.</p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <button
              onClick={() => setView("home")}
              className="mb-2 text-xs font-semibold text-[#FF444F] hover:underline"
            >
              ← Back to Home
            </button>
            <div className="flex flex-col gap-3">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={cn(
                    "max-w-[85%] rounded-2xl px-4 py-2 text-sm",
                    msg.sender === "user"
                      ? "ml-auto bg-[#FF444F] text-white rounded-br-none"
                      : "mr-auto bg-gray-100 text-gray-800 rounded-bl-none",
                  )}
                >
                  {msg.text}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Input / Navigation Bar */}
      {view === "chat" ? (
        <form
          onSubmit={handleSendMessage}
          className="absolute bottom-0 left-0 flex w-full items-center gap-2 border-t bg-black/60 p-3"
        >
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Type your message..."
            className="flex-1 rounded-full border border-gray-200 px-4 py-2 text-sm focus:border-[#FF444F] focus:outline-none"
          />
          <Button type="submit" size="icon" className="h-9 w-9 rounded-full bg-[#FF444F]">
            <Send className="h-4 w-4" />
          </Button>
        </form>
      ) : (
        <div className="absolute bottom-0 left-0 flex w-full border-t bg-black/60">
          <button
            onClick={() => setView("home")}
            className={cn(
              "flex flex-1 flex-col items-center justify-center gap-1 py-3 transition-colors",
              view === "home" ? "text-gray-900 font-bold" : "text-gray-400 hover:text-gray-600",
            )}
          >
            <Home className="h-5 w-5" />
            <span className="text-[10px]">Home</span>
          </button>
          <button
            onClick={() => setView("chat")}
            className={cn(
              "relative flex flex-1 flex-col items-center justify-center gap-1 py-3 transition-colors",
              view === "chat" ? "text-gray-900 font-bold" : "text-gray-400 hover:text-gray-600",
            )}
          >
            <MessageSquare className="h-5 w-5" />
            <span className="text-[10px]">Messages</span>
            <div className="absolute top-2 right-[30%] flex h-4 w-4 items-center justify-center rounded-full bg-[#FF444F] text-[10px] font-bold text-white shadow-sm ring-2 ring-white">
              2
            </div>
          </button>
        </div>
      )}
    </div>
  )
}
