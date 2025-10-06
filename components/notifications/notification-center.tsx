"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { Bell, CheckCheck, Filter, MessageSquare, RefreshCw, Search } from "lucide-react"
import { useEffect, useState } from "react"

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  created_at: string;
  user_id: string;
  tracking_number: string;
  recipient_phone: string;
  notification_type: string;
  status: string;
  error_message?: string;
}

export function NotificationCenter() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [filter, setFilter] = useState<'all' | 'unread'>('all')
  const { toast } = useToast()

  const filteredNotifications = notifications.filter(notification =>
    filter === 'all' ? true : !notification.is_read
  )

  const unreadCount = notifications.filter(n => !n.is_read).length

  useEffect(() => {
    fetchNotifications()
  }, [])

  const fetchNotifications = async () => {
    try {
      const response = await fetch('/api/notifications');
      const data = await response.json();
      if (data.success) {
        setNotifications(data.data);
      } else {
        throw new Error(data.error || 'Failed to fetch notifications');
      }
    } catch (error) {
      console.error("Failed to fetch notifications:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to fetch notifications",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  const refreshNotifications = async () => {
    setRefreshing(true);
    await fetchNotifications();
    setRefreshing(false);
  }

  const markAllAsRead = async () => {
    try {
      await fetch('/api/notifications', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ markAllAsRead: true }),
      });
      setNotifications(notifications.map(n => ({ ...n, is_read: true })));
      toast({
        title: "Success",
        description: "All notifications marked as read",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to mark all as read",
        variant: "destructive",
      });
    }
  }

  const getStatusColor = (status: string) => {
    const colors = {
      sent: "bg-green-100 text-green-800 border-green-200",
      failed: "bg-red-100 text-red-800 border-red-200",
      pending: "bg-yellow-100 text-yellow-800 border-yellow-200",
      delivered: "bg-blue-100 text-blue-800 border-blue-200",
    }
    return colors[status as keyof typeof colors] || "bg-gray-100 text-gray-800 border-gray-200"
  }

  const getTypeColor = (type: string) => {
    const colors = {
      delivery: "bg-purple-100 text-purple-800 border-purple-200",
      package: "bg-indigo-100 text-indigo-800 border-indigo-200",
      system: "bg-gray-100 text-gray-800 border-gray-200",
      alert: "bg-orange-100 text-orange-800 border-orange-200",
    }
    return colors[type as keyof typeof colors] || "bg-gray-100 text-gray-800 border-gray-200"
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="animate-pulse space-y-3">
                <div className="flex gap-3">
                  <div className="w-10 h-10 bg-muted rounded-lg"></div>
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-muted rounded w-3/4"></div>
                    <div className="h-3 bg-muted rounded w-1/2"></div>
                    <div className="h-3 bg-muted rounded w-1/4"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Bell className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Total</p>
                <p className="text-2xl font-bold text-gray-900">{notifications.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCheck className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Read</p>
                <p className="text-2xl font-bold text-gray-900">{notifications.length - unreadCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 rounded-lg">
                <Bell className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Unread</p>
                <p className="text-2xl font-bold text-gray-900">{unreadCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Filter className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Showing</p>
                <p className="text-2xl font-bold text-gray-900">{filteredNotifications.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Controls */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle>Notification History</CardTitle>
              <CardDescription>
                Manage and review your system notifications
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={refreshNotifications}
                disabled={refreshing}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                Refresh
              </Button>

              {unreadCount > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={markAllAsRead}
                >
                  <CheckCheck className="h-4 w-4 mr-2" />
                  Mark All Read
                </Button>
              )}

              <div className="flex border rounded-lg">
                <Button
                  variant={filter === 'all' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setFilter('all')}
                  className="rounded-r-none"
                >
                  All
                </Button>
                <Button
                  variant={filter === 'unread' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setFilter('unread')}
                  className="rounded-l-none"
                >
                  Unread
                  {unreadCount > 0 && (
                    <Badge variant="secondary" className="ml-2 bg-blue-100 text-blue-800">
                      {unreadCount}
                    </Badge>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {filteredNotifications.length === 0 ? (
            <div className="text-center py-12">
              <MessageSquare className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {filter === 'unread' ? 'No unread notifications' : 'No notifications yet'}
              </h3>
              <p className="text-muted-foreground max-w-sm mx-auto">
                {filter === 'unread'
                  ? "You're all caught up! No unread notifications."
                  : "Notifications will appear here when you have package updates or system alerts."
                }
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredNotifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`
                    border rounded-lg p-4 space-y-3 transition-all duration-200 hover:shadow-md
                    ${notification.is_read ? 'bg-white' : 'bg-blue-50 border-blue-200'}
                  `}
                >
                  <div className="flex justify-between items-start gap-4">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className={`
                        w-2 h-2 rounded-full flex-shrink-0
                        ${notification.is_read ? 'bg-gray-300' : 'bg-blue-500'}
                      `} />

                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-gray-900 truncate">
                          {notification.title}
                        </h4>
                        <p className="text-sm text-gray-600 mt-1">
                          {notification.message}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Badge className={getTypeColor(notification.type)}>
                        {notification.type}
                      </Badge>
                      <Badge className={getStatusColor(notification.status)}>
                        {notification.status}
                      </Badge>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-sm text-gray-500">
                    <div className="flex items-center gap-4">
                      {notification.tracking_number && (
                        <span className="font-mono bg-gray-100 px-2 py-1 rounded">
                          {notification.tracking_number}
                        </span>
                      )}
                      <span>To: {notification.recipient_phone}</span>
                    </div>
                    <span>{formatDate(notification.created_at)}</span>
                  </div>

                  {notification.error_message && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                      <p className="text-sm text-red-800">
                        <strong>Error:</strong> {notification.error_message}
                      </p>
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