"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { MessageSquare, Send, Bell, Clock, CheckCircle, XCircle, Loader2 } from "lucide-react"
import { useAuth } from "@/hooks/use-auth"

interface Notification {
  id: string
  tracking_number: string
  recipient_phone: string
  message: string
  notification_type: string
  status: string
  created_at: string
  error_message?: string
}

export function NotificationCenter() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [sendingCustom, setSendingCustom] = useState(false)
  const [customMessage, setCustomMessage] = useState({
    trackingNumber: "",
    phoneNumber: "",
    message: "",
    type: "custom",
  })
  const { toast } = useToast()
  const { user } = useAuth()

  useEffect(() => {
    fetchNotifications()
  }, [])

  const fetchNotifications = async () => {
    try {
      setNotifications([
        {
          id: "1",
          tracking_number: "KB202501001",
          recipient_phone: "+250788123456",
          message: "Your package KB202501001 has been picked up and is now in transit.",
          notification_type: "package_update",
          status: "sent",
          created_at: new Date().toISOString(),
        },
        {
          id: "2",
          tracking_number: "KB202501002",
          recipient_phone: "+250788654321",
          message: "Your package KB202501002 is out for delivery.",
          notification_type: "package_update",
          status: "failed",
          created_at: new Date(Date.now() - 3600000).toISOString(),
          error_message: "Invalid phone number format",
        },
      ])
    } catch (error) {
      console.error("Failed to fetch notifications:", error)
    } finally {
      setLoading(false)
    }
  }

  const sendCustomNotification = async () => {
    if (!customMessage.phoneNumber || !customMessage.message) {
      toast({
        title: "Error",
        description: "Phone number and message are required",
        variant: "destructive",
      })
      return
    }

    setSendingCustom(true)
    try {
      const response = await fetch("/api/sms/test", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("kivu_belt_token")}`,
        },
        body: JSON.stringify({
          type: "custom",
          phoneNumber: customMessage.phoneNumber,
          message: customMessage.message,
        }),
      })

      const data = await response.json()

      if (data.success) {
        toast({
          title: "Notification Sent",
          description: "Custom notification has been sent successfully.",
        })
        setCustomMessage({ trackingNumber: "", phoneNumber: "", message: "", type: "custom" })

        const newNotification: Notification = {
          id: Date.now().toString(),
          tracking_number: customMessage.trackingNumber || "CUSTOM",
          recipient_phone: customMessage.phoneNumber,
          message: customMessage.message,
          notification_type: "custom",
          status: "sent",
          created_at: new Date().toISOString(),
        }
        setNotifications((prev) => [newNotification, ...prev])
      } else {
        throw new Error(data.error || "Failed to send notification")
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to send notification",
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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "sent":
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case "failed":
        return <XCircle className="h-4 w-4 text-red-600" />
      case "pending":
        return <Clock className="h-4 w-4 text-yellow-600" />
      default:
        return <Bell className="h-4 w-4 text-gray-600" />
    }
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
          <div className="h-32 bg-muted rounded-lg"></div>
          <div className="h-20 bg-muted rounded-lg"></div>
          <div className="h-20 bg-muted rounded-lg"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-primary" />
            Send Custom Notification
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="trackingNumber">Tracking Number (Optional)</Label>
              <Input
                id="trackingNumber"
                value={customMessage.trackingNumber}
                onChange={(e) => setCustomMessage((prev) => ({ ...prev, trackingNumber: e.target.value }))}
                placeholder="KB202501001"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phoneNumber">Phone Number *</Label>
              <Input
                id="phoneNumber"
                value={customMessage.phoneNumber}
                onChange={(e) => setCustomMessage((prev) => ({ ...prev, phoneNumber: e.target.value }))}
                placeholder="+250788123456"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="message">Message *</Label>
            <Textarea
              id="message"
              value={customMessage.message}
              onChange={(e) => setCustomMessage((prev) => ({ ...prev, message: e.target.value }))}
              placeholder="Enter your custom message..."
              rows={3}
              required
            />
            <p className="text-xs text-muted-foreground">Character count: {customMessage.message.length}/160</p>
          </div>

          <Button onClick={sendCustomNotification} disabled={sendingCustom} className="w-full md:w-auto">
            {sendingCustom ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Send className="mr-2 h-4 w-4" />
                Send Notification
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-primary" />
            Notification History
          </CardTitle>
        </CardHeader>
        <CardContent>
          {notifications.length === 0 ? (
            <div className="text-center py-12">
              <MessageSquare className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No notifications sent yet</p>
            </div>
          ) : (
            <div className="space-y-4">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className="border rounded-lg p-4 space-y-3 hover:bg-accent/50 transition-colors"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3">
                      {getStatusIcon(notification.status)}
                      <div className="flex gap-2">
                        <Badge variant="outline" className="font-mono">
                          {notification.tracking_number}
                        </Badge>
                        <Badge className={getStatusColor(notification.status)}>{notification.status}</Badge>
                        <Badge variant="secondary">{notification.notification_type.replace("_", " ")}</Badge>
                      </div>
                    </div>
                    <div className="text-sm text-muted-foreground">{formatDate(notification.created_at)}</div>
                  </div>

                  <div className="text-sm text-muted-foreground">
                    To: <span className="font-mono">{notification.recipient_phone}</span>
                  </div>

                  <div className="text-sm bg-card p-3 rounded border-l-4 border-l-primary">{notification.message}</div>

                  {notification.error_message && (
                    <div className="text-sm bg-destructive/10 text-destructive p-3 rounded border-l-4 border-l-destructive">
                      <strong>Error:</strong> {notification.error_message}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
