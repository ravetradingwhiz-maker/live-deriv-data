import type React from "react"
import type { Metadata } from "next"
import { GeistSans } from "geist/font/sans"
import { GeistMono } from "geist/font/mono"
import { DerivConnectionProvider } from "@/components/deriv-connection-provider"
import { ThemeProvider } from "@/components/theme-provider"
import "./globals.css"

export const metadata: Metadata = {
  title: "Live Deriv Data Analysis",
  description: "Live Deriv Data Analysis (LDDA) is a professional-grade analytical tool designed for traders who want precision and profitability on Deriv.com",
  generator: "Netlify",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/favicon.ico" sizes="any" />

        <style
          dangerouslySetInnerHTML={{
            __html: `
              :root {
                --font-sans: ${GeistSans.style.fontFamily};
                --font-mono: ${GeistMono.variable};
              }
            `,
          }}
        />
      </head>
      <body>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <DerivConnectionProvider>{children}</DerivConnectionProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
