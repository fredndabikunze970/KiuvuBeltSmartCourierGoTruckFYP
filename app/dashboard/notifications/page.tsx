"use client"

import { ProtectedRoute } from "@/components/auth/protected-route"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { SMSTestingPanel } from "@/components/admin/sms-testing-panel"
import { NotificationCenter } from "@/components/notifications/notification-center"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useAuth } from "@/hooks/use-auth"

export default function NotificationsPage() {
  const { user } = useAuth()

  return (
    <ProtectedRoute allowedRoles={["admin", "agent"]}>
      <DashboardLayout>
        <div className="container mx-auto py-8 space-y-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Notifications & SMS</h1>
            <p className="text-muted-foreground">Manage SMS notifications and communication with customers</p>
          </div>

          <Tabs defaultValue="center" className="space-y-6">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="center">Notification Center</TabsTrigger>
              {user?.role === "admin" && <TabsTrigger value="testing">SMS Testing</TabsTrigger>}
            </TabsList>

            <TabsContent value="center" className="space-y-6">
              <NotificationCenter />
            </TabsContent>

            {user?.role === "admin" && (
              <TabsContent value="testing" className="space-y-6">
                <SMSTestingPanel />
              </TabsContent>
            )}
          </Tabs>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  )
}
