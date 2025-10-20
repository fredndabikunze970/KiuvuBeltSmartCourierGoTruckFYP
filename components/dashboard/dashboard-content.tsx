"use client"

import AgentDashboard from "@/components/dashboard/agent-dashboard"
import { EnhancedDashboardNew } from "@/components/dashboard/enhanced-dashboard-new"
import { useAuth } from "@/hooks/use-auth"

export default function DashboardContent() {
  const { user } = useAuth()

  if (user?.role === 'agent') {
    return <AgentDashboard />
  }

  return <EnhancedDashboardNew />
}
