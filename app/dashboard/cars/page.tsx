"use client"

import { DashboardLayout } from "@/components/layout/dashboard-layout"
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
import { carSchema } from "@/lib/validations/management"
import { zodResolver } from "@hookform/resolvers/zod"
import { Car as CarIcon, Edit, Loader2, Plus, Trash } from "lucide-react"
import { useEffect, useState } from "react"
import { Controller, useForm } from "react-hook-form"
import type * as z from "zod"

type Car = {
  car_id: string
  plate_number: string
  model: string
  capacity_kg: number
  status: "available" | "in_transit" | "maintenance" | "retired"
  branch_id: string
  branch_name: string
}

type Branch = {
  branch_id: string
  branch_name: string
}

type CarFormData = z.infer<typeof carSchema>

export default function CarManagementPage() {
  const [cars, setCars] = useState<Car[]>([])
  const [branches, setBranches] = useState<Branch[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedCar, setSelectedCar] = useState<Car | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const { toast } = useToast()

  const form = useForm<CarFormData>({
    resolver: zodResolver(carSchema),
    defaultValues: {
      plate_number: "",
      model: "",
      capacity_kg: 0,
      status: "available",
      branch_id: "",
    },
    mode: "onChange",
  })

  useEffect(() => {
    Promise.all([fetchCars(), fetchBranches()])
  }, [])

  useEffect(() => {
    if (selectedCar) {
      console.log('useEffect - selectedCar changed:', selectedCar)
      form.reset({
        plate_number: selectedCar.plate_number || '',
        model: selectedCar.model || '',
        capacity_kg: Number(selectedCar.capacity_kg) || 0,
        status: selectedCar.status || 'available',
        branch_id: selectedCar.branch_id || '',
      })
      console.log('useEffect - form values after reset:', form.getValues())
    }
  }, [selectedCar, form])

  const fetchCars = async () => {
    try {
      const data = await apiService.getCars()
      setCars(data.cars)
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch cars",
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
      return data.branches
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch branches",
        variant: "destructive",
      })
      return []
    }
  }

  const onSubmit = async (data: CarFormData) => {
    try {
      if (selectedCar) {
        await apiService.updateCar(selectedCar.car_id, data)
        toast({
          title: "Success",
          description: "Car updated successfully",
        })
      } else {
        await apiService.createCar(data)
        toast({
          title: "Success",
          description: "Car created successfully",
        })
      }
      
      fetchCars()
      form.reset()
      setSelectedCar(null)
      setDialogOpen(false)
    } catch (error) {
      toast({
        title: "Error",
        description: selectedCar ? "Failed to update car" : "Failed to create car",
        variant: "destructive",
      })
    }
  }

  const handleDelete = async (carId: string) => {
    if (!confirm("Are you sure you want to delete this car?")) return

    try {
      await apiService.deleteCar(carId)
      toast({
        title: "Success",
        description: "Car deleted successfully",
      })
      fetchCars()
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete car",
        variant: "destructive",
      })
    }
  }

  const handleEdit = async (car: Car) => {
    try {
      // Fetch branches if not loaded
      if (branches.length === 0) {
        await fetchBranches()
      }
      
      // Fetch fresh car data from server
      const res = await apiService.getCar(car.car_id)
      console.log('Fresh car data:', res)
      const freshCar = res.car || res
      
      // Normalize the car data
      const normalized: Car = {
        car_id: freshCar.car_id || car.car_id,
        plate_number: freshCar.plate_number || car.plate_number || '',
        model: freshCar.model || car.model || '',
        capacity_kg: Number(freshCar.capacity_kg || car.capacity_kg || 0),
        status: freshCar.status || car.status || 'available',
        branch_id: freshCar.branch_id || car.branch_id || '',
        branch_name: freshCar.branch_name || car.branch_name || '',
      }
      
      console.log('Normalized car:', normalized)
      console.log('Form before reset:', form.getValues())
      
      // Reset form with fresh data
      form.reset({
        plate_number: normalized.plate_number,
        model: normalized.model,
        capacity_kg: normalized.capacity_kg,
        status: normalized.status,
        branch_id: normalized.branch_id,
      })
      
      console.log('Form after reset:', form.getValues())
      
      // Set selected car AFTER form reset
      setSelectedCar(normalized)
      
      // Force set values explicitly after a small delay
      setTimeout(() => {
        form.setValue('plate_number', normalized.plate_number, { shouldValidate: false })
        form.setValue('model', normalized.model, { shouldValidate: false })
        form.setValue('capacity_kg', normalized.capacity_kg, { shouldValidate: false })
        form.setValue('status', normalized.status, { shouldValidate: false })
        form.setValue('branch_id', normalized.branch_id, { shouldValidate: false })
        console.log('Form values force set:', form.getValues())
      }, 50)
      
      setDialogOpen(true)
    } catch (error) {
      console.error('Error fetching car:', error)
      toast({
        title: "Error",
        description: "Failed to load car details",
        variant: "destructive",
      })
    }
  }

  // Use shared getStatusColor from lib/utils for consistent color tokens

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <DashboardLayout>
      <div className="container mx-auto py-6">
        <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Car Fleet Management
          </h2>
          <p className="text-muted-foreground">Manage your delivery vehicles and assignments</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(v) => setDialogOpen(v)}>
          <DialogTrigger asChild>
            <Button onClick={() => {
              // prepare add
              setSelectedCar(null)
              form.reset({
                plate_number: "",
                model: "",
                capacity_kg: 0,
                status: "available",
                branch_id: "",
              })
              setDialogOpen(true)
            }}>
              <Plus className="h-4 w-4 mr-2" />
              Add Vehicle
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{selectedCar ? "Edit Vehicle" : "Add New Vehicle"}</DialogTitle>
              <DialogDescription>
                {selectedCar
                  ? "Update the vehicle information below"
                  : "Fill in the vehicle details below"}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="plate_number">Plate Number</Label>
                <Controller
                  control={form.control}
                  name="plate_number"
                  render={({ field }) => (
                    <Input
                      id="plate_number"
                      {...field}
                      placeholder="e.g., RAB123A"
                    />
                  )}
                />
                {form.formState.errors.plate_number && (
                  <p className="text-sm text-red-500">
                    {form.formState.errors.plate_number.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="model">Model</Label>
                <Controller
                  control={form.control}
                  name="model"
                  render={({ field }) => (
                    <Input
                      id="model"
                      {...field}
                      placeholder="e.g., Toyota Hilux"
                    />
                  )}
                />
                {form.formState.errors.model && (
                  <p className="text-sm text-red-500">
                    {form.formState.errors.model.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="capacity_kg">Capacity (kg)</Label>
                <Controller
                  control={form.control}
                  name="capacity_kg"
                  render={({ field }) => (
                    <Input
                      id="capacity_kg"
                      type="number"
                      step="0.1"
                      {...field}
                      onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                    />
                  )}
                />
                {form.formState.errors.capacity_kg && (
                  <p className="text-sm text-red-500">
                    {form.formState.errors.capacity_kg.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Controller
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="available">Available</SelectItem>
                        <SelectItem value="in_transit">In Transit</SelectItem>
                        <SelectItem value="maintenance">Maintenance</SelectItem>
                        <SelectItem value="retired">Retired</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
                {form.formState.errors.status && (
                  <p className="text-sm text-red-500">
                    {form.formState.errors.status.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="branch">Assigned Branch</Label>
                <Controller
                  control={form.control}
                  name="branch_id"
                  render={({ field }) => (
                    <Select value={field.value || ""} onValueChange={field.onChange}>
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
                  )}
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
                  setSelectedCar(null)
                  setDialogOpen(false)
                }}>
                  Cancel
                </Button>
                <Button type="submit">{selectedCar ? "Update" : "Create"}</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="w-full rounded-lg border bg-card overflow-hidden">
        {/* Header row */}
        <div className="hidden md:grid grid-cols-12 gap-4 p-3 text-sm font-medium text-muted-foreground bg-muted/5">
          <div className="col-span-2">Plate</div>
          <div className="col-span-3">Model</div>
          <div className="col-span-2">Capacity</div>
          <div className="col-span-2">Branch</div>
          <div className="col-span-1">Status</div>
          <div className="col-span-2 text-right">Actions</div>
        </div>

        {/* List rows */}
        <div className="divide-y">
          {cars.map((car) => (
            <div key={car.car_id} className="grid grid-cols-12 gap-4 items-center p-4 hover:bg-muted/5">
              <div className="col-span-12 md:col-span-2 flex items-center gap-3">
                <CarIcon className="h-5 w-5 text-primary" />
                <div>
                  <div className="font-semibold">{car.plate_number}</div>
                  <div className="text-xs text-muted-foreground md:hidden">{car.model}</div>
                </div>
              </div>

              <div className="hidden md:block col-span-3 text-sm text-foreground">{car.model}</div>

              <div className="col-span-6 md:col-span-2 text-sm">
                <div className="font-medium">{car.capacity_kg} kg</div>
              </div>

              <div className="col-span-6 md:col-span-2 text-sm">
                <div className="font-medium">{car.branch_name}</div>
              </div>

              <div className="col-span-6 md:col-span-1 text-sm">
                <div className="mt-1">
                  <Badge className={`${getStatusColor(car.status)} px-3 py-1 rounded-full text-xs`}>
                    {car.status.charAt(0).toUpperCase() + car.status.slice(1)}
                  </Badge>
                </div>
              </div>

              <div className="col-span-6 md:col-span-2 flex justify-end items-center space-x-2">
                <Button size="icon" variant="ghost" onClick={() => handleEdit(car)} aria-label={`Edit ${car.plate_number}`}>
                  <Edit className="h-4 w-4" />
                </Button>
                <Button size="icon" variant="ghost" onClick={() => handleDelete(car.car_id)} aria-label={`Delete ${car.plate_number}`}>
                  <Trash className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
    </DashboardLayout>
  )
}