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
                <h1 className="text-3xl font-bold text-gray-900">Notifications</h1>
                <p className="text-gray-600 mt-1">Manage your notification preferences and history</p>
              </div>
            </div>

            <Link
              href="/dashboard/notifications/settings"
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Settings className="h-4 w-4" />
              Notification Settings
            </Link>
          </div>

          {/* Notification Center */}
          <NotificationCenter />
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  )
}