'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Mail, Clock, Shield, Send, CheckCircle2 } from 'lucide-react'

export function ContactSupport() {
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsLoading(true)
    
    // Simulate form submission (Netlify will handle the actual submission)
    setTimeout(() => {
      setIsSubmitted(true)
      setIsLoading(false)
      // Reset form after 3 seconds
      setTimeout(() => {
        setIsSubmitted(false)
        ;(e.target as HTMLFormElement).reset()
      }, 3000)
    }, 800)
  }

  return (
    <div className="min-h-screen bg-black/20 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">Contact Support</h1>
          <p className="text-slate-300 text-lg">
            Have questions? Our support team is here to help you succeed.
          </p>
        </div>

        {/* Support Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {/* Email Card */}
          <Card className="bg-black/80 backdrop-blur border-slate-700 hover:border-cyan-500 transition-colors">
            <CardHeader className="text-center">
              <Mail className="h-8 w-8 text-cyan-500 mx-auto mb-2" />
              <CardTitle className="text-white">Email</CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-slate-300 mb-2">support@livederivdataanalysis.com</p>
              <p className="text-sm text-slate-400">Direct email support</p>
            </CardContent>
          </Card>

          {/* Response Time Card */}
          <Card className="bg-black/80 backdrop-blur border-slate-700 hover:border-cyan-500 transition-colors">
            <CardHeader className="text-center">
              <Clock className="h-8 w-8 text-cyan-500 mx-auto mb-2" />
              <CardTitle className="text-white">Response Time</CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-slate-300 mb-2">Within 24 hours</p>
              <p className="text-sm text-slate-400">Quick and reliable support</p>
            </CardContent>
          </Card>

          {/* Availability Card */}
          <Card className="bg-black/80 backdrop-blur border-slate-700 hover:border-cyan-500 transition-colors">
            <CardHeader className="text-center">
              <Shield className="h-8 w-8 text-cyan-500 mx-auto mb-2" />
              <CardTitle className="text-white">Availability</CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-slate-300 mb-2">24/7 Support</p>
              <p className="text-sm text-slate-400">Always available for you</p>
            </CardContent>
          </Card>
        </div>

        {/* Contact Form */}
        <Card className="bg-black/80 backdrop-blur border-slate-700">
          <CardHeader>
            <CardTitle className="text-white">Send us a Message</CardTitle>
          </CardHeader>
          <CardContent>
            {isSubmitted ? (
              <div className="text-center py-12">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-green-500/20 rounded-full mb-4">
                  <CheckCircle2 className="h-8 w-8 text-green-500" />
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">Message Sent Successfully!</h3>
                <p className="text-slate-400">
                  Your message has been sent successfully. Our support team will respond shortly.
                </p>
              </div>
            ) : (
              <form
                name="contact"
                method="POST"
                data-netlify="true"
                onSubmit={handleSubmit}
                className="space-y-6"
              >
                <input type="hidden" name="form-name" value="contact" />

                {/* Full Name */}
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-slate-300">
                    Full Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="name"
                    name="name"
                    type="text"
                    required
                    placeholder="Enter your full name"
                    className="bg-slate-800/50 border-slate-600 text-white placeholder:text-slate-500 focus:border-cyan-500 focus:ring-cyan-500"
                  />
                </div>

                {/* Email */}
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-slate-300">
                    Email Address <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    required
                    placeholder="your.email@example.com"
                    className="bg-slate-800/50 border-slate-600 text-white placeholder:text-slate-500 focus:border-cyan-500 focus:ring-cyan-500"
                  />
                </div>

                {/* Subject */}
                <div className="space-y-2">
                  <Label htmlFor="subject" className="text-slate-300">
                    Subject <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="subject"
                    name="subject"
                    type="text"
                    required
                    placeholder="How can we help?"
                    className="bg-slate-800/50 border-slate-600 text-white placeholder:text-slate-500 focus:border-cyan-500 focus:ring-cyan-500"
                  />
                </div>

                {/* Message */}
                <div className="space-y-2">
                  <Label htmlFor="message" className="text-slate-300">
                    Message <span className="text-red-500">*</span>
                  </Label>
                  <textarea
                    id="message"
                    name="message"
                    required
                    rows={6}
                    placeholder="Tell us more about your inquiry..."
                    className="w-full bg-slate-800/50 border border-slate-600 text-white placeholder:text-slate-500 rounded-md px-4 py-2 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none resize-none"
                  />
                </div>

                {/* Submit Button */}
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-cyan-600 hover:bg-cyan-700 text-white font-semibold py-2 rounded-md transition-all duration-300 flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4" />
                      Send Message
                    </>
                  )}
                </Button>

                {/* Disclaimer */}
                <p className="text-xs text-slate-500 text-center">
                  We respect your privacy. Your information will only be used to respond to your inquiry.
                </p>
              </form>
            )}
          </CardContent>
        </Card>

        {/* FAQ Section */}
        <div className="mt-12">
          <h2 className="text-2xl font-bold text-white mb-6">Frequently Asked Questions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[
              {
                q: "What is the typical response time?",
                a: "We aim to respond to all inquiries within 24 hours during business hours.",
              },
              {
                q: "How can I reset my password?",
                a: "Click 'Forgot Password' on the login page to reset your access code.",
              },
              {
                q: "Do you offer technical support?",
                a: "Yes, our team provides full technical support for all features and integrations.",
              },
              {
                q: "Can I upgrade my plan anytime?",
                a: "Yes, you can upgrade or downgrade your subscription plan at any time.",
              },
            ].map((faq, index) => (
              <Card key={index} className="bg-black/50 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-white text-base">{faq.q}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-slate-300 text-sm">{faq.a}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
