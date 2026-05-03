import type React from "react"
import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import { DerivConnectionProvider } from "@/components/deriv-connection-provider"
import { ThemeProvider } from "@/components/theme-provider"
import { ContextMenuHandler } from "@/components/context-menu-handler"
import { MatrixBackground } from "@/components/matrix-background"
import "./globals.css"
import { AuthProvider } from "@/contexts/AuthContext"

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
    <html lang="en" suppressHydrationWarning className={`${geistSans.className} ${geistMono.className}`}>
      <head>{/* Font variables are now applied via CSS custom properties */}</head>
      <body className="relative w-full min-h-screen overflow-x-hidden bg-black" style={{ margin: 0, padding: 0 }}>
        {/* Matrix Background - full viewport cover with enhanced visibility */}
        <MatrixBackground intensity="high" opacity={0.8} />

        {/* Main Application Content - positioned above matrix with proper layering */}
        <div className="relative z-10">
          <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
            <AuthProvider>
              <DerivConnectionProvider>
                <ContextMenuHandler />
                {children}
              </DerivConnectionProvider>
            </AuthProvider>
          </ThemeProvider>
        </div>
      </body>
    </html>
  )
}
