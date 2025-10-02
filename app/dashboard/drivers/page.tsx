"use client"

import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { apiService } from "@/lib/api"
import { driverSchema } from "@/lib/validations/management"
import { zodResolver } from "@hookform/resolvers/zod"
import { Car as CarIcon, Edit, Loader2, Phone, Plus, Trash, Users } from "lucide-react"
import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import type * as z from "zod"

type Driver = {
  driver_id: string
  full_name: string
  phone: string
  license_number: string
  assigned_car: string | null
  branch_id: string
  branch_name: string
  plate_number?: string
  model?: string
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

type DriverFormData = z.infer<typeof driverSchema>

export default function DriverManagementPage() {
  const [drivers, setDrivers] = useState<Driver[]>([])
  const [branches, setBranches] = useState<Branch[]>([])
  const [cars, setCars] = useState<Car[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null)
  const { toast } = useToast()

  const form = useForm<DriverFormData>({
    resolver: zodResolver(driverSchema),
    defaultValues: {
      full_name: "",
      phone: "",
      license_number: "",
      assigned_car: null,
      branch_id: "",
    },
  })

  useEffect(() => {
    Promise.all([fetchDrivers(), fetchBranches(), fetchCars()])
  }, [])

  const fetchDrivers = async () => {
    try {
      const data = await apiService.getDrivers()
      setDrivers(data.drivers)
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch drivers",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const fetchBranches = async () => {
    try {
      const data = await apiService.getBranches()
      setBranches(data.branches)
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch branches",
        variant: "destructive",
      })
    }
  }

  const fetchCars = async () => {
    try {
      const data = await apiService.getCars()
      setCars(data.cars.filter(car => car.status === "available"))
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch cars",
        variant: "destructive",
      })
    }
  }

  const onSubmit = async (data: DriverFormData) => {
    try {
      if (selectedDriver) {
        await apiService.updateDriver(selectedDriver.driver_id, data)
        toast({
          title: "Success",
          description: "Driver updated successfully",
        })
      } else {
        await apiService.createDriver(data)
        toast({
          title: "Success",
          description: "Driver created successfully",
        })
      }
      
      fetchDrivers()
      form.reset()
      setSelectedDriver(null)
    } catch (error) {
      toast({
        title: "Error",
        description: selectedDriver ? "Failed to update driver" : "Failed to create driver",
        variant: "destructive",
      })
    }
  }

  const handleDelete = async (driverId: string) => {
    if (!confirm("Are you sure you want to delete this driver?")) return

    try {
      await apiService.deleteDriver(driverId)
      toast({
        title: "Success",
        description: "Driver deleted successfully",
      })
      fetchDrivers()
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete driver",
        variant: "destructive",
      })
    }
  }

  const handleEdit = (driver: Driver) => {
    setSelectedDriver(driver)
    form.reset({
      full_name: driver.full_name,
      phone: driver.phone,
      license_number: driver.license_number,
      assigned_car: driver.assigned_car,
      branch_id: driver.branch_id,
    })
  }

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
  }

  return (
    <DashboardLayout>
      <div className="h-full flex-1 flex-col space-y-8 p-8 md:flex">
        <div className="flex items-center justify-between space-y-2">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Driver Management</h2>
          <p className="text-muted-foreground">
            Manage your delivery drivers and their assignments
          </p>
        </div>
        <Dialog>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Driver
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{selectedDriver ? "Edit Driver" : "Add New Driver"}</DialogTitle>
              <DialogDescription>
                {selectedDriver
                  ? "Update the driver information below"
                  : "Fill in the driver details below"}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="full_name">Full Name</Label>
                <Input
                  id="full_name"
                  {...form.register("full_name")}
                  placeholder="John Doe"
                />
                {form.formState.errors.full_name && (
                  <p className="text-sm text-red-500">
                    {form.formState.errors.full_name.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  {...form.register("phone")}
                  placeholder="+250788123456"
                />
                {form.formState.errors.phone && (
                  <p className="text-sm text-red-500">
                    {form.formState.errors.phone.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="license_number">License Number</Label>
                <Input
                  id="license_number"
                  {...form.register("license_number")}
                  placeholder="DL12345"
                />
                {form.formState.errors.license_number && (
                  <p className="text-sm text-red-500">
                    {form.formState.errors.license_number.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="assigned_car">Assigned Vehicle</Label>
                <Select
                  value={form.getValues("assigned_car") || ""}
                  onValueChange={(value) => form.setValue("assigned_car", value || null)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select vehicle" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">None</SelectItem>
                    {cars.map((car) => (
                      <SelectItem key={car.car_id} value={car.car_id}>
                        {car.plate_number} - {car.model}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {form.formState.errors.assigned_car && (
                  <p className="text-sm text-red-500">
                    {form.formState.errors.assigned_car.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="branch">Assigned Branch</Label>
                <Select
                  value={form.getValues("branch_id")}
                  onValueChange={(value) => form.setValue("branch_id", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select branch" />
                  </SelectTrigger>
                  <SelectContent>
                    {branches.map((branch) => (
                      <SelectItem key={branch.branch_id} value={branch.branch_id}>
                        {branch.branch_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {form.formState.errors.branch_id && (
                  <p className="text-sm text-red-500">
                    {form.formState.errors.branch_id.message}
                  </p>
                )}
              </div>

              <DialogFooter>
                <Button variant="outline" type="button" onClick={() => {
                  form.reset()
                  setSelectedDriver(null)
                }}>
                  Cancel
                </Button>
                <Button type="submit">{selectedDriver ? "Update" : "Create"}</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="border rounded-lg">
        {loading ? (
          <div className="flex items-center justify-center h-[450px]">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : drivers.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-[450px] space-y-4">
            <Users className="h-8 w-8 text-muted-foreground" />
            <div className="text-lg font-medium text-muted-foreground">No drivers found</div>
            <p className="text-sm text-muted-foreground">Add your first driver to get started.</p>
          </div>
        ) : (
          <div className="grid gap-4 p-6 md:grid-cols-2 lg:grid-cols-3">
            {drivers.map((driver) => (
          <div
            key={driver.driver_id}
            className="p-4 border rounded-lg bg-card hover:bg-accent/5 transition-colors space-y-4"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-3">
                <Avatar>
                  <AvatarFallback>{getInitials(driver.full_name)}</AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="font-semibold">{driver.full_name}</h3>
                  <p className="text-sm text-muted-foreground">{driver.license_number}</p>
                </div>
              </div>
              <div className="flex space-x-2">
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => handleEdit(driver)}
                >
                  <Edit className="h-4 w-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => handleDelete(driver.driver_id)}
                >
                  <Trash className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center space-x-2 text-sm">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span>{driver.phone}</span>
              </div>
              <div className="flex items-center space-x-2 text-sm">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span>{driver.branch_name}</span>
              </div>
              {driver.assigned_car && (
                <div className="flex items-center space-x-2 text-sm">
                  <CarIcon className="h-4 w-4 text-muted-foreground" />
                  <span>
                    {driver.plate_number} - {driver.model}
                  </span>
                </div>
              )}
            </div>

            <Badge variant={driver.assigned_car ? "default" : "secondary"}>
              {driver.assigned_car ? "On Duty" : "Available"}
            </Badge>
          </div>
        ))}
          </div>
        )}
      </div>
    </div>
    </DashboardLayout>
  )
}