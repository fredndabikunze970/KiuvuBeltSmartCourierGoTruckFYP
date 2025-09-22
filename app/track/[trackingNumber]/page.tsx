import { ProtectedRoute } from "@/components/auth/protected-route"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { RealTimeTracker } from "@/components/tracking/real-time-tracker"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Package, MapPin, Clock, User } from "lucide-react"

interface TrackingPageProps {
  params: {
    trackingNumber: string
  }
}

export default function TrackingPage({ params }: TrackingPageProps) {
  const { trackingNumber } = params

  // Mock package data - in real app, this would be fetched from API
  const packageData = {
    tracking_number: trackingNumber,
    sender_name: "John Doe",
    sender_address: "Kigali City Center",
    receiver_name: "Jane Smith",
    receiver_address: "Butare University",
    status: "in_transit",
    package_type: "Documents",
    weight: "0.5kg",
    created_at: new Date().toISOString(),
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "delivered":
        return "bg-green-100 text-green-800"
      case "in_transit":
        return "bg-blue-100 text-blue-800"
      case "out_for_delivery":
        return "bg-orange-100 text-orange-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="container mx-auto py-8 space-y-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Real-time Package Tracking</h1>
            <p className="text-muted-foreground">Live GPS tracking for package {trackingNumber}</p>
          </div>

          {/* Package Information */}
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5 text-primary" />
                Package Details
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Package className="h-4 w-4" />
                    Tracking Number
                  </div>
                  <div className="font-mono font-semibold">{packageData.tracking_number}</div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <User className="h-4 w-4" />
                    Sender
                  </div>
                  <div>
                    <div className="font-medium">{packageData.sender_name}</div>
                    <div className="text-sm text-muted-foreground">{packageData.sender_address}</div>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <MapPin className="h-4 w-4" />
                    Receiver
                  </div>
                  <div>
                    <div className="font-medium">{packageData.receiver_name}</div>
                    <div className="text-sm text-muted-foreground">{packageData.receiver_address}</div>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    Status
                  </div>
                  <Badge className={getStatusColor(packageData.status)}>{packageData.status.replace("_", " ")}</Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Real-time Tracking */}
          <RealTimeTracker trackingNumber={trackingNumber} packageData={packageData} />
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  )
}
