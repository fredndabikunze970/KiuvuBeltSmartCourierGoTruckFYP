"use client"

// Payments management page
import { useState, useEffect } from "react"
import { ProtectedRoute } from "@/components/auth/protected-route"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { PaymentConfirmation } from "@/components/payments/payment-confirmation"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"

interface Payment {
  payment_id: string
  package_id: string
  amount: number
  payment_method: string
  payment_status: string
  transaction_reference: string
  created_at: string
  package_details?: {
    sender_name: string
    receiver_name: string
    receiver_phone: string
  }
}

export default function PaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")

  useEffect(() => {
    fetchPayments()
  }, [])

  const fetchPayments = async () => {
    try {
      // Simulate API call with mock data
      const mockPayments: Payment[] = [
        {
          payment_id: "PAY-TEST-001",
          package_id: "PKG-TEST-001",
          amount: 5000,
          payment_method: "mobile_money",
          payment_status: "pending",
          transaction_reference: "MM-001",
          created_at: new Date().toISOString(),
          package_details: {
            sender_name: "John Doe",
            receiver_name: "Jane Smith",
            receiver_phone: "+250788222222",
          },
        },
        {
          payment_id: "PAY-TEST-002",
          package_id: "PKG-TEST-002",
          amount: 3000,
          payment_method: "cash",
          payment_status: "confirmed",
          transaction_reference: "CASH-002",
          created_at: new Date(Date.now() - 86400000).toISOString(),
          package_details: {
            sender_name: "Alice Johnson",
            receiver_name: "Bob Wilson",
            receiver_phone: "+250788444444",
          },
        },
      ]

      setPayments(mockPayments)
    } catch (error) {
      console.error("Failed to fetch payments:", error)
    } finally {
      setLoading(false)
    }
  }

  const handlePaymentConfirmed = (paymentId: string) => {
    setPayments((prev) =>
      prev.map((payment) => (payment.payment_id === paymentId ? { ...payment, payment_status: "confirmed" } : payment)),
    )
  }

  const filteredPayments = payments.filter((payment) => {
    const matchesSearch =
      payment.package_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.payment_id.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === "all" || payment.payment_status === statusFilter
    return matchesSearch && matchesStatus
  })

  const getStatusColor = (status: string) => {
    const colors = {
      pending: "bg-yellow-100 text-yellow-800",
      confirmed: "bg-green-100 text-green-800",
      failed: "bg-red-100 text-red-800",
    }
    return colors[status as keyof typeof colors] || "bg-gray-100 text-gray-800"
  }

  if (loading) {
    return (
      <ProtectedRoute allowedRoles={["admin", "agent"]}>
        <DashboardLayout>
          <div className="space-y-4">
            <div className="animate-pulse space-y-4">
              <div className="h-32 bg-gray-200 rounded-lg"></div>
              <div className="h-48 bg-gray-200 rounded-lg"></div>
            </div>
          </div>
        </DashboardLayout>
      </ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute allowedRoles={["admin", "agent"]}>
      <DashboardLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Payment Management</h1>
            <p className="text-gray-600">Confirm and manage package payments</p>
          </div>

          {/* Payment Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardContent className="p-6">
                <div className="text-2xl font-bold text-kivu-primary">
                  {payments.filter((p) => p.payment_status === "pending").length}
                </div>
                <div className="text-sm text-gray-600">Pending Payments</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="text-2xl font-bold text-green-600">
                  {payments.filter((p) => p.payment_status === "confirmed").length}
                </div>
                <div className="text-sm text-gray-600">Confirmed Payments</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="text-2xl font-bold text-kivu-secondary">
                  {payments
                    .reduce((sum, p) => sum + (p.payment_status === "confirmed" ? p.amount : 0), 0)
                    .toLocaleString()}{" "}
                  RWF
                </div>
                <div className="text-sm text-gray-600">Total Confirmed</div>
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
          <div className="flex gap-4">
            <Input
              placeholder="Search by Package ID or Payment ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-md"
            />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border rounded-md"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="confirmed">Confirmed</option>
              <option value="failed">Failed</option>
            </select>
          </div>

          {/* Payments List */}
          <div className="space-y-4">
            {filteredPayments.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center text-gray-500">
                  No payments found matching your criteria
                </CardContent>
              </Card>
            ) : (
              filteredPayments.map((payment) => (
                <PaymentConfirmation
                  key={payment.payment_id}
                  payment={payment}
                  onPaymentConfirmed={handlePaymentConfirmed}
                />
              ))
            )}
          </div>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  )
}
