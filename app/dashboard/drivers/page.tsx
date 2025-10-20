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
import { Controller, useForm } from "react-hook-form"
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
    // Log selected driver and current form values to browser console
    console.log('useEffect selectedDriver -> form values', selectedDriver, form.getValues())
  }, [selectedDriver, form])

  // Log selectedDriver, cars and branches when they change for debugging
  useEffect(() => {
    console.log('Debug selectedDriver changed:', selectedDriver)
  }, [selectedDriver])

  useEffect(() => {
    console.log('Debug cars list:', cars)
  }, [cars])

  useEffect(() => {
    console.log('Debug branches list:', branches)
  }, [branches])

  // Subscribe to form changes and log values to console for debugging
  useEffect(() => {
    const subscription = form.watch((values) => {
      // Log live form values to console for debugging
      console.log('form.watch values:', values)
    })
    return () => {
      subscription.unsubscribe()
    }
  }, [form])

  // Log form state when the edit dialog opens to help diagnose render/timing issues
  useEffect(() => {
    if (dialogOpen) {
      console.log('Dialog opened. selectedDriver:', selectedDriver)
      console.log('Dialog opened. form.getValues():', form.getValues())
      console.log('Dialog opened. cars:', cars)
      console.log('Dialog opened. branches:', branches)
    }
  }, [dialogOpen, selectedDriver, cars, branches, form])

  // Ensure form assigned_car value is set when selectedDriver or cars change
  useEffect(() => {
    if (selectedDriver && dialogOpen) {
      const currentValue = form.getValues('assigned_car')
      const expectedValue = selectedDriver.assigned_car ?? 'none'
      if (currentValue !== expectedValue) {
        form.setValue('assigned_car', expectedValue)
        console.log('Updated form assigned_car to:', expectedValue)
      }
    }
  }, [selectedDriver, cars, dialogOpen, form])

  const fetchDrivers = async () => {
    try {
      const data = await apiService.getDrivers()
      // Normalize driver shape from API (some routes return different field names)
  const normalized = (data.drivers || []).map((d: any) => ({
        driver_id: d.driver_id,
        full_name: d.full_name,
        phone: d.phone,
        license_number: d.license_number,
        // prefer the explicit assigned_car column, fall back to assigned_car_id
        assigned_car: d.assigned_car ?? d.assigned_car_id ?? null,
        // prefer convenient fields from joins
        branch_id: d.branch_id ?? d.branchId ?? null,
        branch_name: d.branch_name ?? d.branch_name ?? (d.branch ? d.branch.branch_name : undefined) ?? '',
        plate_number: d.plate_number ?? d.assigned_car_plate ?? d.plate_number ?? null,
        model: d.model ?? d.assigned_car_model ?? null,
      }))

      setDrivers(normalized)
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
      const normalized = ((data.branches || []) as any[]).map((b: any) => ({
        branch_id: b.branch_id ?? b.branchId ?? b.id,
        branch_name: b.branch_name ?? b.name ?? b.branchName,
      }))
      setBranches(normalized)
      return normalized
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch branches",
        variant: "destructive",
      })
      return []
    }
  }

  const fetchCars = async () => {
    try {
      const data = await apiService.getCars()
      const normalized = ((data.cars || []) as any[]).map((c: any) => ({
        car_id: c.car_id ?? c.carId ?? c.id,
  plate_number: (c.plate_number ?? c.plateNumber ?? c.plate) || '',
        model: c.model ?? c.model_name ?? '',
        status: (c.status ?? c.state ?? 'available') as string,
      }))

      // Sort so available cars appear first, then others — this makes picking easier
      normalized.sort((a: any, b: any) => {
        const rank = (s: string) => s === 'available' ? 0 : 1
        return rank(a.status) - rank(b.status)
      })
      setCars(normalized)
      return normalized
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch cars",
        variant: "destructive",
      })
      return []
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
  const updateRes = await apiService.updateDriver(selectedDriver.driver_id, payload)
  console.log("Update response:", updateRes)
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

  const createRes = await apiService.createDriver(payload)
  console.log("Create response:", createRes)
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
      console.log('handleEdit invoked for driver:', driver)
      
      // Ensure branches and cars are loaded before proceeding
      let currentBranches = branches
      let currentCars = cars
      
      if (currentBranches.length === 0) {
        console.log('Branches not loaded, fetching...')
        currentBranches = await fetchBranches()
        console.log('Fetched branches:', currentBranches)
      }
      if (currentCars.length === 0) {
        console.log('Cars not loaded, fetching...')
        currentCars = await fetchCars()
      }
      
      // Fetch the freshest driver record from the server
      const res = await apiService.getDriver(driver.driver_id)
      console.log('handleEdit: raw getDriver response', res)
      const freshRaw = res.driver || res

      // normalize fresh driver
      const fresh = {
        driver_id: freshRaw.driver_id,
        full_name: freshRaw.full_name,
        phone: freshRaw.phone,
        license_number: freshRaw.license_number,
        assigned_car: freshRaw.assigned_car ?? freshRaw.assigned_car_id ?? null,
        branch_id: freshRaw.branch_id ?? freshRaw.branchId ?? '',
        branch_name: freshRaw.branch_name ?? freshRaw.branch_name ?? '',
        plate_number: freshRaw.plate_number ?? freshRaw.assigned_car_plate ?? null,
        model: freshRaw.model ?? freshRaw.assigned_car_model ?? null,
      } as Driver

      // populate the form with the DB values immediately
      console.log('handleEdit: normalized fresh driver', fresh)
      form.reset({
        full_name: fresh.full_name || '',
        phone: fresh.phone || '',
        license_number: fresh.license_number || '',
        assigned_car: fresh.assigned_car ?? 'none',
        branch_id: fresh.branch_id || '',
      })

      // Also set individual values explicitly to avoid issues with custom inputs
      try {
        form.setValue('full_name', fresh.full_name || '')
        form.setValue('phone', fresh.phone || '')
        form.setValue('license_number', fresh.license_number || '')
        form.setValue('assigned_car', fresh.assigned_car ?? 'none')
        form.setValue('branch_id', fresh.branch_id || '')
      } catch (e) {
        console.warn('form.setValue failed (this may be fine on initial mount):', e)
      }

      // Set selected driver state for UI and dialog title
      setSelectedDriver(fresh)

      // If the driver has an assigned car that isn't in our `cars` list (for example it's not 'available'),
      // fetch that car and add it so the Select can display the current assignment.
      if (fresh.assigned_car) {
  const alreadyHas = cars.some((c: Car) => c.car_id === fresh.assigned_car)
        if (!alreadyHas) {
          try {
            const { car } = await apiService.getCar(fresh.assigned_car)
            console.log('handleEdit: fetched assigned car', car)
            const normalizedCar = {
              car_id: car.car_id ?? car.carId ?? car.id,
              plate_number: (car.plate_number ?? car.plateNumber ?? car.plate) || '',
              model: car.model ?? car.model_name ?? '',
              status: car.status ?? 'busy',
            }
            // prepend and wait for state update (no direct await, but keep order before opening)
            setCars((prev: Car[]) => [normalizedCar as Car, ...prev])
          } catch (err) {
            console.warn('Failed to fetch assigned car', err)
          }
        }
      }

      // Small tick to allow React to flush state updates (cars) before opening the dialog
      await Promise.resolve()
      console.log('form values after reset (before opening):', form.getValues())
      console.log('Available branches:', currentBranches)
      console.log('Selected branch_id:', fresh.branch_id)
      console.log('Branch exists in list?', currentBranches.some(b => b.branch_id === fresh.branch_id))
      
      // Force update the branch_id after a tick to ensure Select is ready
      setTimeout(() => {
        if (fresh.branch_id) {
          form.setValue('branch_id', fresh.branch_id, { shouldValidate: false, shouldDirty: true })
          console.log('Force set branch_id to:', fresh.branch_id)
        }
      }, 100)
      
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

  // Ensure the Select options always contain the currently assigned car (even if it's not in `cars`)
  const mergedCars = (() => {
    if (!selectedDriver || !selectedDriver.assigned_car) return cars
    const has = cars.some((c) => c.car_id === selectedDriver.assigned_car)
    if (has) return cars
    // Build a minimal representation from selectedDriver to show in the list
    const extra: Car = {
      car_id: selectedDriver.assigned_car,
      plate_number: selectedDriver.plate_number || selectedDriver.assigned_car,
      model: selectedDriver.model || '',
      status: 'assigned',
    }
    return [extra, ...cars]
  })()

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
                <Controller
                  control={form.control}
                  name="full_name"
                  render={({ field }) => (
                    <Input id="full_name" {...field} placeholder="Full Name" />
                  )}
                />
                {form.formState.errors.full_name && (
                  <p className="text-sm text-red-500">
                    {form.formState.errors.full_name.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Controller
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <Input id="phone" {...field} placeholder="+2507xxxxx" />
                  )}
                />
                {form.formState.errors.phone && (
                  <p className="text-sm text-red-500">
                    {form.formState.errors.phone.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="license_number">License Number</Label>
                <Controller
                  control={form.control}
                  name="license_number"
                  render={({ field }) => (
                    <Input id="license_number" {...field} placeholder="License Number" />
                  )}
                />
                {form.formState.errors.license_number && (
                  <p className="text-sm text-red-500">
                    {form.formState.errors.license_number.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="assigned_car">Assigned Vehicle</Label>
                <Controller
                  control={form.control}
                  name="assigned_car"
                  render={({ field }) => (
                    <Select key={field.value} value={field.value ?? "none"} onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select vehicle">
                          {field.value && field.value !== "none" 
                            ? mergedCars.find(c => c.car_id === field.value)?.plate_number || field.value
                            : "None"}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        {mergedCars.map((car) => (
                          <SelectItem key={car.car_id} value={car.car_id}>
                            {car.plate_number} - {car.model} {car.status ? `— ${car.status}` : ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {form.formState.errors.assigned_car && (
                  <p className="text-sm text-red-500">
                    {form.formState.errors.assigned_car.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="branch">Assigned Branch</Label>
                <Controller
                  control={form.control}
                  name="branch_id"
                  render={({ field }) => {
                    console.log('Branch Select render - field.value:', field.value)
                    console.log('Branch Select render - branches:', branches)
                    const selectedBranch = branches.find(b => b.branch_id === field.value)
                    console.log('Branch Select render - selectedBranch:', selectedBranch)
                    
                    return (
                      <Select 
                        value={field.value || undefined} 
                        onValueChange={(value) => {
                          console.log('Branch selected:', value)
                          field.onChange(value)
                        }}
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
                    )
                  }}
                />
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
        {/* debug information is now logged to the browser console only */}
      </div>

      <div className="w-full rounded-lg border bg-card overflow-hidden">
        {/* header labels removed per user request; compact list only */}

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