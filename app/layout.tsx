import type React from "react"
import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import { DerivConnectionProvider } from "@/components/deriv-connection-provider"
import { ThemeProvider } from "@/components/theme-provider"
import "./globals.css"

const geistSans = Geist({ subsets: ["latin"] })
const geistMono = Geist_Mono({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Live Deriv Data Analysis",
  description: "Live Deriv Data Analysis (LDDA) is a professional-grade analytical tool designed for traders who want precision and profitability on Deriv.com",
  generator: "Netlify",
  icons: {
    icon: "/favicon.ico",
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
      <body>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <DerivConnectionProvider>{children}</DerivConnectionProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
