"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { X, ChevronDown } from "lucide-react"

interface TermsConditionsModalProps {
  isOpen: boolean
  onClose: () => void
}

export function TermsConditionsModal({ isOpen, onClose }: TermsConditionsModalProps) {
  const [expandedSection, setExpandedSection] = useState<string | null>(null)

  const sections = [
    {
      id: "acceptance",
      title: "1. Acceptance of Terms",
      content:
        "By accessing and using Live Deriv Data Analysis (LDDA), you accept and agree to be bound by the terms and provision of this agreement. If you do not agree to abide by the above, please do not use this service.",
    },
    {
      id: "use-license",
      title: "2. Use License",
      content:
        "Permission is granted to temporarily download one copy of the materials (information or software) on Live Deriv Data Analysis for personal, non-commercial transitory viewing only. This is the grant of a license, not a transfer of title, and under this license you may not: modify or copy the materials; use the materials for any commercial purpose or for any public display; attempt to decompile or reverse engineer any software contained on LDDA; remove any copyright or other proprietary notations from the materials; or transfer the materials to another person or 'mirror' the materials on any other server.",
    },
    {
      id: "disclaimer",
      title: "3. Disclaimer",
      content:
        "The materials on LDDA are provided on an 'as is' basis. Live Deriv Data Analysis makes no warranties, expressed or implied, and hereby disclaims and negates all other warranties including, without limitation, implied warranties or conditions of merchantability, fitness for a particular purpose, or non-infringement of intellectual property or other violation of rights.",
    },
    {
      id: "trading-risk",
      title: "4. Trading Risk Disclaimer",
      content:
        "LDDA provides analytical tools and signals for informational purposes only. Trading forex, binary options, and other financial instruments involves substantial risk of loss. Past performance is not indicative of future results. Prices and signals can be highly volatile and may move against you rapidly. You should not use LDDA as your sole basis for trading decisions. LDDA is not responsible for any losses incurred as a result of using this platform. Always trade responsibly and within your risk tolerance.",
    },
    {
      id: "no-financial-advice",
      title: "5. No Financial or Investment Advice",
      content:
        "This platform does not provide financial, investment, or trading advice. The information, tools, and signals provided are for informational and educational purposes only. You are solely responsible for making your own investment decisions. We strongly recommend consulting with a qualified financial advisor before making any trading decisions.",
    },
    {
      id: "limitations",
      title: "6. Limitations of Liability",
      content:
        "In no event shall Live Deriv Data Analysis or its suppliers be liable for any damages (including, without limitation, damages for loss of data or profit, or due to business interruption) arising out of the use or inability to use the materials on LDDA, even if LDDA or an authorized representative has been notified orally or in writing of the possibility of such damage.",
    },
    {
      id: "accuracy",
      title: "7. Accuracy of Materials",
      content:
        "The materials appearing on LDDA could include technical, typographical, or photographic errors. LDDA does not warrant that any of the materials on LDDA are accurate, complete, or current. LDDA may make changes to the materials contained on LDDA at any time without notice.",
    },
    {
      id: "materials-links",
      title: "8. Materials and Links",
      content:
        "LDDA has not reviewed all of the sites linked to its website and is not responsible for the contents of any such linked site. The inclusion of any link does not imply endorsement by LDDA of the site. Use of any such linked website is at the user's own risk.",
    },
    {
      id: "modifications",
      title: "9. Modifications",
      content:
        "LDDA may revise these terms of service for its website at any time without notice. By using this website, you are agreeing to be bound by the then current version of these terms of service.",
    },
    {
      id: "governing-law",
      title: "10. Governing Law",
      content:
        "These terms and conditions are governed by and construed in accordance with the laws of the jurisdiction in which LDDA operates, and you irrevocably submit to the exclusive jurisdiction of the courts in that location.",
    },
    {
      id: "user-accounts",
      title: "11. User Accounts and Subscriptions",
      content:
        "When you create an account with LDDA, you must provide accurate, complete, and current information. You are responsible for maintaining the confidentiality of your password and account information. You agree to accept responsibility for all activities that occur under your account. You agree to immediately notify LDDA of any unauthorized use of your account or any other breach of security.",
    },
    {
      id: "termination",
      title: "12. Termination of Service",
      content:
        "LDDA reserves the right to terminate or suspend your account and access to the service at any time, for any reason, without notice or liability. Reasons for termination may include, but are not limited to: violation of these Terms, fraudulent activity, or breach of payment obligations.",
    },
    {
      id: "intellectual-property",
      title: "13. Intellectual Property Rights",
      content:
        "All content on LDDA, including text, graphics, logos, images, and software, is the property of Live Deriv Data Analysis or its content suppliers and is protected by international copyright laws. You may not reproduce, distribute, transmit, modify, or use any of this content without prior written permission from LDDA.",
    },
    {
      id: "third-party",
      title: "14. Third-Party Services",
      content:
        "LDDA may integrate with third-party services and APIs, including Deriv.com. LDDA is not responsible for the availability, accuracy, or functionality of these third-party services. Your use of third-party services is subject to their respective terms of service and privacy policies.",
    },
    {
      id: "contact",
      title: "15. Contact Information",
      content:
        "If you have any questions about these Terms and Conditions, please contact us at cslivederivdataanalysis@gmail.com or through our contact form on the website.",
    },
  ]

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <Card className="w-full max-w-3xl max-h-[90vh] overflow-hidden bg-black/80 backdrop-blur border-slate-700 flex flex-col">
        <CardHeader className="border-b border-slate-700 flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="text-2xl text-white">Terms and Conditions</CardTitle>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <X className="h-5 w-5" />
          </Button>
        </CardHeader>

        <CardContent className="overflow-y-auto flex-1 p-6 space-y-4">
          <p className="text-slate-300 text-sm mb-6">
            Last updated: {new Date().toLocaleDateString()} | Effective Date: January 1, 2025
          </p>

          <div className="space-y-3">
            {sections.map((section) => (
              <div
                key={section.id}
                className="border border-slate-700 rounded-lg overflow-hidden hover:border-blue-500/50 transition-colors"
              >
                <button
                  onClick={() => setExpandedSection(expandedSection === section.id ? null : section.id)}
                  className="w-full flex items-center justify-between p-4 bg-slate-800/50 hover:bg-slate-800 transition-colors text-left"
                >
                  <span className="font-semibold text-white">{section.title}</span>
                  <ChevronDown
                    className={`h-5 w-5 text-slate-400 transition-transform ${
                      expandedSection === section.id ? "rotate-180" : ""
                    }`}
                  />
                </button>

                {expandedSection === section.id && (
                  <div className="p-4 bg-slate-900/50 border-t border-slate-700">
                    <p className="text-slate-300 text-sm leading-relaxed">{section.content}</p>
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-4 mt-6">
            <p className="text-sm text-blue-200">
              <span className="font-semibold">Important:</span> By accessing and using Live Deriv Data Analysis, you
              acknowledge that you have read, understood, and agree to be bound by all the terms and conditions outlined
              above.
            </p>
          </div>
        </CardContent>

        <div className="border-t border-slate-700 p-4 flex gap-3 justify-end bg-slate-800/50">
          <Button
            variant="outline"
            onClick={onClose}
            className="border-slate-600 text-white hover:bg-slate-800 bg-transparent"
          >
            Close
          </Button>
          <Button onClick={onClose} className="bg-blue-600 hover:bg-blue-700 text-white">
            I Agree & Continue
          </Button>
        </div>
      </Card>
    </div>
  )
}
