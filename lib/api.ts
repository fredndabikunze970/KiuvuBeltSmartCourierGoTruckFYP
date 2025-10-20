import type {
    BranchResponse,
    CarResponse,
    DriverResponse,
    PackageRegistrationData,
    PackageRegistrationResponse
} from "./api-types"
import { authService } from "./auth"
import type {
    Branch,
    Package
} from "./types"

interface TrackingEntry {
  id: number
  package_id: string
  latitude?: number
  longitude?: number
  location_name?: string
  status: string
  progress_percentage: number
  notes?: string
  updated_by: string
  updated_by_name?: string
  created_at: string
}

interface Payment {
  id: number
  payment_id: string
  package_id: string
  amount: number
  payment_method: "cash" | "mobile_money" | "bank_transfer"
  payment_status: "pending" | "confirmed" | "failed" | "refunded"
  confirmed_by?: string
  confirmed_by_name?: string
  payment_reference?: string
  created_at: string
  confirmed_at?: string
}

class ApiService {
  private baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api"

  constructor() {
    console.log("🔗 API Base URL:", this.baseUrl)
    console.log("🔗 NEXT_PUBLIC_API_URL from env:", process.env.NEXT_PUBLIC_API_URL || "not set (using default)")
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`
    const headers = {
      "Content-Type": "application/json",
      ...authService.getAuthHeaders(),
      ...options.headers,
    }

    const response = await fetch(url, {
      ...options,
      headers,
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: "Request failed" }))
      throw new Error(error.error || `HTTP ${response.status}`)
    }

    return response.json()
  }

  // Package API methods
    // Fleet management API methods
  async getBranches(): Promise<BranchResponse> {
      return this.request("/branches")
  }

  async getCars(params?: { branchId?: string }): Promise<CarResponse> {
    const query = params?.branchId ? `?branch_id=${params.branchId}` : ""
      return this.request(`/cars${query}`)
  }

  async getDrivers(params?: { branchId?: string }): Promise<DriverResponse> {
    const query = params?.branchId ? `?branch_id=${params.branchId}` : ""
      return this.request(`/drivers${query}`)
  }

  async registerPackage(packageData: PackageRegistrationData): Promise<PackageRegistrationResponse> {
    return this.request("/packages/register", {
      method: "POST",
      body: JSON.stringify(packageData),
    })
  }

  async getPackages(params?: {
    status?: string
    agent_id?: string
    page?: number
    limit?: number
    branchId?: string
  }): Promise<{
    packages: Package[]
    pagination: {
      page: number
      limit: number
      total: number
      pages: number
    }
  }> {
    const searchParams = new URLSearchParams()
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value === undefined) return

        // map camelCase branchId to expected snake_case branch_id query param
        if (key === 'branchId') {
          searchParams.append('branch_id', value.toString())
          return
        }

        searchParams.append(key, value.toString())
      })
    }

    const query = searchParams.toString()
    return this.request(`/packages${query ? `?${query}` : ""}`)
  }

  // Branch helper
  async getBranch(branchId: string): Promise<{ branch?: Branch }> {
    return this.request(`/branches/${branchId}`)
  }

  async getPackage(packageId: string): Promise<{ package: Package }> {
    return this.request(`/packages/${packageId}`)
  }

  async updatePackageStatus(
    packageId: string,
    data: {
      status: string
      notes?: string
      latitude?: number
      longitude?: number
      locationName?: string
    },
  ): Promise<{ message: string; status: string; progressPercentage: number }> {
    return this.request(`/packages/${packageId}/status`, {
      method: "PUT",
      body: JSON.stringify(data),
    })
  }

  async verifyDelivery(packageId: string, pickupCode: string): Promise<{ message: string; package: Package }> {
    return this.request("/packages/verify-delivery", {
      method: "POST",
      body: JSON.stringify({ packageId, pickupCode }),
    })
  }

  // Tracking API methods
  async getTracking(packageId: string): Promise<{
    package: Package
    tracking: TrackingEntry[]
    currentLocation?: {
      latitude: number
      longitude: number
      timestamp: number
      lastUpdated: string
    }
  }> {
    return this.request(`/tracking/${packageId}`)
  }

  async getGPSLocation(packageId: string): Promise<{
    packageId: string
    location: {
      latitude: number
      longitude: number
      timestamp: number
      lastUpdated: string
    }
    lastUpdated: number
  }> {
    return this.request(`/tracking/${packageId}/gps`)
  }

  async updateGPSLocation(
    packageId: string,
    data: {
      latitude: number
      longitude: number
      accuracy?: number
      speed?: number
      heading?: number
    },
  ): Promise<{ message: string; location: any }> {
    return this.request(`/tracking/${packageId}/gps`, {
      method: "POST",
      body: JSON.stringify(data),
    })
  }

  // Payment API methods
  async createPayment(data: {
    packageId: string
    amount: number
    paymentMethod: "cash" | "mobile_money" | "bank_transfer"
    paymentReference?: string
  }): Promise<{ message: string; payment: Payment }> {
    return this.request("/payments", {
      method: "POST",
      body: JSON.stringify(data),
    })
  }

  async confirmPayment(paymentId: string): Promise<{ message: string; paymentId: string; confirmedBy: string }> {
    return this.request(`/payments/${paymentId}/confirm`, {
      method: "PUT",
    })
  }

  async getPayment(paymentId: string): Promise<{ payment: Payment }> {
    return this.request(`/payments/${paymentId}`)
  }

  async getPackagePayments(packageId: string): Promise<{ payments: Payment[] }> {
    return this.request(`/payments/package/${packageId}`)
  }

  // Statistics
  async getTrackingStats(): Promise<{
    stats: {
      total_packages: number
      registered: number
      picked_up: number
      in_transit: number
      out_for_delivery: number
      delivered: number
      cancelled: number
    }
  }> {
    return this.request("/tracking/stats/overview")
  }
}

export const apiService = new ApiService()
export type { Package, Payment, TrackingEntry }

