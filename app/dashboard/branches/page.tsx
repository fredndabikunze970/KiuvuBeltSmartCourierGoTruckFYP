"use client"

import { DashboardLayout } from "@/components/layout/dashboard-layout"
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
import { useToast } from "@/hooks/use-toast"
import { apiService } from "@/lib/api"
import { branchSchema } from "@/lib/validations/management"
import { zodResolver } from "@hookform/resolvers/zod"
import { Building2, Edit, Loader2, MapPin, Plus, Trash } from "lucide-react"
import dynamic from "next/dynamic"
import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import type * as z from "zod"

const LeafletMap = dynamic(
  () => import("@/components/maps/leaflet-map").then(mod => mod.LeafletMap),
  { ssr: false }
)

type Branch = {
  branch_id: string
  branch_name: string
  latitude: number
  longitude: number
  address: string
}

type BranchFormData = z.infer<typeof branchSchema>

export default function BranchManagementPage() {
  const [branches, setBranches] = useState<Branch[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null)
  const [mapPosition, setMapPosition] = useState<[number, number]>([-1.94995, 30.05885])
  const { toast } = useToast()

  const form = useForm<BranchFormData>({
    resolver: zodResolver(branchSchema),
    defaultValues: {
      branch_name: "",
      latitude: 0,
      longitude: 0,
      address: "",
    },
  })

  useEffect(() => {
    fetchBranches()
  }, [])

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
    } finally {
      setLoading(false)
    }
  }

  const onSubmit = async (data: BranchFormData) => {
    try {
      if (selectedBranch) {
        await apiService.updateBranch(selectedBranch.branch_id, data)
        toast({
          title: "Success",
          description: "Branch updated successfully",
        })
      } else {
        await apiService.createBranch(data)
        toast({
          title: "Success",
          description: "Branch created successfully",
        })
      }
      
      fetchBranches()
      form.reset()
      setSelectedBranch(null)
    } catch (error) {
      toast({
        title: "Error",
        description: selectedBranch ? "Failed to update branch" : "Failed to create branch",
        variant: "destructive",
      })
    }
  }

  const handleDelete = async (branchId: string) => {
    if (!confirm("Are you sure you want to delete this branch?")) return

    try {
      await apiService.deleteBranch(branchId)
      toast({
        title: "Success",
        description: "Branch deleted successfully",
      })
      fetchBranches()
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete branch",
        variant: "destructive",
      })
    }
  }

  const handleEdit = (branch: Branch) => {
    setSelectedBranch(branch)
    form.reset({
      branch_name: branch.branch_name,
      latitude: branch.latitude,
      longitude: branch.longitude,
      address: branch.address,
    })
    setMapPosition([branch.latitude, branch.longitude])
  }

  const handleMapClick = (position: { lat: number; lng: number }) => {
    form.setValue("latitude", position.lat)
    form.setValue("longitude", position.lng)
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
          <h1 className="text-2xl font-bold">Branch Management</h1>
          <p className="text-muted-foreground">Manage your delivery branches and locations</p>
        </div>
        <Dialog>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Branch
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{selectedBranch ? "Edit Branch" : "Add New Branch"}</DialogTitle>
              <DialogDescription>
                {selectedBranch
                  ? "Update the branch information below"
                  : "Fill in the branch details below"}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="branch_name">Branch Name</Label>
                <Input
                  id="branch_name"
                  {...form.register("branch_name")}
                  placeholder="e.g., Kigali Main Branch"
                />
                {form.formState.errors.branch_name && (
                  <p className="text-sm text-red-500">
                    {form.formState.errors.branch_name.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label>Location</Label>
                <div className="h-[200px] border rounded-md overflow-hidden">
                  <LeafletMap
                    center={mapPosition}
                    zoom={13}
                    onClick={handleMapClick}
                    markers={[
                      {
                        position: [
                          form.getValues("latitude") || mapPosition[0],
                          form.getValues("longitude") || mapPosition[1],
                        ],
                        title: form.getValues("branch_name") || "New Branch",
                      },
                    ]}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="latitude">Latitude</Label>
                  <Input
                    id="latitude"
                    type="number"
                    step="any"
                    {...form.register("latitude", { valueAsNumber: true })}
                  />
                  {form.formState.errors.latitude && (
                    <p className="text-sm text-red-500">
                      {form.formState.errors.latitude.message}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="longitude">Longitude</Label>
                  <Input
                    id="longitude"
                    type="number"
                    step="any"
                    {...form.register("longitude", { valueAsNumber: true })}
                  />
                  {form.formState.errors.longitude && (
                    <p className="text-sm text-red-500">
                      {form.formState.errors.longitude.message}
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">Address</Label>
                <Input
                  id="address"
                  {...form.register("address")}
                  placeholder="Street address, city"
                />
                {form.formState.errors.address && (
                  <p className="text-sm text-red-500">
                    {form.formState.errors.address.message}
                  </p>
                )}
              </div>

              <DialogFooter>
                <Button variant="outline" type="button" onClick={() => {
                  form.reset()
                  setSelectedBranch(null)
                }}>
                  Cancel
                </Button>
                <Button type="submit">{selectedBranch ? "Update" : "Create"}</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {branches.map((branch) => (
          <div
            key={branch.branch_id}
            className="p-4 border rounded-lg shadow-sm space-y-4"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-2">
                <Building2 className="h-5 w-5 text-primary" />
                <h3 className="font-semibold">{branch.branch_name}</h3>
              </div>
              <div className="flex space-x-2">
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => handleEdit(branch)}
                >
                  <Edit className="h-4 w-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => handleDelete(branch.branch_id)}
                >
                  <Trash className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="flex items-center space-x-2 text-sm text-muted-foreground">
              <MapPin className="h-4 w-4" />
              <span>{branch.address}</span>
            </div>
            <div className="h-[120px] border rounded-md overflow-hidden">
              <LeafletMap
                center={[branch.latitude, branch.longitude]}
                zoom={13}
                markers={[
                  {
                    position: [branch.latitude, branch.longitude],
                    title: branch.branch_name,
                  },
                ]}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
    </DashboardLayout>
  )
}