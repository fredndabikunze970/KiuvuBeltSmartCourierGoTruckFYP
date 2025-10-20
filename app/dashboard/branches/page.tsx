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
import { apiService, type Branch } from "@/lib/api"
import { Building2, Edit, Loader2, MapPin, Plus, Trash } from "lucide-react"
import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"

// Removed local Branch type definition, now imported from lib/api

type BranchFormData = {
  branch_name: string
  latitude: string
  longitude: string
  address: string
}

export default function BranchManagementPage() {
  const [branches, setBranches] = useState<Branch[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false) // New state to control dialog
  const { toast } = useToast()

  const form = useForm<BranchFormData>({
    defaultValues: {
      branch_name: "",
      latitude: "-1.94995", // Default for new branch
      longitude: "30.05885", // Default for new branch
      address: "", // Default to empty string
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
        console.log("Submitting update for branch:", selectedBranch.branch_id, data);
        await apiService.updateBranch(selectedBranch.branch_id, data)
        toast({
          title: "Success",
          description: "Branch updated successfully",
        })
      } else {
        console.log("Submitting new branch:", data);
        await apiService.createBranch(data)
        toast({
          title: "Success",
          description: "Branch created successfully",
        })
      }

      fetchBranches()
      form.reset({
        branch_name: "",
        latitude: "-1.94995",
        longitude: "30.05885",
        address: "",
      });
      setSelectedBranch(null)
      setIsDialogOpen(false) // Close dialog on successful submission
    } catch (error) {
      console.error("Submission error:", error);
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
    console.log("Opening Edit dialog for branch:", branch);
    setSelectedBranch(branch)
    form.reset({
      branch_name: branch.branch_name,
      latitude: branch.latitude.toString(),
      longitude: branch.longitude.toString(),
      address: branch.address,
    });
    setIsDialogOpen(true) // Open dialog for editing
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
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}> {/* Dialog wraps everything */}
        <div className="container mx-auto py-6">
          <div className="flex justify-between items-center mb-6">
          <div>
          <h2 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Branches Management
          </h2>
            <p className="text-muted-foreground">Manage your delivery branches and locations</p>
          </div>
          <DialogTrigger asChild>
              <Button onClick={() => {
                console.log("Opening Add New Branch dialog. selectedBranch should be null.");
                setSelectedBranch(null) // Ensure adding new branch starts fresh
                form.reset({
                  branch_name: "",
                  latitude: "-1.94995", // Default for new branch
                  longitude: "30.05885", // Default for new branch
                  address: "", // Default to empty string
                });
              }}>
                <Plus className="h-4 w-4 mr-2" />
                Add Branch
              </Button>
            </DialogTrigger>
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
                    <DialogTrigger asChild>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleEdit(branch)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    </DialogTrigger>
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
                <div className="text-sm text-muted-foreground">
                  <p>Latitude: {Number(branch.latitude).toFixed(6)}</p>
                  <p>Longitude: {Number(branch.longitude).toFixed(6)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
        <DialogContent> {/* DialogContent is now correctly inside the Dialog */}
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
                  required
                  value={form.watch("branch_name") || ""}
                  onChange={(e) => form.setValue("branch_name", e.target.value)}
                  placeholder="e.g., Kigali Main Branch"
                />
              </div>

              <div className="space-y-2">
                <Label>Location</Label>
                <p className="text-sm text-muted-foreground">Click on the map to set coordinates (map removed for data-only view)</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="latitude">Latitude</Label>
                  <Input
                    id="latitude"
                    type="number"
                    step="any"
                    required
                    placeholder="-1.94995"
                    value={form.watch("latitude") || ""}
                    onChange={(e) => form.setValue("latitude", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="longitude">Longitude</Label>
                  <Input
                    id="longitude"
                    type="number"
                    step="any"
                    required
                    placeholder="30.05885"
                    value={form.watch("longitude") || ""}
                    onChange={(e) => form.setValue("longitude", e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">Address</Label>
                <Input
                  id="address"
                  required
                  value={form.watch("address") || ""}
                  onChange={(e) => form.setValue("address", e.target.value)}
                  placeholder="Street address, city"
                />
              </div>

              <DialogFooter>
                <Button variant="outline" type="button" onClick={() => {
                  form.reset({
                    branch_name: "",
                    latitude: "-1.94995",
                    longitude: "30.05885",
                    address: "",
                  });
                  setSelectedBranch(null)
                  setIsDialogOpen(false) // Close dialog on cancel
                }}>
                  Cancel
                </Button>
                <Button type="submit">{selectedBranch ? "Update" : "Create"}</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
    </DashboardLayout>
  )
}