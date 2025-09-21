"use client"

import type { TrackingEntry } from "@/lib/api"
import { Badge } from "@/components/ui/badge"
import { Calendar, MapPin, User } from "lucide-react"

interface TrackingTimelineProps {
  tracking: TrackingEntry[]
}

export function TrackingTimeline({ tracking }: TrackingTimelineProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case "delivered":
        return "bg-green-100 text-green-800"
      case "cancelled":
        return "bg-red-100 text-red-800"
      case "in_transit":
        return "bg-blue-100 text-blue-800"
      case "out_for_delivery":
        return "bg-orange-100 text-orange-800"
      case "picked_up":
        return "bg-yellow-100 text-yellow-800"
      case "location_update":
        return "bg-purple-100 text-purple-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const getStatusIcon = (status: string, isLatest: boolean) => {
    const baseClasses = `w-4 h-4 rounded-full border-2 ${
      isLatest ? "bg-primary border-primary" : "bg-background border-muted-foreground"
    }`

    return <div className={baseClasses} />
  }

  if (tracking.length === 0) {
    return (
      <div className="text-center py-8">
        <Calendar className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
        <p className="text-muted-foreground">No tracking updates available</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {tracking.map((entry, index) => (
        <div key={entry.id} className="flex gap-4">
          {/* Timeline indicator */}
          <div className="flex flex-col items-center">
            {getStatusIcon(entry.status, index === 0)}
            {index < tracking.length - 1 && <div className="w-px h-16 bg-border mt-2" />}
          </div>

          {/* Content */}
          <div className="flex-1 pb-6">
            <div className="flex items-start justify-between mb-2">
              <div>
                <Badge className={getStatusColor(entry.status)} variant="secondary">
                  {entry.status.replace("_", " ").toUpperCase()}
                </Badge>
                {entry.progress_percentage > 0 && (
                  <span className="ml-2 text-sm text-muted-foreground">({entry.progress_percentage}%)</span>
                )}
              </div>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Calendar className="h-3 w-3" />
                {formatDate(entry.created_at)}
              </div>
            </div>

            {entry.notes && <p className="text-sm text-muted-foreground mb-2">{entry.notes}</p>}

            {entry.location_name && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                <MapPin className="h-3 w-3" />
                {entry.location_name}
              </div>
            )}

            {entry.latitude && entry.longitude && (
              <div className="text-xs text-muted-foreground mb-1">
                GPS: {entry.latitude.toFixed(6)}, {entry.longitude.toFixed(6)}
              </div>
            )}

            {entry.updated_by_name && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <User className="h-3 w-3" />
                Updated by {entry.updated_by_name}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
