"use client"

// Mobile app demo page
import { useState } from "react"
import { AgentDashboard } from "@/mobile/components/AgentDashboard"
import { PackageRegistrationMobile } from "@/mobile/components/PackageRegistrationMobile"
import { TrackingMobile } from "@/mobile/components/TrackingMobile"
import { Button } from "@/components/ui/button"

export default function MobilePage() {
  const [currentView, setCurrentView] = useState<"menu" | "agent" | "register" | "track">("menu")

  const renderMenu = () => (
    <div className="max-w-sm mx-auto bg-white min-h-screen">
      <div className="bg-kivu-primary text-white p-6 text-center">
        <h1 className="text-2xl font-bold mb-2">Smart Courier Go</h1>
        <p className="text-kivu-primary-foreground/80">Mobile App Demo</p>
      </div>

      <div className="p-6 space-y-4">
        <div className="text-center mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Choose Your Role</h2>
          <p className="text-gray-600">Select how you want to use the app</p>
        </div>

        <div className="space-y-3">
          <Button
            onClick={() => setCurrentView("agent")}
            className="w-full bg-kivu-primary hover:bg-kivu-primary/90 h-12"
          >
            Agent Dashboard
          </Button>

          <Button onClick={() => setCurrentView("register")} variant="outline" className="w-full h-12">
            Register Package
          </Button>

          <Button onClick={() => setCurrentView("track")} variant="outline" className="w-full h-12">
            Track Package
          </Button>
        </div>

        <div className="mt-8 p-4 bg-gray-50 rounded-lg">
          <h3 className="font-semibold text-gray-900 mb-2">Demo Features</h3>
          <ul className="text-sm text-gray-600 space-y-1">
            <li>• Agent dashboard with stats</li>
            <li>• Multi-step package registration</li>
            <li>• Real-time package tracking</li>
            <li>• GPS location updates</li>
            <li>• Mobile-optimized interface</li>
          </ul>
        </div>
      </div>
    </div>
  )

  if (currentView === "menu") return renderMenu()
  if (currentView === "agent") return <AgentDashboard />
  if (currentView === "register") return <PackageRegistrationMobile />
  if (currentView === "track") return <TrackingMobile />

  return null
}
