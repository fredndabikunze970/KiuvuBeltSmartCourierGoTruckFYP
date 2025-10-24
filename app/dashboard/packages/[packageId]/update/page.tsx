"use client"

import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { authService } from '@/lib/auth'
import { ArrowLeft, Car, Loader2, MapPin, Package as PackageIcon, Save, TrendingUp, User } from "lucide-react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { useEffect, useState } from "react"

type PackageData = {
  package_id: string
  tracking_number: string
  status: string
  sender_name: string
  sender_phone: string
  sender_address: string
  receiver_name: string
  receiver_phone: string
  receiver_address: string
  weight_kg: number
  dimensions: string
  description: string
  special_instructions: string
  origin_branch: string
  destination_branch: string
  assigned_car: string
  agent_id: string
  created_at: string
  updated_at: string
  origin_branch_name?: string
  destination_branch_name?: string
  assigned_car_plate?: string
  agent_name?: string
}

type Branch = {
  branch_id: string
  branch_name: string
}

type Car = {
  car_id: string
  plate_number: string
  model: string
  status: string
}

type Driver = {
  user_id: string
  full_name: string
  phone: string
}

export default function PackageUpdatePage() {
  const params = useParams()
  const router = useRouter()
  const packageId = params.packageId as string
  const { toast } = useToast()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [packageData, setPackageData] = useState<PackageData | null>(null)
  const [branches, setBranches] = useState<Branch[]>([])
  const [cars, setCars] = useState<Car[]>([])
  const [drivers, setDrivers] = useState<Driver[]>([])
  const [userRole, setUserRole] = useState<string>("")

  const [formData, setFormData] = useState({
    status: "",
    sender_name: "",
    sender_phone: "",
    sender_address: "",
    receiver_name: "",
    receiver_phone: "",
    receiver_address: "",
    weight_kg: 0,
    dimensions: "",
    description: "",
    special_instructions: "",
    origin_branch: "",
    destination_branch: "",
    assigned_car: "",
    assigned_driver: "",
    notes: "",
  })

  useEffect(() => {
    fetchPackageData()
    fetchBranches()
    fetchCars()
    fetchDrivers()
    fetchUserRole()
  }, [packageId])

  const fetchUserRole = async () => {
    try {
      const response = await fetch("/api/user/profile", { headers: authService.getAuthHeaders() })
      if (response.ok) {
        const data = await response.json()
        setUserRole(data.user.role)
      }
    } catch (error) {
      console.error("Error fetching user role:", error)
    }
  }

  const fetchPackageData = async () => {
    try {
      const response = await fetch(`/api/packages/${packageId}`, { headers: authService.getAuthHeaders() })
      if (!response.ok) throw new Error("Failed to fetch package")

      const data = await response.json()
      const pkg = data.package

      setPackageData(pkg)
      setFormData({
        status: pkg.status || "",
        sender_name: pkg.sender_name || "",
        sender_phone: pkg.sender_phone || "",
        sender_address: pkg.sender_address || "",
        receiver_name: pkg.receiver_name || "",
        receiver_phone: pkg.receiver_phone || "",
        receiver_address: pkg.receiver_address || "",
        // DB may use 'weight' or 'weight_kg'
        weight_kg: pkg.weight_kg ?? pkg.weight ?? 0,
        dimensions: pkg.dimensions || "",
        // DB may use 'package_description' or 'description'
        description: pkg.package_description ?? pkg.description ?? "",
        special_instructions: pkg.special_instructions || "",
        origin_branch: pkg.origin_branch_id ?? pkg.origin_branch ?? "",
        destination_branch: pkg.destination_branch_id ?? pkg.destination_branch ?? "",
  assigned_car: pkg.assigned_car || "",
  assigned_driver: (pkg.assigned_driver ?? pkg.agent_id) ?? "",
        notes: "",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load package data",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const fetchBranches = async () => {
    try {
      const response = await fetch("/api/branches", { headers: authService.getAuthHeaders() })
      if (response.ok) {
        const data = await response.json()
        setBranches(data.branches || [])
      }
    } catch (error) {
      console.error("Error fetching branches:", error)
    }
  }

  const fetchCars = async () => {
    try {
      const response = await fetch("/api/cars", { headers: authService.getAuthHeaders() })
      if (response.ok) {
        const data = await response.json()
        setCars(data.cars || [])
      }
    } catch (error) {
      console.error("Error fetching cars:", error)
    }
  }

  const fetchDrivers = async () => {
    try {
      const response = await fetch("/api/drivers", { headers: authService.getAuthHeaders() })
      if (response.ok) {
        const data = await response.json()
        setDrivers(data.drivers || [])
      }
    } catch (error) {
      console.error("Error fetching drivers:", error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      const response = await fetch(`/api/packages/${packageId}/update`, {
        method: "PUT",
        headers: { ...authService.getAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to update package")
      }

      toast({
        title: "Success",
        description: "Package updated successfully",
      })

      // Refresh package data
      await fetchPackageData()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update package",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  const statusOptions = [
    { value: "registered", label: "Registered" },
    { value: "picked_up", label: "Picked Up" },
    { value: "in_transit", label: "In Transit" },
    { value: "out_for_delivery", label: "Out for Delivery" },
    { value: "arrived", label: "Arrived" },
    { value: "delivered", label: "Delivered" },
    { value: "cancelled", label: "Cancelled" },
  ]

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="container mx-auto py-6 max-w-6xl">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/dashboard/packages">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <h2 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Update Package
              </h2>
              <p className="text-muted-foreground">
                {packageData?.tracking_number} • Last updated: {packageData?.updated_at ? new Date(packageData.updated_at).toLocaleString() : "N/A"}
              </p>
            </div>
          </div>
        </div>

        {/* Current Package Info Card */}
        <div className="mb-6 rounded-lg border bg-card p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                <PackageIcon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Package ID</p>
                <p className="font-semibold">{packageData?.package_id}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-purple-100 dark:bg-purple-900 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Current Status</p>
                <p className="font-semibold capitalize">{packageData?.status?.replace('_', ' ')}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
                <MapPin className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Origin</p>
                <p className="font-semibold truncate">{packageData?.origin_branch_name || "N/A"}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-orange-100 dark:bg-orange-900 flex items-center justify-center">
                <MapPin className="h-5 w-5 text-orange-600 dark:text-orange-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Destination</p>
                <p className="font-semibold truncate">{packageData?.destination_branch_name || "N/A"}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Update Form */}
        <form onSubmit={handleSubmit}>
          <div className="space-y-6">
            {/* Status & Assignment Section */}
            <div className="rounded-lg border bg-card p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Status & Assignment
              </h3>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="status">Package Status *</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value) => setFormData({ ...formData, status: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      {statusOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="assigned_car">Assigned Vehicle</Label>
                  <Select
                    value={formData.assigned_car}
                    onValueChange={(value) => setFormData({ ...formData, assigned_car: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select vehicle" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No Vehicle</SelectItem>
                      {cars.map((car) => (
                        <SelectItem key={car.car_id} value={car.car_id}>
                          {car.plate_number} - {car.model} ({car.status})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="assigned_driver">Assigned Driver</Label>
                  <Select
                    value={formData.assigned_driver}
                    onValueChange={(value) => setFormData({ ...formData, assigned_driver: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select driver" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No Driver</SelectItem>
                      {drivers.map((driver) => (
                        <SelectItem key={driver.user_id} value={driver.user_id}>
                          {driver.full_name} - {driver.phone}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="notes">Update Notes</Label>
                  <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Add notes about this update..."
                    rows={2}
                  />
                </div>
              </div>
            </div>

            {/* Sender Information */}
            <div className="rounded-lg border bg-card p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <User className="h-5 w-5" />
                Sender Information
              </h3>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="sender_name">Sender Name *</Label>
                  <Input
                    id="sender_name"
                    value={formData.sender_name}
                    onChange={(e) => setFormData({ ...formData, sender_name: e.target.value })}
                    placeholder="Enter sender name"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="sender_phone">Sender Phone *</Label>
                  <Input
                    id="sender_phone"
                    value={formData.sender_phone}
                    onChange={(e) => setFormData({ ...formData, sender_phone: e.target.value })}
                    placeholder="+250788123456"
                    required
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="sender_address">Sender Address *</Label>
                  <Textarea
                    id="sender_address"
                    value={formData.sender_address}
                    onChange={(e) => setFormData({ ...formData, sender_address: e.target.value })}
                    placeholder="Enter sender address"
                    rows={2}
                    required
                  />
                </div>
              </div>
            </div>

            {/* Receiver Information */}
            <div className="rounded-lg border bg-card p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <User className="h-5 w-5" />
                Receiver Information
              </h3>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="receiver_name">Receiver Name *</Label>
                  <Input
                    id="receiver_name"
                    value={formData.receiver_name}
                    onChange={(e) => setFormData({ ...formData, receiver_name: e.target.value })}
                    placeholder="Enter receiver name"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="receiver_phone">Receiver Phone *</Label>
                  <Input
                    id="receiver_phone"
                    value={formData.receiver_phone}
                    onChange={(e) => setFormData({ ...formData, receiver_phone: e.target.value })}
                    placeholder="+250788123456"
                    required
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="receiver_address">Receiver Address *</Label>
                  <Textarea
                    id="receiver_address"
                    value={formData.receiver_address}
                    onChange={(e) => setFormData({ ...formData, receiver_address: e.target.value })}
                    placeholder="Enter receiver address"
                    rows={2}
                    required
                  />
                </div>
              </div>
            </div>

            {/* Package Details */}
            <div className="rounded-lg border bg-card p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <PackageIcon className="h-5 w-5" />
                Package Details
              </h3>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="weight_kg">Weight (kg) *</Label>
                  <Input
                    id="weight_kg"
                    type="number"
                    step="0.01"
                    value={formData.weight_kg}
                    onChange={(e) => setFormData({ ...formData, weight_kg: parseFloat(e.target.value) })}
                    placeholder="0.00"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="dimensions">Dimensions</Label>
                  <Input
                    id="dimensions"
                    value={formData.dimensions}
                    onChange={(e) => setFormData({ ...formData, dimensions: e.target.value })}
                    placeholder="e.g., 50x40x30 cm"
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="description">Description *</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Describe the package contents"
                    rows={3}
                    required
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="special_instructions">Special Instructions</Label>
                  <Textarea
                    id="special_instructions"
                    value={formData.special_instructions}
                    onChange={(e) => setFormData({ ...formData, special_instructions: e.target.value })}
                    placeholder="Any special handling instructions"
                    rows={2}
                  />
                </div>
              </div>
            </div>

            {/* Route Information */}
            <div className="rounded-lg border bg-card p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Route Information
              </h3>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="origin_branch">Origin Branch *</Label>
                  <Select
                    value={formData.origin_branch}
                    onValueChange={(value) => setFormData({ ...formData, origin_branch: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select origin branch" />
                    </SelectTrigger>
                    <SelectContent>
                      {branches.map((branch) => (
                        <SelectItem key={branch.branch_id} value={branch.branch_id}>
                          {branch.branch_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="destination_branch">Destination Branch *</Label>
                  <Select
                    value={formData.destination_branch}
                    onValueChange={(value) => setFormData({ ...formData, destination_branch: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select destination branch" />
                    </SelectTrigger>
                    <SelectContent>
                      {branches.map((branch) => (
                        <SelectItem key={branch.branch_id} value={branch.branch_id}>
                          {branch.branch_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-3 pt-4">
              <Link href="/dashboard/packages">
                <Button type="button" variant="outline">
                  Cancel
                </Button>
              </Link>
              <Button type="submit" disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Updating...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Update Package
                  </>
                )}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </DashboardLayout>
  )
}
