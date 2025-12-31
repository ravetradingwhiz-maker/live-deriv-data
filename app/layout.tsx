import type React from "react"
import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import { DerivConnectionProvider } from "@/components/deriv-connection-provider"
import { ThemeProvider } from "@/components/theme-provider"
import { ContextMenuHandler } from "@/components/context-menu-handler"
import "./globals.css"

const geistSans = Geist({ subsets: ["latin"] })
const geistMono = Geist_Mono({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Deriv Pro",
  description: "Professional trading analysis dashboard",
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
      <head>{<link rel="icon" href="/favicon.ico">
</head>
      <body>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <DerivConnectionProvider>
            <ContextMenuHandler />
            {children}
          </DerivConnectionProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
