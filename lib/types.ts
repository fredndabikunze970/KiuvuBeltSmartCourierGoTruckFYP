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

export interface Branch {
  id: number
  branch_id: string
  branch_name: string
  latitude: number
  longitude: number
  address: string
  created_at: string
  updated_at: string
}

export interface Package {
  id: number
  package_id: string
  pickup_code: string
  sender_name: string
  sender_phone: string
  sender_address: string
  origin_branch_id: string
  receiver_name: string
  receiver_phone: string
  receiver_address: string
  destination_branch_id: string
  package_description?: string
  weight?: number
  dimensions?: string
  declared_value?: number
  delivery_fee: number
  status: "registered" | "picked_up" | "in_transit" | "out_for_delivery" | "delivered" | "cancelled"
  priority: "normal" | "express" | "urgent"
  agent_id: string
  created_at: string
  updated_at: string
  delivered_at?: string
  assigned_car?: string
  assigned_driver?: string
  delivery_time?: string
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
