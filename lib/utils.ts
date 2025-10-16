import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function generateTrackingNumber(): string {
  const prefix = "KB"
  const timestamp = Date.now().toString().slice(-8)
  const random = Math.random().toString(36).substring(2, 5).toUpperCase()
  return `${prefix}${timestamp}${random}`
}

export function formatPhoneNumber(phone: string): string {
  // Ensure phone number starts with +250 for Rwanda
  if (phone.startsWith("0")) {
    return `+25${phone}`
  }
  if (phone.startsWith("25") && !phone.startsWith("+")) {
    return `+${phone}`
  }
  if (!phone.startsWith("+250")) {
    return `+250${phone.replace(/^\+?/, "")}`
  }
  return phone
}

export function formatCurrency(amount?: number | string | null): string {
  const num = typeof amount === "number" ? amount : Number(amount)
  const value = typeof num === "number" && !Number.isNaN(num) ? num : 0
  return new Intl.NumberFormat("en-RW", {
    style: "currency",
    currency: "RWF",
    minimumFractionDigits: 0,
  }).format(value)
}

export function getStatusColor(status: string): string {
  switch (status) {
    case "pending":
      return "bg-yellow-100 text-yellow-800"
    case "picked_up":
      return "bg-blue-100 text-blue-800"
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

export function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371 // Radius of the Earth in kilometers
  const dLat = (lat2 - lat1) * (Math.PI / 180)
  const dLon = (lon2 - lon1) * (Math.PI / 180)
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLon / 2) * Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c // Distance in kilometers
}
