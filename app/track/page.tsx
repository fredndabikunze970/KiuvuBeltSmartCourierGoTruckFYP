import { PackageTracker } from "@/components/tracking/package-tracker"
import { Button } from "@/components/ui/button"
import { Truck } from "lucide-react"
import { Metadata } from "next"
import Link from "next/link"

export const metadata: Metadata = {
  title: "Track Package | KIVU Belt Express",
  description: "Track your package in real-time with live GPS updates and delivery status",
}

export default function TrackPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50/30 flex flex-col">
      {/* Public Header */}
      <header className="bg-white border-b border-gray-200 shadow-sm flex-shrink-0">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-gradient-to-br from-blue-600 to-blue-500 text-white p-2.5 rounded-lg shadow-sm">
                <Truck className="h-6 w-6" />
              </div>
              <div>
                <h1 className="font-bold text-xl text-gray-900">KIVU Belt Express</h1>
                <p className="text-sm text-gray-500 -mt-0.5">Reliable Logistics Solutions</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Link href="/">
                <Button variant="ghost" className="text-gray-600 hover:text-gray-900">
                  Home
                </Button>
              </Link>
              <Link href="/login">
                <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                  Login
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content - Grows to push footer down */}
      <main className="flex-1 w-full">
        <PackageTracker />
      </main>

      {/* Footer - Professional, comes after content */}
      <footer className="bg-white border-t border-gray-200 w-full flex-shrink-0 mt-8">
        <div className="container mx-auto px-4 py-6">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center gap-2 mb-4 md:mb-0">
              <div className="bg-gradient-to-br from-blue-600 to-blue-500 text-white p-1.5 rounded">
                <Truck className="h-4 w-4" />
              </div>
              <span className="font-semibold text-gray-900">KIVU Belt Express</span>
            </div>

            <div className="flex flex-wrap justify-center gap-4 text-sm text-gray-600">
              <Link href="/privacy" className="hover:text-blue-600 transition-colors">
                Privacy Policy
              </Link>
              <Link href="/terms" className="hover:text-blue-600 transition-colors">
                Terms of Service
              </Link>
              <Link href="/support" className="hover:text-blue-600 transition-colors">
                Support
              </Link>
              <Link href="/contact" className="hover:text-blue-600 transition-colors">
                Contact
              </Link>
            </div>

            <div className="mt-4 md:mt-0 text-xs text-gray-500">
              © {new Date().getFullYear()} KIVU Belt Express. All rights reserved.
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}