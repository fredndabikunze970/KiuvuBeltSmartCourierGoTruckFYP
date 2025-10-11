"use client"

import { useState, useEffect } from "react"
import { apiService } from "@/lib/api"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Loader2, Package, Truck, CheckCircle, Clock, TrendingUp, Users } from "lucide-react"
import { useAuth } from "@/hooks/use-auth"

interface Stats {
  total_packages: number
  registered: number
  picked_up: number
  in_transit: number
  out_for_delivery: number
  delivered: number
  cancelled: number
}

export function DashboardStats() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const { user } = useAuth()

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await apiService.getTrackingStats()
        setStats(response.stats)
      } catch (error) {
        console.error("Failed to fetch stats:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
  }, [])

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (!stats) {
    return (
      <div className="text-center p-8">
        <p className="text-muted-foreground">Failed to load statistics</p>
      </div>
    )
  }

  const statCards = [
    {
      title: "Total Packages",
      value: stats.total_packages,
      description: "All packages in system",
      icon: Package,
      color: "text-blue-600",
      bgColor: "bg-blue-100",
    },
    {
      title: "In Transit",
      value: stats.in_transit + stats.out_for_delivery,
      description: "Currently being delivered",
      icon: Truck,
      color: "text-blue-600",
      bgColor: "bg-blue-100",
    },
    {
      title: "Delivered",
      value: stats.delivered,
      description: "Successfully delivered",
      icon: CheckCircle,
      color: "text-green-600",
      bgColor: "bg-green-100",
    },
    {
      title: "Pending",
      value: stats.registered + stats.picked_up,
      description: "Awaiting pickup/transit",
      icon: Clock,
      color: "text-amber-600",
      bgColor: "bg-amber-100",
    },
  ]

  const deliveryRate = stats.total_packages > 0 ? ((stats.delivered / stats.total_packages) * 100).toFixed(1) : "0"

  return (
    <div className="space-y-6">
      {/* Main Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
              <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground">{stat.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Additional Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Delivery Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">{deliveryRate}%</div>
            <p className="text-sm text-muted-foreground">Successful deliveries</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Status Breakdown</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm">Registered</span>
              <Badge variant="outline">{stats.registered}</Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm">Picked Up</span>
              <Badge variant="outline">{stats.picked_up}</Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm">In Transit</span>
              <Badge variant="outline">{stats.in_transit}</Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm">Out for Delivery</span>
              <Badge variant="outline">{stats.out_for_delivery}</Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm">Cancelled</span>
              <Badge variant="outline">{stats.cancelled}</Badge>
            </div>
          </CardContent>
        </Card>

        {user?.role === "admin" && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Quick Actions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-sm text-muted-foreground">Admin functions</p>
              <div className="space-y-1">
                <p className="text-xs">• Manage users</p>
                <p className="text-xs">• View all packages</p>
                <p className="text-xs">• Monitor payments</p>
                <p className="text-xs">• Send notifications</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
