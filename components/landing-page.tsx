"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { TrendingUp, BarChart3, Brain, Bell, CheckCircle2, Target, Gauge, Star } from "lucide-react"
import { TermsConditionsModal } from "@/components/terms-conditions-modal"
import { FloatingContactButtons } from "@/components/floating-contact-buttons"
import Image from "next/image"

interface LandingPageProps {
  onGetStarted: () => void
}

// Real-time reviews data
const REAL_TIME_REVIEWS = [
  {
    id: 1,
    name: "Sarah Johnson",
    role: "Professional Trader",
    avatar: "SJ",
    rating: 5,
    review: "This platform has completely transformed my trading strategy. The AI predictions are incredibly accurate!",
    timestamp: "2 minutes ago",
    verified: true,
  },
  {
    id: 2,
    name: "Michael Chen",
    role: "Day Trader",
    avatar: "MC",
    rating: 5,
    review: "Best trading analysis tool I've ever used. The real-time data and backtesting features are outstanding.",
    timestamp: "5 minutes ago",
    verified: true,
  },
  {
    id: 3,
    name: "Emma Rodriguez",
    role: "Forex Analyst",
    avatar: "ER",
    rating: 4,
    review: "The technical indicators are spot-on. Made my first profitable month using this platform!",
    timestamp: "8 minutes ago",
    verified: true,
  },
  {
    id: 4,
    name: "David Thompson",
    role: "Crypto Trader",
    avatar: "DT",
    rating: 5,
    review: "Incredible accuracy on volatility predictions. The subscription is worth every penny.",
    timestamp: "12 minutes ago",
    verified: true,
  },
  {
    id: 5,
    name: "Lisa Wang",
    role: "Investment Manager",
    avatar: "LW",
    rating: 5,
    review: "Our team has increased profits by 40% since using this platform. Highly recommended!",
    timestamp: "15 minutes ago",
    verified: true,
  },
  {
    id: 6,
    name: "James Miller",
    role: "Swing Trader",
    avatar: "JM",
    rating: 4,
    review: "The backtesting feature helped me refine my strategy. Great platform for serious traders.",
    timestamp: "18 minutes ago",
    verified: true,
  },
  {
    id: 7,
    name: "Angela Brooks",
    role: "Binary Options Trader",
    avatar: "AB",
    rating: 5,
    review: "Absolutely phenomenal! The signal accuracy has improved my trading by 60%. Worth every dollar.",
    timestamp: "22 minutes ago",
    verified: true,
  },
  {
    id: 8,
    name: "Robert Smith",
    role: "Options Trader",
    avatar: "RS",
    rating: 5,
    review: "The real-time alerts saved me from several bad trades. This is professional-grade software.",
    timestamp: "25 minutes ago",
    verified: true,
  },
]

