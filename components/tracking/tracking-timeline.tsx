"use client"

import type { TrackingEntry } from "@/lib/api"
import { CheckCircle, Clock, Package, Truck, MapPin, Home, AlertCircle } from "lucide-react"

interface TrackingTimelineProps {
    tracking: TrackingEntry[]
}

export function TrackingTimeline({ tracking }: TrackingTimelineProps) {
    const getStatusIcon = (status: string) => {
        switch (status) {
            case "registered":
                return <Package className="h-5 w-5 text-blue-600" />
            case "picked_up":
                return <Truck className="h-5 w-5 text-yellow-600" />
            case "in_transit":
                return <Truck className="h-5 w-5 text-purple-600" />
            case "out_for_delivery":
                return <MapPin className="h-5 w-5 text-orange-600" />
            case "delivered":
                return <CheckCircle className="h-5 w-5 text-green-600" />
            case "cancelled":
                return <AlertCircle className="h-5 w-5 text-red-600" />
            default:
                return <Clock className="h-5 w-5 text-gray-600" />
        }
    }

    const getStatusColor = (status: string) => {
        switch (status) {
            case "registered":
                return "bg-blue-100 text-blue-800"
            case "picked_up":
                return "bg-yellow-100 text-yellow-800"
            case "in_transit":
                return "bg-purple-100 text-purple-800"
            case "out_for_delivery":
                return "bg-orange-100 text-orange-800"
            case "delivered":
                return "bg-green-100 text-green-800"
            case "cancelled":
                return "bg-red-100 text-red-800"
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

    const getStatusText = (status: string) => {
        const statusMap: { [key: string]: string } = {
            registered: "Package Registered",
            picked_up: "Picked Up from Sender",
            in_transit: "In Transit to Destination",
            out_for_delivery: "Out for Delivery",
            delivered: "Delivered Successfully",
            cancelled: "Delivery Cancelled"
        }
        return statusMap[status] || status.replace("_", " ")
    }

    return (
        <div className="space-y-4">
            {tracking.map((entry, index) => (
                <div key={entry.id} className="flex gap-4 group hover:bg-gray-50 p-3 rounded-xl transition-colors duration-200">
                    {/* Timeline line */}
                    <div className="flex flex-col items-center">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 ${
                            index === 0 ? 'bg-blue-50 border-blue-200' : 'bg-white border-gray-200'
                        } group-hover:border-blue-300 transition-colors duration-200`}>
                            {getStatusIcon(entry.status)}
                        </div>
                        {index < tracking.length - 1 && (
                            <div className="flex-1 w-0.5 bg-gray-200 my-1 group-hover:bg-blue-200 transition-colors duration-200"></div>
                        )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 pb-6">
                        <div className="flex items-start justify-between mb-2">
                            <div>
                                <h3 className="font-semibold text-gray-900 capitalize">
                                    {getStatusText(entry.status)}
                                </h3>
                                {entry.notes && (
                                    <p className="text-gray-600 mt-1">{entry.notes}</p>
                                )}
                            </div>
                            <Badge 
                                className={`${getStatusColor(entry.status)} px-3 py-1 text-xs font-medium rounded-full border-0`}
                            >
                                {entry.status.replace("_", " ").toUpperCase()}
                            </Badge>
                        </div>
                        
                        <div className="flex items-center gap-4 text-sm text-gray-500">
                            <div className="flex items-center gap-1">
                                <Clock className="h-4 w-4" />
                                <span>{formatDate(entry.created_at)}</span>
                            </div>
                            {entry.location && (
                                <div className="flex items-center gap-1">
                                    <MapPin className="h-4 w-4" />
                                    <span>{entry.location}</span>
                                </div>
                            )}
                        </div>

                        {/* Additional details */}
                        {(entry.latitude && entry.longitude) && (
                            <div className="mt-2 p-2 bg-gray-50 rounded-lg">
                                <p className="text-xs font-mono text-gray-600">
                                    GPS: {entry.latitude.toFixed(4)}, {entry.longitude.toFixed(4)}
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            ))}

            {tracking.length === 0 && (
                <div className="text-center py-8">
                    <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">No tracking history available</p>
                </div>
            )}
        </div>
    )
}