export interface User {
  id: number
  email: string
  full_name: string
  phone_number?: string
  role: "admin" | "agent" | "customer"
  status: "active" | "inactive" | "suspended"
  created_at: string
  updated_at: string
}

export interface Package {
  id: number
  tracking_number: string
  sender_name: string
  sender_phone: string
  sender_address: string
  receiver_name: string
  receiver_phone: string
  receiver_address: string
  package_type?: string
  weight?: number
  dimensions?: string
  description?: string
  status: "pending" | "picked_up" | "in_transit" | "out_for_delivery" | "delivered" | "cancelled"
  created_by?: number
  created_at: string
  updated_at: string
}

export interface TrackingUpdate {
  id: number
  package_id: number
  status: string
  location?: string
  latitude?: number
  longitude?: number
  notes?: string
  created_at: string
}

export interface Notification {
  id: number
  package_id: number
  recipient_phone: string
  message: string
  status: "pending" | "sent" | "delivered" | "failed"
  sent_at?: string
  created_at: string
}

export interface LocationData {
  latitude: number
  longitude: number
  address?: string
  timestamp?: number
}

export interface APIResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
}
