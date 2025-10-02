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
import { carSchema } from "@/lib/validations/management"
import { zodResolver } from "@hookform/resolvers/zod"
import { Car as CarIcon, Edit, Loader2, Plus, Trash } from "lucide-react"
import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import type * as z from "zod"

type Car = {
  car_id: string
  plate_number: string
  model: string
  capacity_kg: number
  status: "available" | "in-use" | "maintenance"
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
  })

  useEffect(() => {
    Promise.all([fetchCars(), fetchBranches()])
  }, [])

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
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch branches",
        variant: "destructive",
      })
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

  const handleEdit = (car: Car) => {
    setSelectedCar(car)
    form.reset({
      plate_number: car.plate_number,
      model: car.model,
      capacity_kg: car.capacity_kg,
      status: car.status,
      branch_id: car.branch_id,
    })
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "available":
        return "bg-green-100 text-green-800"
      case "in-use":
        return "bg-blue-100 text-blue-800"
      case "maintenance":
        return "bg-yellow-100 text-yellow-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

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
          <h1 className="text-2xl font-bold">Car Fleet Management</h1>
          <p className="text-muted-foreground">Manage your delivery vehicles and assignments</p>
        </div>
        <Dialog>
          <DialogTrigger asChild>
            <Button>
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
                <Input
                  id="plate_number"
                  {...form.register("plate_number")}
                  placeholder="e.g., RAB123A"
                />
                {form.formState.errors.plate_number && (
                  <p className="text-sm text-red-500">
                    {form.formState.errors.plate_number.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="model">Model</Label>
                <Input
                  id="model"
                  {...form.register("model")}
                  placeholder="e.g., Toyota Hilux"
                />
                {form.formState.errors.model && (
                  <p className="text-sm text-red-500">
                    {form.formState.errors.model.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="capacity_kg">Capacity (kg)</Label>
                <Input
                  id="capacity_kg"
                  type="number"
                  step="0.1"
                  {...form.register("capacity_kg", { valueAsNumber: true })}
                />
                {form.formState.errors.capacity_kg && (
                  <p className="text-sm text-red-500">
                    {form.formState.errors.capacity_kg.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select
                  value={form.getValues("status")}
                  onValueChange={(value: "available" | "in-use" | "maintenance") =>
                    form.setValue("status", value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="available">Available</SelectItem>
                    <SelectItem value="in-use">In Use</SelectItem>
                    <SelectItem value="maintenance">Maintenance</SelectItem>
                  </SelectContent>
                </Select>
                {form.formState.errors.status && (
                  <p className="text-sm text-red-500">
                    {form.formState.errors.status.message}
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
                  setSelectedCar(null)
                }}>
                  Cancel
                </Button>
                <Button type="submit">{selectedCar ? "Update" : "Create"}</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {cars.map((car) => (
          <div
            key={car.car_id}
            className="p-4 border rounded-lg shadow-sm space-y-4"
          >
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <CarIcon className="h-5 w-5 text-primary" />
                  <h3 className="font-semibold">{car.model}</h3>
                </div>
                <p className="text-sm font-mono">{car.plate_number}</p>
              </div>
              <div className="flex space-x-2">
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => handleEdit(car)}
                >
                  <Edit className="h-4 w-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => handleDelete(car.car_id)}
                >
                  <Trash className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Capacity</span>
                <span className="font-medium">{car.capacity_kg} kg</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Branch</span>
                <span className="font-medium">{car.branch_name}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Status</span>
                <Badge className={getStatusColor(car.status)}>
                  {car.status.charAt(0).toUpperCase() + car.status.slice(1)}
                </Badge>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
    </DashboardLayout>
  )
}