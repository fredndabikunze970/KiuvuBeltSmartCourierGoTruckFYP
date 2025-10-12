"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { Bell, CheckCheck, Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ScrollArea } from "@/components/ui/scroll-area"
import { authService } from "@/lib/auth"
import { cn } from "@/lib/utils"

interface Notification {
  id: string
  notification_id: string
  package_id?: string
  message: string
  notification_type?: string
  status: string
  sent_at?: string
  created_at: string
  recipient_phone?: string
}

export const NotificationDropdown = () => {
  const [notifications, setNotifications] = useState<Notification[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [markingAll, setMarkingAll] = useState(false)

  const unreadCount = useMemo(
    () => (notifications?.filter((n) => n.status !== "read").length ?? 0),
    [notifications]
  )

  useEffect(() => {
    let isMounted = true

    const loadNotifications = async () => {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch("/api/notifications", {
          cache: "no-store",
          headers: authService.getAuthHeaders(),
        })
        if (res.status === 401) {
          if (isMounted) {
            setError("Please login to view notifications")
            setNotifications([])
          }
          return
        }
        if (!res.ok) throw new Error(`Request failed: ${res.status}`)
        const data = await res.json()
        // API returns { success: boolean, data: Notification[] }
        if (isMounted) {
          const list = Array.isArray(data) ? data : (Array.isArray(data?.data) ? data.data : [])
          setNotifications(list)
        }
      } catch (err) {
        console.error("Failed to load notifications:", err)
        if (isMounted) {
          setError("Failed to load notifications")
          setNotifications([])
        }
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    loadNotifications()
    return () => {
      isMounted = false
    }
  }, [])

  const formatDate = (iso: string) => {
    try {
      const date = new Date(iso)
      const now = new Date()
      const diff = Math.floor((now.getTime() - date.getTime()) / 60000)
      if (diff < 1) return "Just now"
      if (diff < 60) return `${diff}m ago`
      const h = Math.floor(diff / 60)
      if (h < 24) return `${h}h ago`
      const d = Math.floor(h / 24)
      if (d < 7) return `${d}d ago`
      return date.toLocaleDateString("en-US", { month: "short", day: "numeric" })
    } catch {
      return "Recently"
    }
  }

  const markAsRead = async (id: string) => {
    try {
      // Optimistic update
      setNotifications((prev) =>
        prev?.map((n) => (n.notification_id === id ? { ...n, status: "read" } : n)) ?? null
      )
      await fetch("/api/notifications", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...authService.getAuthHeaders(),
        },
        body: JSON.stringify({ notificationId: id }),
      })
    } catch (e) {
      console.error("Failed to mark as read", e)
    }
  }

  const markAllAsRead = async () => {
    if (!notifications?.length) return
    setMarkingAll(true)
    try {
      // Optimistic update
      setNotifications((prev) => prev?.map((n) => ({ ...n, status: "read" })) ?? null)
      await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markAllAsRead: true }),
      })
    } catch (e) {
      console.error("Failed to mark all as read", e)
    } finally {
      setMarkingAll(false)
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative h-9 w-9 border border-gray-200 hover:bg-gray-50 hover:shadow-sm transition-all duration-200"
          aria-label="Open notifications"
        >
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 h-5 w-5 bg-red-600 text-white rounded-full flex items-center justify-center text-xs font-bold border border-white">
              {unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent className="w-80 sm:w-96 p-0" align="end" sideOffset={8}>
        <div className="flex items-center justify-between px-4 py-3 border-b bg-white">
          <div className="flex items-center gap-2">
            <DropdownMenuLabel className="p-0 text-base sm:text-lg">Notifications</DropdownMenuLabel>
            {unreadCount > 0 && (
              <span className="text-xs bg-blue-100 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-full">
                {unreadCount} new
              </span>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            disabled={unreadCount === 0 || markingAll}
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              markAllAsRead()
            }}
            className="text-xs text-gray-600 hover:text-blue-600"
          >
            {markingAll ? (
              <span className="inline-flex items-center gap-1">
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Marking...
              </span>
            ) : (
              <span className="inline-flex items-center gap-1">
                <CheckCheck className="h-3.5 w-3.5" /> Mark all as read
              </span>
            )}
          </Button>
        </div>

        <div className="max-h-96">
          {loading ? (
            <div className="p-4 space-y-3">
              <div className="h-4 bg-gray-200 rounded animate-pulse" />
              <div className="h-4 bg-gray-200 rounded animate-pulse" />
              <div className="h-4 bg-gray-200 rounded animate-pulse" />
            </div>
          ) : notifications && notifications.length > 0 ? (
            <ScrollArea className="h-80">
              <div className="p-2">
                {notifications.map((n) => (
                  <button
                    key={n.notification_id}
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      markAsRead(n.notification_id)
                    }}
                    className={cn(
                      "w-full text-left p-3 rounded-md transition-colors border mb-1",
                      n.status === "read"
                        ? "bg-white hover:bg-gray-50 border-gray-200"
                        : "bg-blue-50/60 hover:bg-blue-100/60 border-blue-200"
                    )}
                  >
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
                      <div className={cn(
                        "mt-1 h-2 w-2 rounded-full flex-shrink-0",
                        n.status === "read" ? "bg-gray-300" : "bg-blue-500"
                      )} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-3 flex-wrap">
                          <p className="text-sm font-semibold text-gray-900 truncate">
                            {n.notification_type ? n.notification_type[0].toUpperCase() + n.notification_type.slice(1) : "Notification"}
                          </p>
                          <span className="text-xs text-gray-500 whitespace-nowrap">
                            {formatDate(n.created_at)}
                          </span>
                        </div>
                        <p className="text-sm text-gray-700 leading-snug line-clamp-2 mt-1">
                          {n.message}
                        </p>
                        {n.package_id && (
                          <p className="text-xs text-gray-500 mt-1">Package: {n.package_id}</p>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </ScrollArea>
          ) : (
            <div className="p-6 text-center text-sm text-gray-500">
              {error ? "Failed to load notifications. Showing recent activity." : "You're all caught up!"}
            </div>
          )}
        </div>

        <DropdownMenuSeparator />
        <div className="px-3 py-2 text-center">
          <Link
            href="/dashboard/notifications"
            className="inline-flex items-center justify-center text-sm text-blue-600 hover:underline w-full"
          >
            View all notifications
          </Link>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
