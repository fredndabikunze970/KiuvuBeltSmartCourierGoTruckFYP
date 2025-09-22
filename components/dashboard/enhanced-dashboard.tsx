"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { LeafletMap } from "@/components/maps/leaflet-map"
import { StatsCards } from "./stats-cards"
import { Package, MapPin, TrendingUp, Clock, Users, Truck } from "lucide-react"
import { useAuth } from "@/hooks/use-auth"

interface DashboardData {
  stats: {
    totalPackages: number
    inTransit: number
    delivered: number
    pending: number
  }
  recentPackages: Array<{
    id: string
    tracking_number: string
    receiver_name: string
    status: string
    location: [number, number]
    created_at: string
  }>
  deliveryRate: number
  activeRoutes: number
}

export function EnhancedDashboard() {
  const { user } = useAuth()
  const [dashboardData, setDashboardData] = useState<DashboardData>({
    stats: {
      totalPackages: 0,
      inTransit: 0,
      delivered: 0,
      pending: 0,
    },
    recentPackages: [],
    deliveryRate: 0,
    activeRoutes: 0,
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Simulate API call
    setTimeout(() => {
      setDashboardData({
        stats: {
          totalPackages: 1247,
          inTransit: 89,
          delivered: 1098,
          pending: 60,
        },
        recentPackages: [
          {
            id: "1",
            tracking_number: "KB202501001",
            receiver_name: "Jean Baptiste",
            status: "in_transit",
            location: [-1.9441, 30.0619], // Kigali
            created_at: new Date().toISOString(),
          },
          {
            id: "2",
            tracking_number: "KB202501002",
            receiver_name: "Marie Claire",
            status: "out_for_delivery",
            location: [-2.6189, 29.7378], // Butare
            created_at: new Date().toISOString(),
          },
        ],
        deliveryRate: 88.2,
        activeRoutes: 12,
      })
      setLoading(false)
    }, 1000)
  }, [])

  const mapMarkers = dashboardData.recentPackages.map((pkg) => ({
    position: pkg.location as [number, number],
    popup: `${pkg.tracking_number} - ${pkg.receiver_name}`,
    isActive: pkg.status === "in_transit",
  }))

  if (loading) {
    return (
      <div className="container mx-auto py-8 space-y-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-muted rounded w-1/3"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-muted rounded-lg"></div>
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="h-96 bg-muted rounded-lg"></div>
            <div className="h-96 bg-muted rounded-lg"></div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col space-y-2">
        <h1 className="text-3xl font-bold text-foreground">Dashboard Overview</h1>
        <p className="text-muted-foreground">Real-time insights into your courier operations across Rwanda</p>
      </div>

      {/* Stats Cards */}
      <StatsCards stats={dashboardData.stats} />

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Real-time Map */}
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-primary" />
              Live Package Tracking
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80 rounded-lg overflow-hidden">
              <LeafletMap
                center={[-1.9441, 30.0619]} // Kigali center
                zoom={10}
                markers={mapMarkers}
                className="w-full h-full"
              />
            </div>
            <div className="mt-4 flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{dashboardData.stats.inTransit} packages in transit</span>
              <Badge variant="secondary" className="bg-secondary/10 text-secondary">
                {dashboardData.activeRoutes} active routes
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Performance Metrics */}
        <div className="space-y-6">
          {/* Delivery Rate */}
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-green-600" />
                Delivery Performance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">Success Rate</span>
                    <span className="text-2xl font-bold text-green-600">{dashboardData.deliveryRate}%</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div
                      className="bg-green-600 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${dashboardData.deliveryRate}%` }}
                    ></div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 pt-4">
                  <div className="text-center">
                    <div className="text-lg font-bold text-foreground">{dashboardData.stats.delivered}</div>
                    <div className="text-xs text-muted-foreground">Delivered</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-foreground">{dashboardData.stats.totalPackages}</div>
                    <div className="text-xs text-muted-foreground">Total</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-primary" />
                Quick Actions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-3">
                <Button className="w-full justify-start bg-transparent" variant="outline">
                  <Package className="mr-2 h-4 w-4" />
                  Register New Package
                </Button>
                <Button className="w-full justify-start bg-transparent" variant="outline">
                  <Truck className="mr-2 h-4 w-4" />
                  Track Package
                </Button>
                {user?.role === "admin" && (
                  <Button className="w-full justify-start bg-transparent" variant="outline">
                    <Users className="mr-2 h-4 w-4" />
                    Manage Users
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Recent Activity */}
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle>Recent Package Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {dashboardData.recentPackages.map((pkg) => (
              <div key={pkg.id} className="flex items-center justify-between p-4 rounded-lg bg-card">
                <div className="flex items-center gap-4">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Package className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">{pkg.tracking_number}</p>
                    <p className="text-sm text-muted-foreground">To: {pkg.receiver_name}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge
                    variant="secondary"
                    className={
                      pkg.status === "delivered"
                        ? "bg-green-100 text-green-800"
                        : pkg.status === "in_transit"
                          ? "bg-blue-100 text-blue-800"
                          : "bg-orange-100 text-orange-800"
                    }
                  >
                    {pkg.status.replace("_", " ")}
                  </Badge>
                  <Button variant="ghost" size="sm">
                    View Details
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
