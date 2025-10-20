"use client"

import { ProtectedRoute } from "@/components/auth/protected-route"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { NotificationCenter } from "@/components/notifications/notification-center"
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Bell, Settings } from "lucide-react"
import Link from "next/link"

export default function NotificationsPage() {
  return (
    <ProtectedRoute allowedRoles={["admin", "agent"]}>
      <DashboardLayout>
        <div className="container mx-auto py-6 space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-lg">
                <Bell className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Notifications
          </h2>
                <p className="text-gray-600 mt-1">Manage your notification preferences and history</p>
              </div>
            </div>

            
          </div>

          {/* Notification Center */}
          <NotificationCenter />
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  )
}