"use client"

import type React from "react"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { MessageSquare, Send, CheckCircle, XCircle, Loader2 } from "lucide-react"
import { useAuth } from "@/hooks/use-auth"

interface SMSTestResult {
  success: boolean
  messageId?: string
  error?: string
  recipients?: any[]
}

export function SMSTestingPanel() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<SMSTestResult | null>(null)
  const [formData, setFormData] = useState({
    type: "custom",
    phoneNumber: "+250788123456",
    message: "This is a test SMS from KIVU Belt Express",
    trackingNumber: "KB202501001",
    status: "in_transit",
    template: "WELCOME",
    templateArgs: "John Doe",
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setResult(null)

    try {
      const payload = {
        ...formData,
        templateArgs: formData.templateArgs.split(",").map((arg) => arg.trim()),
      }

      const response = await fetch("/api/sms/test", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("kivu_belt_token")}`,
        },
        body: JSON.stringify(payload),
      })

      const data = await response.json()
      setResult(data.result || data)
    } catch (error) {
      setResult({
        success: false,
        error: error instanceof Error ? error.message : "Failed to send SMS",
      })
    } finally {
      setLoading(false)
    }
  }

  if (user?.role !== "admin") {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-muted-foreground">Admin access required for SMS testing.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          SMS Testing Panel
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="type">SMS Type</Label>
              <Select value={formData.type} onValueChange={(value) => setFormData({ ...formData, type: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="custom">Custom Message</SelectItem>
                  <SelectItem value="package_notification">Package Notification</SelectItem>
                  <SelectItem value="template">Template Message</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="phoneNumber">Phone Number</Label>
              <Input
                id="phoneNumber"
                value={formData.phoneNumber}
                onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                placeholder="+250788123456"
                required
              />
            </div>
          </div>

          {formData.type === "custom" && (
            <div className="space-y-2">
              <Label htmlFor="message">Message</Label>
              <Textarea
                id="message"
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                placeholder="Enter your custom message..."
                rows={3}
                required
              />
            </div>
          )}

          {formData.type === "package_notification" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="trackingNumber">Tracking Number</Label>
                <Input
                  id="trackingNumber"
                  value={formData.trackingNumber}
                  onChange={(e) => setFormData({ ...formData, trackingNumber: e.target.value })}
                  placeholder="KB202501001"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">Package Status</Label>
                <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="registered">Registered</SelectItem>
                    <SelectItem value="picked_up">Picked Up</SelectItem>
                    <SelectItem value="in_transit">In Transit</SelectItem>
                    <SelectItem value="out_for_delivery">Out for Delivery</SelectItem>
                    <SelectItem value="delivered">Delivered</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {formData.type === "template" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="template">Template</Label>
                <Select
                  value={formData.template}
                  onValueChange={(value) => setFormData({ ...formData, template: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="WELCOME">Welcome Message</SelectItem>
                    <SelectItem value="PACKAGE_REGISTERED">Package Registered</SelectItem>
                    <SelectItem value="DELIVERY_REMINDER">Delivery Reminder</SelectItem>
                    <SelectItem value="PAYMENT_RECEIVED">Payment Received</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="templateArgs">Template Arguments (comma-separated)</Label>
                <Input
                  id="templateArgs"
                  value={formData.templateArgs}
                  onChange={(e) => setFormData({ ...formData, templateArgs: e.target.value })}
                  placeholder="John Doe, KB202501001"
                />
              </div>
            </div>
          )}

          <Button type="submit" disabled={loading} className="w-full">
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sending SMS...
              </>
            ) : (
              <>
                <Send className="mr-2 h-4 w-4" />
                Send Test SMS
              </>
            )}
          </Button>
        </form>

        {result && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              {result.success ? (
                <CheckCircle className="h-5 w-5 text-green-600" />
              ) : (
                <XCircle className="h-5 w-5 text-red-600" />
              )}
              <span className="font-medium">{result.success ? "SMS Sent Successfully" : "SMS Failed"}</span>
            </div>

            {result.success && result.messageId && (
              <div className="flex items-center gap-2">
                <Badge variant="outline">Message ID: {result.messageId}</Badge>
              </div>
            )}

            {result.error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-800">{result.error}</p>
              </div>
            )}

            {result.recipients && (
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-sm text-green-800 font-medium">Recipients:</p>
                {result.recipients.map((recipient, index) => (
                  <div key={index} className="text-sm text-green-700">
                    {recipient.number}: {recipient.status}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
