"use client"

// Notifications management page
import { ProtectedRoute } from "@/components/auth/protected-route"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { NotificationCenter } from "@/components/notifications/notification-center"

export default function NotificationsPage() {
  return (
    <ProtectedRoute allowedRoles={["admin", "agent"]}>
      <DashboardLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Notifications</h1>
            <p className="text-gray-600">Manage SMS notifications and communication</p>
          </div>

          <NotificationCenter />
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  )
}
