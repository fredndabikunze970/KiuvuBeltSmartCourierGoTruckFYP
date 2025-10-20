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
  const [dialogOpen, setDialogOpen] = useState(false)
  const [dialogLoading, setDialogLoading] = useState(false)
  const { toast } = useToast()

  const form = useForm<DriverFormData>({
    resolver: zodResolver(driverSchema),
    defaultValues: {
      full_name: "",
      phone: "",
      license_number: "",
      // use a non-empty sentinel for the Select control
      assigned_car: "none",
      branch_id: "",
    },
  })

  useEffect(() => {
    Promise.all([fetchDrivers(), fetchBranches(), fetchCars()])
  }, [])

  useEffect(() => {
    if (selectedDriver) {
      // Pre-populate form with selected driver data
      form.reset({
        full_name: selectedDriver.full_name || '',
        phone: selectedDriver.phone || '',
        license_number: selectedDriver.license_number || '',
        assigned_car: selectedDriver.assigned_car || "none",
        branch_id: selectedDriver.branch_id || '',
      })
    } else {
      // Reset form for new driver creation
      form.reset({
        full_name: '',
        phone: '',
        license_number: '',
        assigned_car: "none",
        branch_id: '',
      })
    }
  }, [selectedDriver, form])

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
      console.log("Form data being submitted:", data)

      if (selectedDriver) {
        // For updates, send all the form data directly
        const payload = {
          full_name: data.full_name?.trim() || selectedDriver.full_name,
          phone: data.phone?.trim() || selectedDriver.phone,
          license_number: data.license_number?.trim() || selectedDriver.license_number,
          assigned_car: data.assigned_car === "none" ? null : (data.assigned_car || selectedDriver.assigned_car),
          branch_id: data.branch_id?.trim() || selectedDriver.branch_id,
        }

        console.log("Update payload:", payload)
        await apiService.updateDriver(selectedDriver.driver_id, payload)
        toast({
          title: "Success",
          description: "Driver updated successfully",
        })
      } else {
        // For creation, send all required fields
        const payload = {
          full_name: data.full_name || '',
          phone: data.phone || '',
          license_number: data.license_number || '',
          assigned_car: data.assigned_car === "none" ? null : (data.assigned_car || null),
          branch_id: data.branch_id || '',
        }

        await apiService.createDriver(payload)
        toast({
          title: "Success",
          description: "Driver created successfully",
        })
      }

      fetchDrivers()
      // Reset form and close dialog
      form.reset({
        full_name: '',
        phone: '',
        license_number: '',
        assigned_car: "none",
        branch_id: '',
      })
      setSelectedDriver(null)
      setDialogOpen(false)
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

  const handleEdit = async (driver: Driver) => {
    try {
      setDialogLoading(true)
      // Fetch the freshest driver record from the server
      const res = await apiService.getDriver(driver.driver_id)
      const fresh = res.driver
      setSelectedDriver(fresh as Driver)

      // populate the form with the DB values
      form.reset({
        full_name: fresh.full_name || "",
        phone: fresh.phone || "",
        license_number: fresh.license_number || "",
        // keep the Select sentinel when there's no assigned car
        assigned_car: fresh.assigned_car ?? "none",
        branch_id: fresh.branch_id || "",
      })

      // Set selectedDriver to trigger the useEffect that populates the form
      setSelectedDriver(fresh as Driver)

      // If the driver has an assigned car that isn't in our `cars` list (for example it's not 'available'),
      // fetch that car and add it so the Select can display the current assignment.
      if (fresh.assigned_car) {
        const alreadyHas = cars.some((c) => c.car_id === fresh.assigned_car)
        if (!alreadyHas) {
          try {
            const { car } = await apiService.getCar(fresh.assigned_car)
            // normalize shape to our Car type and prepend so it's visible
            setCars((prev) => [
              {
                car_id: car.car_id,
                plate_number: car.plate_number,
                model: car.model,
                status: car.status,
              },
              ...prev,
            ])
          } catch (err) {
            // ignore fetch error; Select will show sentinel if we can't fetch the car
            console.warn('Failed to fetch assigned car', err)
          }
        }
      }

      setDialogOpen(true)
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load driver details",
        variant: "destructive",
      })
    } finally {
      setDialogLoading(false)
    }
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
          <h2 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Driver Management
          </h2>
          <p className="text-muted-foreground">
            Manage your delivery drivers and their assignments
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(v) => setDialogOpen(v)}>
          <DialogTrigger asChild>
            <Button onClick={() => {
              // Prepare for creating a new driver
              setSelectedDriver(null)
              form.reset({
                full_name: "",
                phone: "",
                license_number: "",
                assigned_car: "none",
                branch_id: "",
              })
              setDialogOpen(true)
            }}>
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
                  placeholder="Full Name"
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
                  placeholder="+2507xxxxx"
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
                  placeholder="License Number"
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
                  // Use a non-empty sentinel value for "no vehicle". Watch keeps the control in sync.
                  value={form.watch("assigned_car") ?? "none"}
                  onValueChange={(value) => form.setValue("assigned_car", value)}
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
                  value={form.watch("branch_id") || ""}
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
                  setDialogOpen(false)
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
                    <div className="text-xs text-muted-foreground">{driver.license_number}</div>
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