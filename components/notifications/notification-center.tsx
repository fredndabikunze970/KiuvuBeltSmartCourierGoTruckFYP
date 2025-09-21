"use client"

// Notification center for managing SMS notifications
import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"

interface Notification {
  notification_id: string
  package_id: string
  recipient_phone: string
  message: string
  notification_type: string
  status: string
  created_at: string
}

export function NotificationCenter() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [sendingCustom, setSendingCustom] = useState(false)
  const [customMessage, setCustomMessage] = useState({
    packageId: "",
    phoneNumber: "",
    message: "",
  })
  const { toast } = useToast()

  useEffect(() => {
    fetchNotifications()
  }, [])

  const fetchNotifications = async () => {
    try {
      const response = await fetch("/api/notifications", {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        setNotifications(data.notifications)
      }
    } catch (error) {
      console.error("Failed to fetch notifications:", error)
    } finally {
      setLoading(false)
    }
  }

  const sendCustomNotification = async () => {
    if (!customMessage.packageId || !customMessage.phoneNumber || !customMessage.message) {
      toast({
        title: "Error",
        description: "Please fill in all fields",
        variant: "destructive",
      })
      return
    }

    setSendingCustom(true)
    try {
      const response = await fetch("/api/notifications/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify(customMessage),
      })

      if (response.ok) {
        toast({
          title: "Notification Sent",
          description: "Custom notification has been sent successfully.",
        })
        setCustomMessage({ packageId: "", phoneNumber: "", message: "" })
        fetchNotifications() // Refresh the list
      } else {
        throw new Error("Failed to send notification")
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to send notification. Please try again.",
        variant: "destructive",
      })
    } finally {
      setSendingCustom(false)
    }
  }

  const getStatusColor = (status: string) => {
    const colors = {
      sent: "bg-green-100 text-green-800",
      failed: "bg-red-100 text-red-800",
      pending: "bg-yellow-100 text-yellow-800",
    }
    return colors[status as keyof typeof colors] || "bg-gray-100 text-gray-800"
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString("en-RW", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse space-y-4">
          <div className="h-32 bg-gray-200 rounded-lg"></div>
          <div className="h-20 bg-gray-200 rounded-lg"></div>
          <div className="h-20 bg-gray-200 rounded-lg"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Send Custom Notification */}
      <Card>
        <CardHeader>
          <CardTitle>Send Custom Notification</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="packageId">Package ID</Label>
              <Input
                id="packageId"
                value={customMessage.packageId}
                onChange={(e) => setCustomMessage((prev) => ({ ...prev, packageId: e.target.value }))}
                placeholder="PKG-XXX-XXX"
              />
            </div>
            <div>
              <Label htmlFor="phoneNumber">Phone Number</Label>
              <Input
                id="phoneNumber"
                value={customMessage.phoneNumber}
                onChange={(e) => setCustomMessage((prev) => ({ ...prev, phoneNumber: e.target.value }))}
                placeholder="+250788123456"
              />
            </div>
          </div>
          <div>
            <Label htmlFor="message">Message</Label>
            <Textarea
              id="message"
              value={customMessage.message}
              onChange={(e) => setCustomMessage((prev) => ({ ...prev, message: e.target.value }))}
              placeholder="Enter your custom message..."
              rows={3}
            />
          </div>
          <Button
            onClick={sendCustomNotification}
            disabled={sendingCustom}
            className="bg-kivu-primary hover:bg-kivu-primary/90"
          >
            {sendingCustom ? "Sending..." : "Send Notification"}
          </Button>
        </CardContent>
      </Card>

      {/* Notification History */}
      <Card>
        <CardHeader>
          <CardTitle>Notification History</CardTitle>
        </CardHeader>
        <CardContent>
          {notifications.length === 0 ? (
            <div className="text-center py-8 text-gray-500">No notifications found</div>
          ) : (
            <div className="space-y-4">
              {notifications.map((notification) => (
                <div key={notification.notification_id} className="border rounded-lg p-4 space-y-2">
                  <div className="flex justify-between items-start">
                    <div className="flex gap-2">
                      <Badge variant="outline">{notification.package_id}</Badge>
                      <Badge className={getStatusColor(notification.status)}>{notification.status}</Badge>
                    </div>
                    <div className="text-sm text-gray-500">{formatDate(notification.created_at)}</div>
                  </div>
                  <div className="text-sm text-gray-600">To: {notification.recipient_phone}</div>
                  <div className="text-sm bg-gray-50 p-3 rounded">{notification.message}</div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
