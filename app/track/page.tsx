import { PackageTracker } from "@/components/tracking/package-tracker"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { Metadata } from "next"

export const metadata: Metadata = {
  title: "Track Package | Logistics Dashboard",
  description: "Track your package in real-time with live GPS updates and delivery status",
}

export default function TrackPage() {
  return (
    <DashboardLayout>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50/30">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-12">
              <h1 className="text-4xl font-bold text-gray-900 mb-4">
                Package Tracking
              </h1>
              <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                Track your package in real-time with live GPS updates, delivery status, 
                and estimated arrival times
              </p>
            </div>
            <PackageTracker />
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}