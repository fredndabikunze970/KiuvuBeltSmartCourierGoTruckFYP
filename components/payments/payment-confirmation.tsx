"use client"

// Payments management page
import { ProtectedRoute } from "@/components/auth/protected-route"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { authService } from "@/lib/auth"
import {
  Building,
  CheckCircle,
  Clock,
  CreditCard,
  DollarSign,
  Download,
  Filter,
  MoreVertical,
  Search,
  Smartphone,
  User,
  XCircle
} from "lucide-react"
import { useEffect, useState } from "react"

interface Payment {
  payment_id: string
  package_id: string
  amount: number
  payment_method: string
  payment_status: "pending" | "confirmed" | "failed"
  transaction_reference: string
  created_at: string
  confirmed_at?: string
  notes?: string
  confirmed_by?: string
  sender_name?: string
  sender_phone?: string
  receiver_name?: string
  receiver_phone?: string
}

interface PaginationState {
  page: number
  limit: number
  total: number
  pages: number
}

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => {
      clearTimeout(handler)
    }
  }, [value, delay])

  return debouncedValue
}

export default function PaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const debouncedSearchTerm = useDebounce(searchTerm, 500)
  const [statusFilter, setStatusFilter] = useState("all")
  const [pagination, setPagination] = useState<PaginationState>({
    page: 1,
    limit: 10,
    total: 0,
    pages: 0,
  })

  // Modal states
  const [confirmModalOpen, setConfirmModalOpen] = useState(false)
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null)
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>("")
  const [isConfirming, setIsConfirming] = useState(false)
  const [transactionReference, setTransactionReference] = useState("")
  const [notes, setNotes] = useState("")

  const paymentMethods = [
    { id: "momo", name: "Mobile Money", icon: Smartphone, description: "MTN, Airtel, or other mobile money" },
    { id: "card", name: "Credit/Debit Card", icon: CreditCard, description: "Visa, MasterCard, or other cards" },
    { id: "bank", name: "Bank Transfer", icon: Building, description: "Direct bank transfer or wire" },
    { id: "cash", name: "Cash Payment", icon: DollarSign, description: "Physical cash payment" },
  ]

  useEffect(() => {
    if (!authService.isAuthenticated()) {
      console.error("User is not authenticated")
      return
    }

    setPagination(prev => ({ ...prev, page: 1 }))
    fetchPayments()
  }, [statusFilter, debouncedSearchTerm])

  useEffect(() => {
    if (authService.isAuthenticated()) {
      fetchPayments()
    }
  }, [pagination.page])

  const fetchPayments = async () => {
    try {
      setLoading(true)
      const queryParams = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
      })

      if (statusFilter !== "all") {
        queryParams.append("status", statusFilter)
      }

      if (searchTerm && searchTerm.match(/^PKG-/)) {
        queryParams.append("packageId", searchTerm)
      }

      const response = await fetch(`/api/payments?${queryParams}`, {
        headers: {
          ...authService.getAuthHeaders(),
          "Content-Type": "application/json",
        },
      })
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to fetch payments")
      }

      const data = await response.json()
      setPayments(data.payments)
      setPagination(data.pagination)
    } catch (error) {
      console.error("Failed to fetch payments:", error)
    } finally {
      setLoading(false)
    }
  }

  const openConfirmModal = (payment: Payment) => {
    setSelectedPayment(payment)
    setSelectedPaymentMethod(payment.payment_method || "")
    setTransactionReference("")
    setNotes("")
    setConfirmModalOpen(true)
  }

  const closeConfirmModal = () => {
    setConfirmModalOpen(false)
    setSelectedPayment(null)
    setSelectedPaymentMethod("")
    setTransactionReference("")
    setNotes("")
    setIsConfirming(false)
  }

  const handleConfirmPayment = async () => {
    if (!selectedPayment || !selectedPaymentMethod) return

    try {
      setIsConfirming(true)

      if (!transactionReference.trim()) {
        alert('Transaction reference is required')
        setIsConfirming(false)
        return
      }

      const response = await fetch(`/api/payments/${selectedPayment.payment_id}/confirm`, {
        method: 'POST',
        headers: {
          ...authService.getAuthHeaders(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          payment_method: selectedPaymentMethod,
          transaction_reference: transactionReference.trim(),
          notes: notes.trim() || undefined,
          confirmed_by: authService.getCurrentUser()?.id
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to confirm payment')
      }

      const result = await response.json()

      // Update the payment status locally with the data from the API response
      setPayments(prev =>
        prev.map(payment =>
          payment.payment_id === selectedPayment.payment_id
            ? {
              ...payment,
              payment_status: 'confirmed',
              payment_method: selectedPaymentMethod,
              transaction_reference: transactionReference.trim(),
              confirmed_at: new Date().toISOString(),
              notes: notes.trim() || payment.notes,
              confirmed_by: authService.getCurrentUser()?.id
            }
            : payment
        )
      )

      closeConfirmModal()

      // Show success message
      alert('Payment confirmed successfully!')
    } catch (error) {
      console.error('Error confirming payment:', error)
      alert(error instanceof Error ? error.message : 'Failed to confirm payment. Please try again.')
    } finally {
      setIsConfirming(false)
    }
  }

  const getStatusVariant = (status: Payment["payment_status"]) => {
    switch (status) {
      case 'confirmed':
        return 'success'
      case 'pending':
        return 'warning'
      case 'failed':
        return 'destructive'
      default:
        return 'secondary'
    }
  }

  const getStatusIcon = (status: Payment["payment_status"]) => {
    switch (status) {
      case 'confirmed':
        return <CheckCircle className="w-4 h-4" />
      case 'pending':
        return <Clock className="w-4 h-4" />
      case 'failed':
        return <XCircle className="w-4 h-4" />
      default:
        return <Clock className="w-4 h-4" />
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-RW', {
      style: 'currency',
      currency: 'RWF',
      minimumFractionDigits: 0,
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (loading) {
    return (
      <ProtectedRoute allowedRoles={["admin", "agent"]}>
        <DashboardLayout>
          <div className="space-y-6">
            <div className="animate-pulse space-y-6">
              <div className="h-8 bg-gray-200 rounded w-1/4"></div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-32 bg-gray-200 rounded-lg"></div>
                ))}
              </div>
              <div className="h-64 bg-gray-200 rounded-lg"></div>
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
          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Payment Management</h1>
              <p className="text-gray-600 mt-1">Manage and confirm package payments</p>
            </div>
            <Button className="flex items-center gap-2">
              <Download className="w-4 h-4" />
              Export Report
            </Button>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-blue-600">Total Payments</p>
                    <p className="text-2xl font-bold text-blue-900 mt-1">
                      {payments.length}
                    </p>
                  </div>
                  <div className="p-3 bg-blue-100 rounded-full">
                    <DollarSign className="w-6 h-6 text-blue-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-yellow-50 to-yellow-100 border-yellow-200">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-yellow-600">Pending</p>
                    <p className="text-2xl font-bold text-yellow-900 mt-1">
                      {payments.filter(p => p.payment_status === 'pending').length}
                    </p>
                  </div>
                  <div className="p-3 bg-yellow-100 rounded-full">
                    <Clock className="w-6 h-6 text-yellow-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-green-600">Confirmed</p>
                    <p className="text-2xl font-bold text-green-900 mt-1">
                      {payments.filter(p => p.payment_status === 'confirmed').length}
                    </p>
                  </div>
                  <div className="p-3 bg-green-100 rounded-full">
                    <CheckCircle className="w-6 h-6 text-green-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-red-600">Total Amount</p>
                    <p className="text-2xl font-bold text-red-900 mt-1">
                      {formatCurrency(
                        payments.reduce((sum, p) => sum + (p.payment_status === 'confirmed' ? p.amount : 0), 0)
                      )}
                    </p>
                  </div>
                  <div className="p-3 bg-red-100 rounded-full">
                    <DollarSign className="w-6 h-6 text-red-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Filters and Search */}
          <Card>
            <CardContent className="p-6">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    placeholder="Search by Package ID, Payment ID, or Reference..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 pr-4 py-2 w-full"
                  />
                </div>
                <div className="flex gap-3">
                  <div className="flex items-center gap-2 px-3 py-2 border rounded-md">
                    <Filter className="w-4 h-4 text-gray-400" />
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className="bg-transparent border-none outline-none text-sm"
                      aria-label="Filter payments by status"
                      title="Payment status filter"
                    >
                      <option value="all">All Status</option>
                      <option value="pending">Pending</option>
                      <option value="confirmed">Confirmed</option>
                      <option value="failed">Failed</option>
                    </select>
                  </div>
                  <Button variant="outline" onClick={fetchPayments}>
                    Refresh
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Payments Table */}
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-gray-50">
                      <th className="text-left p-4 font-medium text-gray-600">Payment Details</th>
                      <th className="text-left p-4 font-medium text-gray-600">Package & Sender</th>
                      <th className="text-left p-4 font-medium text-gray-600">Receiver</th>
                      <th className="text-left p-4 font-medium text-gray-600">Status</th>
                      <th className="text-left p-4 font-medium text-gray-600">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="p-8 text-center text-gray-500">
                          No payments found matching your criteria
                        </td>
                      </tr>
                    ) : (
                      payments.map((payment) => (
                        <tr key={payment.payment_id} className="border-b hover:bg-gray-50">
                          <td className="p-4">
                            <div className="space-y-2">
                              <div>
                                <p className="font-medium text-gray-900">{payment.payment_id}</p>
                                <p className="text-sm text-gray-500">Ref: {payment.transaction_reference}</p>
                              </div>
                              <div className="text-lg font-bold text-green-600">
                                {formatCurrency(payment.amount)}
                              </div>
                              <div className="text-sm text-gray-500">
                                {formatDate(payment.created_at)}
                              </div>
                              <div className="text-sm">
                                <span className="text-gray-600">Method:</span>{' '}
                                <span className="font-medium capitalize">{payment.payment_method}</span>
                              </div>
                            </div>
                          </td>
                          <td className="p-4">
                            <div className="space-y-1">
                              <p className="font-medium text-blue-600">{payment.package_id}</p>
                              {payment.sender_name && (
                                <div>
                                  <p className="text-sm font-medium text-gray-900">{payment.sender_name}</p>
                                  <p className="text-sm text-gray-500">{payment.sender_phone}</p>
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="p-4">
                            {payment.receiver_name && (
                              <div className="space-y-1">
                                <p className="text-sm font-medium text-gray-900">{payment.receiver_name}</p>
                                <p className="text-sm text-gray-500">{payment.receiver_phone}</p>
                              </div>
                            )}
                          </td>
                          <td className="p-4">
                            <Badge
                              variant={getStatusVariant(payment.payment_status)}
                              className="flex items-center gap-1 w-fit"
                            >
                              {getStatusIcon(payment.payment_status)}
                              {payment.payment_status.charAt(0).toUpperCase() + payment.payment_status.slice(1)}
                            </Badge>
                            {payment.confirmed_at && (
                              <p className="text-xs text-gray-500 mt-1">
                                Confirmed: {formatDate(payment.confirmed_at)}
                              </p>
                            )}
                          </td>
                          <td className="p-4">
                            <div className="flex items-center gap-2">
                              {payment.payment_status === 'pending' && (
                                <Button
                                  size="sm"
                                  onClick={() => openConfirmModal(payment)}
                                  className="bg-green-600 hover:bg-green-700 text-white"
                                >
                                  <CheckCircle className="w-4 h-4 mr-1" />
                                  Confirm Payment
                                </Button>
                              )}
                              <Button variant="ghost" size="sm">
                                <MoreVertical className="w-4 h-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {payments.length > 0 && (
                <div className="flex items-center justify-between p-4 border-t">
                  <div className="text-sm text-gray-700">
                    Showing {((pagination.page - 1) * pagination.limit) + 1} to{' '}
                    {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
                    {pagination.total} payments
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                      disabled={pagination.page <= 1}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                      disabled={pagination.page >= pagination.pages}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Payment Confirmation Modal */}
          <Dialog open={confirmModalOpen} onOpenChange={setConfirmModalOpen}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                  Confirm Payment
                </DialogTitle>
                <DialogDescription>
                  Review payment details and select payment method before confirmation.
                </DialogDescription>
              </DialogHeader>

              {selectedPayment && (
                <div className="space-y-6">
                  {/* Payment Summary */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="font-semibold text-gray-900 mb-3">Payment Summary</h4>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-600">Payment ID:</span>
                        <p className="font-medium">{selectedPayment.payment_id}</p>
                      </div>
                      <div>
                        <span className="text-gray-600">Package ID:</span>
                        <p className="font-medium text-blue-600">{selectedPayment.package_id}</p>
                      </div>
                      <div>
                        <span className="text-gray-600">Amount:</span>
                        <p className="font-bold text-green-600 text-lg">
                          {formatCurrency(selectedPayment.amount)}
                        </p>
                      </div>
                      <div>
                        <span className="text-gray-600">Reference:</span>
                        <p className="font-medium">{selectedPayment.transaction_reference}</p>
                      </div>
                    </div>
                  </div>

                  {/* Sender & Receiver Info */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                        <User className="w-4 h-4" />
                        Sender
                      </h4>
                      <div className="text-sm space-y-1">
                        <p className="font-medium">{selectedPayment.sender_name || 'N/A'}</p>
                        <p className="text-gray-600">{selectedPayment.sender_phone || 'N/A'}</p>
                      </div>
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                        <User className="w-4 h-4" />
                        Receiver
                      </h4>
                      <div className="text-sm space-y-1">
                        <p className="font-medium">{selectedPayment.receiver_name || 'N/A'}</p>
                        <p className="text-gray-600">{selectedPayment.receiver_phone || 'N/A'}</p>
                      </div>
                    </div>
                  </div>

                  {/* Transaction Reference */}
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2">Transaction Reference *</h4>
                    <Input
                      placeholder="Enter transaction reference number..."
                      value={transactionReference}
                      onChange={(e) => setTransactionReference(e.target.value)}
                      className="w-full"
                      required
                    />
                    <p className="text-sm text-gray-500 mt-1">
                      Enter the reference number from the payment receipt or transaction
                    </p>
                  </div>

                  {/* Payment Method Selection */}
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-3">Select Payment Method *</h4>
                    <div className="grid grid-cols-2 gap-3">
                      {paymentMethods.map((method) => {
                        const IconComponent = method.icon
                        return (
                          <div
                            key={method.id}
                            className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${selectedPaymentMethod === method.id
                              ? 'border-green-500 bg-green-50'
                              : 'border-gray-200 hover:border-gray-300'
                              }`}
                            onClick={() => setSelectedPaymentMethod(method.id)}
                          >
                            <div className="flex items-center gap-3">
                              <div className={`p-2 rounded-full ${selectedPaymentMethod === method.id
                                ? 'bg-green-100 text-green-600'
                                : 'bg-gray-100 text-gray-600'
                                }`}>
                                <IconComponent className="w-4 h-4" />
                              </div>
                              <div>
                                <p className="font-medium text-sm">{method.name}</p>
                                <p className="text-xs text-gray-500">{method.description}</p>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  {/* Additional Notes */}
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2">Additional Notes</h4>
                    <textarea
                      placeholder="Add any additional notes or comments about this payment confirmation..."
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className="w-full h-20 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm"
                    />
                  </div>
                </div>
              )}

              <DialogFooter className="flex gap-2 sm:gap-0">
                <Button
                  variant="outline"
                  onClick={closeConfirmModal}
                  disabled={isConfirming}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleConfirmPayment}
                  disabled={!selectedPaymentMethod || !transactionReference.trim() || isConfirming}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  {isConfirming ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Confirming...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Confirm Payment
                    </>
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  )
}