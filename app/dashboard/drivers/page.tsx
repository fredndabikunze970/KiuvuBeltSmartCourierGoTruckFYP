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
import { getStatusColor } from "@/lib/utils"
import { driverSchema } from "@/lib/validations/management"
import { zodResolver } from "@hookform/resolvers/zod"
import { Edit, Loader2, Plus, Trash, Users } from "lucide-react"
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
                  // Use a non-empty sentinel value for "no vehicle" and map it to null in the form
                  value={form.getValues("assigned_car") ?? "none"}
                  onValueChange={(value) => form.setValue("assigned_car", value === "none" ? null : value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select vehicle" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
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

      <div className="w-full rounded-lg border bg-card overflow-hidden">
        {/* Header row for medium+ screens */}
        <div className="hidden md:grid grid-cols-12 gap-4 p-3 text-sm font-medium text-muted-foreground bg-muted/5">
          <div className="col-span-3">Driver</div>
          <div className="col-span-2">Phone</div>
          <div className="col-span-2">Branch</div>
          <div className="col-span-2">Vehicle</div>
          <div className="col-span-1">Status</div>
          <div className="col-span-2 text-right">Actions</div>
        </div>

        <div className="divide-y">
          {loading ? (
            <div className="flex items-center justify-center h-[200px] p-6">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : drivers.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-[200px] p-6 space-y-4">
              <Users className="h-8 w-8 text-muted-foreground" />
              <div className="text-lg font-medium text-muted-foreground">No drivers found</div>
              <p className="text-sm text-muted-foreground">Add your first driver to get started.</p>
            </div>
          ) : (
            drivers.map((driver) => (
              <div key={driver.driver_id} className="grid grid-cols-12 gap-4 items-center p-4 hover:bg-muted/5">
                <div className="col-span-12 md:col-span-3 flex items-center gap-3">
                  <Avatar>
                    <AvatarFallback>{getInitials(driver.full_name)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="font-semibold">{driver.full_name}</div>
                    <div className="text-xs text-muted-foreground md:hidden">{driver.license_number}</div>
                  </div>
                </div>

                <div className="col-span-6 md:col-span-2 text-sm">
                  <div className="font-medium">{driver.phone}</div>
                </div>

                <div className="col-span-6 md:col-span-2 text-sm">
                  <div className="font-medium">{driver.branch_name}</div>
                </div>

                <div className="col-span-6 md:col-span-2 text-sm">
                  <div className="font-medium">
                    {driver.plate_number && driver.model
                      ? `${driver.plate_number} · ${driver.model}`
                      : driver.assigned_car
                        ? driver.assigned_car
                        : '—'}
                  </div>
                </div>

                <div className="col-span-6 md:col-span-1 text-sm">
                  <div className="mt-1">
                    <Badge className={`${driver.assigned_car ? getStatusColor('in_transit') : getStatusColor('pending')} px-3 py-1 rounded-full text-xs`}>
                      {driver.assigned_car ? 'On Duty' : 'Available'}
                    </Badge>
                  </div>
                </div>

                <div className="col-span-12 md:col-span-2 flex justify-end items-center space-x-2">
                  <Button size="icon" variant="ghost" onClick={() => handleEdit(driver)} aria-label={`Edit ${driver.full_name}`}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="ghost" onClick={() => handleDelete(driver.driver_id)} aria-label={`Delete ${driver.full_name}`}>
                    <Trash className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
    </DashboardLayout>
  )
}