import type React from "react"
import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import { DerivConnectionProvider } from "@/components/deriv-connection-provider"
import { ThemeProvider } from "@/components/theme-provider"
import { ContextMenuHandler } from "@/components/context-menu-handler"
import { AIParticleNetwork } from "@/components/ai-particle-network"
import "./globals.css"

const geistSans = Geist({ subsets: ["latin"] })
const geistMono = Geist_Mono({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Live Deriv Data Analysis",
  description:
    "A professional-grade analytical tool designed for traders who want precision and profitability on Deriv.com",
  generator: "Netlify",
  icons: {
    icon: "/images/image.png",
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning className={`${geistSans.variable} ${geistMono.variable}`}>
      <head>{/* Font variables are now applied via CSS custom properties */}</head>
      <body className="relative overflow-x-hidden">
        {/* AI Particle Network Background - Deriv Style */}
        <AIParticleNetwork 
          intensity="low" 
          opacity={0.12} 
          color="#00d9d9"
          derivStyle={true}
        />
        
        {/* Main Application Content - z-index ensures it appears above animation */}
        <div className="relative z-10">
          <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
            <DerivConnectionProvider>
              <ContextMenuHandler />
              {children}
            </DerivConnectionProvider>
          </ThemeProvider>
        </div>
      </body>
    </html>
  )
}
