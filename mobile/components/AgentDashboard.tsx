"use client"

// Agent mobile dashboard component
import { useState, useEffect } from "react"
import { MobileLayout } from "./MobileLayout"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

interface Package {
  package_id: string
  receiver_name: string
  receiver_address: string
  status: string
  delivery_fee: number
  created_at: string
}

export function AgentDashboard() {
  const [packages, setPackages] = useState<Package[]>([])
  const [stats, setStats] = useState({
    today_pickups: 0,
    today_deliveries: 0,
    pending_payments: 0,
    total_earnings: 0,
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchAgentData()
  }, [])

  const fetchAgentData = async () => {
    try {
      // Simulate API calls
      setStats({
        today_pickups: 5,
        today_deliveries: 3,
        pending_payments: 2,
        total_earnings: 45000,
      })

      setPackages([
        {
          package_id: "PKG-TEST-001",
          receiver_name: "Jane Smith",
          receiver_address: "Butare Town",
          status: "in_transit",
          delivery_fee: 5000,
          created_at: new Date().toISOString(),
        },
        {
          package_id: "PKG-TEST-002",
          receiver_name: "Bob Wilson",
          receiver_address: "Remera Office Park",
          status: "picked_up",
          delivery_fee: 3000,
          created_at: new Date().toISOString(),
        },
      ])
    } catch (error) {
      console.error("Failed to fetch agent data:", error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    const colors = {
      registered: "bg-gray-100 text-gray-800",
      picked_up: "bg-blue-100 text-blue-800",
      in_transit: "bg-yellow-100 text-yellow-800",
      out_for_delivery: "bg-orange-100 text-orange-800",
      delivered: "bg-green-100 text-green-800",
      cancelled: "bg-red-100 text-red-800",
    }
    return colors[status as keyof typeof colors] || "bg-gray-100 text-gray-800"
  }

  if (loading) {
    return (
      <MobileLayout title="Agent Dashboard">
        <div className="p-4 space-y-4">
          <div className="animate-pulse space-y-4">
            <div className="h-20 bg-gray-200 rounded-lg"></div>
            <div className="h-20 bg-gray-200 rounded-lg"></div>
            <div className="h-32 bg-gray-200 rounded-lg"></div>
          </div>
        </div>
      </MobileLayout>
    )
  }

  return (
    <MobileLayout title="Agent Dashboard">
      <div className="p-4 space-y-4">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 gap-3">
          <Card>
            <CardContent className="p-3">
              <div className="text-2xl font-bold text-kivu-primary">{stats.today_pickups}</div>
              <div className="text-sm text-gray-600">Today's Pickups</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3">
              <div className="text-2xl font-bold text-green-600">{stats.today_deliveries}</div>
              <div className="text-sm text-gray-600">Today's Deliveries</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3">
              <div className="text-2xl font-bold text-orange-600">{stats.pending_payments}</div>
              <div className="text-sm text-gray-600">Pending Payments</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3">
              <div className="text-2xl font-bold text-kivu-secondary">{stats.total_earnings.toLocaleString()} RWF</div>
              <div className="text-sm text-gray-600">Total Earnings</div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="space-y-2">
          <h3 className="font-semibold text-gray-900">Quick Actions</h3>
          <div className="grid grid-cols-2 gap-2">
            <Button className="bg-kivu-primary hover:bg-kivu-primary/90">Register Package</Button>
            <Button variant="outline">Scan QR Code</Button>
          </div>
        </div>

        {/* Active Packages */}
        <div className="space-y-2">
          <h3 className="font-semibold text-gray-900">Active Packages</h3>
          <div className="space-y-2">
            {packages.map((pkg) => (
              <Card key={pkg.package_id} className="border-l-4 border-l-kivu-primary">
                <CardContent className="p-3">
                  <div className="flex justify-between items-start mb-2">
                    <div className="font-medium text-sm">{pkg.package_id}</div>
                    <Badge className={getStatusColor(pkg.status)}>{pkg.status.replace("_", " ")}</Badge>
                  </div>
                  <div className="text-sm text-gray-600 mb-1">To: {pkg.receiver_name}</div>
                  <div className="text-xs text-gray-500 mb-2">{pkg.receiver_address}</div>
                  <div className="flex justify-between items-center">
                    <div className="text-sm font-medium text-kivu-secondary">
                      {pkg.delivery_fee.toLocaleString()} RWF
                    </div>
                    <Button size="sm" variant="outline">
                      Update Status
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </MobileLayout>
  )
}
