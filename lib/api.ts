import { authService } from "./auth"

interface Package {
  id: number
  package_id: string
  pickup_code: string
  sender_name: string
  sender_phone: string
  sender_address: string
  receiver_name: string
  receiver_phone: string
  receiver_address: string
  package_description?: string
  weight?: number
  dimensions?: string
  declared_value?: number
  delivery_fee: number
  status: "registered" | "picked_up" | "in_transit" | "out_for_delivery" | "delivered" | "cancelled"
  priority: "normal" | "express" | "urgent"
  origin_branch_id?: string
  origin_branch_name?: string
  destination_branch_id?: string
  destination_branch_name?: string
  assigned_car?: string
  car_plate_number?: string
  car_model?: string
  assigned_driver?: string
  driver_name?: string
  agent_id: string
  agent_name?: string
  created_at: string
  updated_at: string
  delivered_at?: string
}

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

interface Branch {
  id: number
  branch_id: string
  branch_name: string
  latitude: number
  longitude: number
  address: string
  created_at: string
  updated_at: string
}

interface Car {
  id: number
  car_id: string
  plate_number: string
  model: string
  capacity_kg: number
  status: "available" | "in-use" | "maintenance"
  branch_id: string
  branch_name: string
  created_at: string
  updated_at: string
}

interface Driver {
  id: number
  driver_id: string
  full_name: string
  phone: string
  license_number: string
  assigned_car: string | null
  branch_id: string
  branch_name: string
  created_at: string
  updated_at: string
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
  async registerPackage(packageData: {
    senderName: string
    senderPhone: string
    senderAddress: string
    receiverName: string
    receiverPhone: string
    receiverAddress: string
    packageDescription?: string
    weight?: number
    dimensions?: string
    declaredValue?: number
    deliveryFee: number
    priority?: "normal" | "express" | "urgent"
  }): Promise<{ message: string; package: Package }> {
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
        if (value !== undefined) {
          searchParams.append(key, value.toString())
        }
      })
    }

    const query = searchParams.toString()
    return this.request(`/packages${query ? `?${query}` : ""}`)
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

  // Branch API methods
  async getBranches(): Promise<{ branches: Branch[] }> {
    return this.request('/branches')
  }

  async getBranch(branchId: string): Promise<{ branch: Branch }> {
    return this.request(`/branches/${branchId}`)
  }

  async createBranch(data: {
    branch_name: string
    latitude: number
    longitude: number
    address: string
  }): Promise<{ branch: Branch }> {
    return this.request('/branches', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async updateBranch(
    branchId: string,
    data: {
      branch_name: string
      latitude: number
      longitude: number
      address: string
    }
  ): Promise<{ branch: Branch }> {
    return this.request(`/branches/${branchId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  }

  async deleteBranch(branchId: string): Promise<{ message: string }> {
    return this.request(`/branches/${branchId}`, {
      method: 'DELETE',
    })
  }

  // Car API methods
  async getCars(): Promise<{ cars: Car[] }> {
    return this.request('/cars')
  }

  async getCar(carId: string): Promise<{ car: Car }> {
    return this.request(`/cars/${carId}`)
  }

  async createCar(data: {
    plate_number: string
    model: string
    capacity_kg: number
    branch_id: string
  }): Promise<{ car: Car }> {
    return this.request('/cars', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async updateCar(
    carId: string,
    data: {
      plate_number: string
      model: string
      capacity_kg: number
      status: string
      branch_id: string
    }
  ): Promise<{ car: Car }> {
    return this.request(`/cars/${carId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  }

  async deleteCar(carId: string): Promise<{ message: string }> {
    return this.request(`/cars/${carId}`, {
      method: 'DELETE',
    })
  }

  // Driver API methods
  async getDrivers(): Promise<{ drivers: Driver[] }> {
    return this.request('/drivers')
  }

  async getDriver(driverId: string): Promise<{ driver: Driver }> {
    return this.request(`/drivers/${driverId}`)
  }

  async createDriver(data: {
    full_name: string
    phone: string
    license_number: string
    assigned_car: string | null
    branch_id: string
  }): Promise<{ driver: Driver }> {
    return this.request('/drivers', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async updateDriver(
    driverId: string,
    data: {
      full_name: string
      phone: string
      license_number: string
      assigned_car: string | null
      branch_id: string
    }
  ): Promise<{ driver: Driver }> {
    return this.request(`/drivers/${driverId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  }

  async deleteDriver(driverId: string): Promise<{ message: string }> {
    return this.request(`/drivers/${driverId}`, {
      method: 'DELETE',
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
export type { Branch, Car, Driver, Package, Payment, TrackingEntry }