export function LandingPage({ onGetStarted }: LandingPageProps) {
  const [scrolled, setScrolled] = useState(false)
  const [showTerms, setShowTerms] = useState(false)
  const [scrollPosition, setScrollPosition] = useState(0)

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50)
    }

    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  // Auto-scroll reviews carousel
  useEffect(() => {
    const interval = setInterval(() => {
      setScrollPosition((prev) => (prev + 1) % (REAL_TIME_REVIEWS.length * 100))
    }, 50)

    return () => clearInterval(interval)
  }, [])



  const features = [
    {
      icon: BarChart3,
      title: "Real-Time Market Analysis",
      description: "Instantly scan and monitor multiple Deriv markets in real-time with no lag, no guesswork.",
    },
    {
      icon: Brain,
      title: "Smart Signal Engine",
      description: "Advanced pattern recognition powered by live tick data for high-probability trade entries.",
    },
    {
      icon: Target,
      title: "Multi-Strategy Support",
      description: "Trade Matches/Differs, Over/Under, Rise/Fall, and Even/Odd with seamless strategy switching.",
    },
    {
      icon: Bell,
      title: "Live Insights & Alerts",
      description: "Real-time market trends, signal strength, and performance alerts directly on your dashboard.",
    },
    {
      icon: Gauge,
      title: "Easy-to-Use Interface",
      description: "Simple, visual, and efficient dashboard. No coding needed - just plug in and start analyzing.",
    },
    {
      icon: TrendingUp,
      title: "Performance Tracking",
      description: "Real-time win rate, profit stats, and loss recovery tracking for data-driven decisions.",
    },
  ]

  const dashboardComponents = [
    {
      title: "Market Overview",
      description: "Live prices, volatility indices, and top-performing assets",
    },
    {
      title: "Signal Monitor",
      description: "Active trade setups with confidence % and expiry countdown",
    },
    {
      title: "Strategy Selector",
      description: "Choose or customize between Matches/Differs, Over/Under, etc.",
    },
    {
      title: "Performance Tracker",
      description: "Real-time win rate, profit stats, and loss recovery tracking",
    },
    {
      title: "Notifications Panel",
      description: "Smart alerts for upcoming trades, trend changes, and updates",
    },
    {
      title: "User Analytics",
      description: "Personal trade history, success rate, and improvement tips",
    },
  ]

  const benefits = [
    "Professional-grade analytical tool",
    "Data-driven decision making",
    "No gambling, pure trading intelligence",
    "Used by successful traders daily",
    "Proven accuracy and reliability",
    "Limited resale licenses available",
  ]

  return (
    <div className="min-h-screen bg-black/20">
      {/* Navigation */}
      <nav
        className={`fixed top-0 w-full z-40 transition-all duration-300 ${
          scrolled ? "bg-slate-900/90 backdrop-blur-md border-b border-slate-700/50" : "bg-transparent"
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
            <div className="flex items-center justify-between md:justify-start gap-4">
              <div className="flex items-center gap-3">
                <Image
                  src="/deriv-logo.png"
                  alt="Deriv Pro Logo"
                  width={44}
                  height={44}
                  className="rounded-xl flex-shrink-0 shadow-lg shadow-blue-500/10"
                />
                <div className="flex flex-col">
                  <h1 className="text-sm sm:text-base md:text-lg font-extrabold text-white tracking-tight">
                    Live Deriv Data Analysis
                  </h1>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[9px] uppercase tracking-[0.1em] text-slate-400 font-bold">Powered by</span>
                    <Image
                      src="/deriv-powered-by.png"
                      alt="Deriv"
                      width={52}
                      height={12}
                      className="opacity-100 brightness-110 contrast-110 w-10 sm:w-[52px] h-auto"
                    />
                  </div>
                </div>
              </div>

              <div className="md:hidden">
                <a href="https://track.deriv.me/_CNojBBdK_CsUBGj1nD25y2Nd7ZgqdRLk/1/" target="_blank" rel="noopener noreferrer">
                  <Button
                    className="bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/20 rounded-full px-5 py-2 text-xs font-bold"
                  >
                    Sign Up
                  </Button>
                </a>
              </div>
            </div>

            <div className="hidden md:block">
              <a href="https://track.deriv.me/_CNojBBdK_CsUBGj1nD25y2Nd7ZgqdRLk/1/" target="_blank" rel="noopener noreferrer">
                <Button
                  className="bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/20 rounded-full px-8 py-2.5 font-bold transition-all hover:scale-105 active:scale-95"
                >
                  Sign Up
                </Button>
              </a>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4 text-center">
        <div className="max-w-4xl mx-auto space-y-6">
          <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white leading-tight">
            Trade Smarter.{" "}
            <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
              Win Consistently.
            </span>
          </h2>
          <p className="text-lg sm:text-xl text-slate-300 max-w-2xl mx-auto">
            Live Deriv Data Analysis (LDDA) is a professional-grade analytical tool designed for traders who want
            precision and profitability on Deriv.com
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-6">
            <Button size="lg" onClick={onGetStarted} className="bg-blue-600 hover:bg-blue-700 flex-shrink-0">
              Start Trading Now
            </Button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 pt-12 max-w-2xl mx-auto">
            <div className="bg-slate-800/50 backdrop-blur p-4 rounded-lg border border-slate-700">
              <div className="text-2xl font-bold text-blue-400">1.5M+</div>
              <div className="text-sm text-slate-400">Active Traders</div>
            </div>
            <div className="bg-slate-800/50 backdrop-blur p-4 rounded-lg border border-slate-700">
              <div className="text-2xl font-bold text-green-400">95%</div>
              <div className="text-sm text-slate-400">Avg Win Rate</div>
            </div>
            <div className="bg-slate-800/50 backdrop-blur p-4 rounded-lg border border-slate-700">
              <div className="text-2xl font-bold text-purple-400">24/7</div>
              <div className="text-sm text-slate-400">Support</div>
            </div>
          </div>
        </div>
      </section>

      {/* Why Choose LDDA */}
      <section className="py-20 px-4 bg-slate-800/30 backdrop-blur">
        <div className="max-w-6xl mx-auto">
          <h3 className="text-3xl font-bold text-white text-center mb-12">Why Choose Live Deriv Data Analysis?</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, idx) => {
              const Icon = feature.icon
              return (
                <Card key={idx} className="bg-slate-800/50 border-slate-700 hover:border-blue-500 transition-colors">
                  <CardContent className="p-6 space-y-3">
                    <div className="w-12 h-12 bg-blue-600/20 rounded-lg flex items-center justify-center">
                      <Icon className="h-6 w-6 text-blue-400" />
                    </div>
                    <h4 className="text-lg font-semibold text-white">{feature.title}</h4>
                    <p className="text-slate-400 text-sm">{feature.description}</p>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>
      </section>

      {/* Dashboard Components */}
      <section className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <h3 className="text-3xl font-bold text-white text-center mb-4">Key Dashboard Components</h3>
          <p className="text-center text-slate-400 mb-12">Everything you need for professional trading</p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {dashboardComponents.map((component, idx) => (
              <Card key={idx} className="bg-slate-800/50 border-slate-700">
                <CardContent className="p-6 space-y-2">
                  <h4 className="text-white font-semibold flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-green-400" />
                    {component.title}
                  </h4>
                  <p className="text-slate-400 text-sm">{component.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Trade Types */}
      <section className="py-20 px-4 bg-slate-800/30 backdrop-blur">
        <div className="max-w-6xl mx-auto">
          <h3 className="text-3xl font-bold text-white text-center mb-12">Multi-Strategy Support</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {["Matches / Differs", "Over / Under", "Rise / Fall", "Even / Odd"].map((strategy, idx) => (
              <Card key={idx} className="bg-slate-800/50 border-slate-700 hover:border-blue-500 transition-colors">
                <CardContent className="p-6 text-center">
                  <div className="inline-block bg-blue-600/20 p-3 rounded-lg mb-3">
                    <Target className="h-6 w-6 text-blue-400" />
                  </div>
                  <p className="text-white font-semibold">{strategy}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto">
          <h3 className="text-3xl font-bold text-white text-center mb-12">Built for Serious Traders</h3>
          <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-8">
            <p className="text-slate-300 mb-8 leading-relaxed">
              LDDA is not a gambling tool — it's an intelligent trading assistant built for data-driven decision making.
              Our clients use it daily to analyze, predict, and execute high-accuracy trades with professional
              precision.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {benefits.map((benefit, idx) => (
                <div key={idx} className="flex items-center gap-3">
                  <CheckCircle2 className="h-5 w-5 text-green-400 flex-shrink-0" />
                  <span className="text-slate-300">{benefit}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Real-Time Reviews Carousel */}
      <section className="py-20 px-4 bg-slate-800/30 backdrop-blur">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <div className="flex items-center justify-center gap-2 mb-4">
              <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
              <span className="text-red-400 text-sm font-semibold">LIVE</span>
            </div>
            <h3 className="text-3xl font-bold text-white mb-2">Real-Time Trader Reviews</h3>
            <p className="text-slate-400">See what professional traders are saying right now</p>
          </div>

          {/* Horizontal Scrolling Reviews */}
          <div className="relative overflow-hidden">
            <div
              className="flex gap-6 transition-transform duration-75 ease-linear"
              style={{
                transform: `translateX(-${scrollPosition % (REAL_TIME_REVIEWS.length * 400)}px)`,
              }}
            >
              {/* First set of reviews */}
              {REAL_TIME_REVIEWS.map((review, idx) => (
                <div
                  key={`first-${idx}`}
                  className="flex-shrink-0 w-96 bg-slate-800/80 backdrop-blur border border-slate-600 rounded-lg p-6 hover:border-blue-500 transition-colors"
                >
                  <div className="flex items-start gap-4 mb-4">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-semibold flex-shrink-0">
                      {review.avatar}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="text-white font-semibold text-sm truncate">{review.name}</h4>
                        {review.verified && (
                          <div className="bg-green-600 rounded-full w-4 h-4 flex items-center justify-center flex-shrink-0">
                            <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                              <path
                                fillRule="evenodd"
                                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                clipRule="evenodd"
                              />
                            </svg>
                          </div>
                        )}
                      </div>
                      <p className="text-slate-400 text-xs">{review.role}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 mb-3">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={`w-4 h-4 ${i < review.rating ? "text-yellow-400 fill-current" : "text-slate-600"}`}
                      />
                    ))}
                  </div>

                  <p className="text-slate-300 text-sm mb-4 leading-relaxed">"{review.review}"</p>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 text-xs">{review.timestamp}</span>
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  </div>
                </div>
              ))}

              {/* Second set of reviews for seamless loop */}
              {REAL_TIME_REVIEWS.map((review, idx) => (
                <div
                  key={`second-${idx}`}
                  className="flex-shrink-0 w-96 bg-slate-800/80 backdrop-blur border border-slate-600 rounded-lg p-6 hover:border-blue-500 transition-colors"
                >
                  <div className="flex items-start gap-4 mb-4">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-semibold flex-shrink-0">
                      {review.avatar}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="text-white font-semibold text-sm truncate">{review.name}</h4>
                        {review.verified && (
                          <div className="bg-green-600 rounded-full w-4 h-4 flex items-center justify-center flex-shrink-0">
                            <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                              <path
                                fillRule="evenodd"
                                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                clipRule="evenodd"
                              />
                            </svg>
                          </div>
                        )}
                      </div>
                      <p className="text-slate-400 text-xs">{review.role}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 mb-3">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={`w-4 h-4 ${i < review.rating ? "text-yellow-400 fill-current" : "text-slate-600"}`}
                      />
                    ))}
                  </div>

                  <p className="text-slate-300 text-sm mb-4 leading-relaxed">"{review.review}"</p>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 text-xs">{review.timestamp}</span>
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  </div>
                </div>
              ))}
            </div>

            {/* Gradient fade on edges */}
            <div className="absolute left-0 top-0 bottom-0 w-12 bg-gradient-to-r from-slate-900 to-transparent pointer-events-none"></div>
            <div className="absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-slate-900 to-transparent pointer-events-none"></div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto bg-gradient-to-r from-blue-600/20 to-purple-600/20 border border-blue-500/30 rounded-xl p-12 text-center space-y-6">
          <h3 className="text-3xl font-bold text-white">Ready to Trade Smarter?</h3>
          <p className="text-slate-300 max-w-2xl mx-auto">
            Get access to Live Deriv Data Analysis and unlock the data advantage professionals use to stay ahead in the
            market.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-6">
            <a href="https://track.deriv.me/_CNojBBdK_CsUBGj1nD25y2Nd7ZgqdRLk/1/" target="_blank" rel="noopener noreferrer">
              <Button
                size="lg"
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold"
              >
                Sign Up
              </Button>
            </a>
          </div>
          <p className="text-sm text-slate-400 pt-4">Limited resale licenses available — for serious traders only</p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-700 py-12 px-4 bg-slate-900/50">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-8">
            <div className="space-y-4">
              <h4 className="font-semibold text-white">Product</h4>
              <ul className="space-y-2 text-sm text-slate-400">
                <li>
                  <a href="#" className="hover:text-white transition">
                    Features
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition">
                    Pricing
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition">
                    How It Works
                  </a>
                </li>
              </ul>
            </div>
            <div className="space-y-4">
              <h4 className="font-semibold text-white">Resources</h4>
              <ul className="space-y-2 text-sm text-slate-400">
                <li>
                  <a href="#" className="hover:text-white transition">
                    Documentation
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition">
                    Tutorials
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition">
                    Community
                  </a>
                </li>
              </ul>
            </div>
            <div className="space-y-4">
              <h4 className="font-semibold text-white">Company</h4>
              <ul className="space-y-2 text-sm text-slate-400">
                <li>
                  <a href="#" className="hover:text-white transition">
                    About
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition">
                    Blog
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition">
                    Contact
                  </a>
                </li>
              </ul>
            </div>
            <div className="space-y-4">
              <h4 className="font-semibold text-white">Legal</h4>
              <ul className="space-y-2 text-sm text-slate-400">
                <li>
                  <a href="#" className="hover:text-white transition">
                    Privacy
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition">
                    Terms
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition">
                    Disclaimer
                  </a>
                </li>
              </ul>
            </div>
          </div>
          <div className="border-t border-slate-700 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-2">
              <Image src="/deriv-logo.png" alt="Deriv Pro Logo" width={32} height={32} className="rounded-lg" />
              <span className="font-semibold text-xs sm:text-sm md:text-base text-white whitespace-nowrap">
                Live Deriv Data Analysis
              </span>
            </div>
            <p className="text-sm text-slate-400">
              © 2023 All rights reserved. Professional trading tools for serious traders.
            </p>
            <button
              onClick={() => setShowTerms(true)}
              className="text-sm text-slate-400 hover:text-white transition font-medium underline"
            >
              Terms & Conditions
            </button>
          </div>

          {/* Social Media Icons */}
          <div className="border-t border-slate-700 mt-8 pt-8 flex justify-center items-center gap-6">
            {/* Instagram */}
            <a
              href="https://www.instagram.com/livederivdataanalysis?igsh=cjFyMXFsMG1tenFr&utm_source=qr"
              target="_blank"
              rel="noopener noreferrer"
              className="text-slate-400 hover:text-white transition-colors duration-300"
              title="Follow us on Instagram"
            >
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zM5.838 12a6.162 6.162 0 1 1 12.324 0 6.162 6.162 0 0 1-12.324 0zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm4.965-10.322a1.44 1.44 0 1 1 2.881.001 1.44 1.44 0 0 1-2.881-.001z" />
              </svg>
            </a>

            {/* TikTok */}
            <a
              href="https://www.tiktok.com/@livederivdataanalysis?_r=1&_t=ZS-944AzusGu4T"
              target="_blank"
              rel="noopener noreferrer"
              className="text-slate-400 hover:text-white transition-colors duration-300"
              title="Follow us on TikTok"
            >
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.08 1.61 2.89 2.89 0 0 1 3.75-4.33v-3.61a6.47 6.47 0 0 0-5.94 3.75 6.06 6.06 0 0 0 3.56 10.78 6.05 6.05 0 0 0 6.83-5.36V9.5a8.08 8.08 0 0 0 5.08 1.53v-3.42a4.84 4.84 0 0 1-.59-.05z" />
              </svg>
            </a>

            {/* Facebook */}
            <a
              href="https://www.facebook.com/share/16Qev2r9pq/?mibextid=wwXIfr"
              target="_blank"
              rel="noopener noreferrer"
              className="text-slate-400 hover:text-white transition-colors duration-300"
              title="Follow us on Facebook"
            >
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
              </svg>
            </a>

            {/* YouTube */}
            <a
              href="https://youtube.com/@livederivdataanalysis?si=ttgtx_GccwoRroTJ"
              target="_blank"
              rel="noopener noreferrer"
              className="text-slate-400 hover:text-white transition-colors duration-300"
              title="Subscribe on YouTube"
            >
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
              </svg>
            </a>
          </div>
        </div>
      </footer>

      {/* Terms and Conditions Modal */}
      <TermsConditionsModal isOpen={showTerms} onClose={() => setShowTerms(false)} />

      {/* Floating Contact Buttons */}
      <FloatingContactButtons />
    </div>
  )
}
