"use client"

import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { apiService } from "@/lib/api"
import type { Branch } from "@/lib/types"
import { packageFormSchema } from "@/lib/validations/package"
import { zodResolver } from "@hookform/resolvers/zod"
import { DollarSign, Loader2, MapPin, Package, Phone, Ruler, User, Weight } from "lucide-react"
import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import type * as z from "zod"

type PackageFormData = z.infer<typeof packageFormSchema>
type FormStep = "sender" | "receiver" | "package" | "review"

export function NewPackageRegistrationForm() {
  const [currentStep, setCurrentStep] = useState<FormStep>("sender")
  const [branches, setBranches] = useState<Branch[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState<{ packageId: string; pickupCode: string } | null>(null)
  const { toast } = useToast()

  const form = useForm<PackageFormData>({
    resolver: zodResolver(packageFormSchema),
    defaultValues: {
      senderName: "",
      senderPhone: "",
      senderAddress: "",
      originBranchId: "",
      receiverName: "",
      receiverPhone: "",
      receiverAddress: "",
      destinationBranchId: "",
      packageDescription: "",
      weight: "",
      dimensions: "",
      declaredValue: "",
      deliveryFee: "",
      priority: "normal",
    },
  })

  useEffect(() => {
    const fetchBranches = async () => {
      try {
        const response = await apiService.getBranches()
        setBranches(response.branches)
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to fetch branches",
          variant: "destructive",
        })
      }
    }

    fetchBranches()
  }, [toast])

  const nextStep = () => {
    const steps: FormStep[] = ["sender", "receiver", "package", "review"]
    const currentIndex = steps.indexOf(currentStep)
    if (currentIndex < steps.length - 1) {
      setCurrentStep(steps[currentIndex + 1])
    }
  }

  const prevStep = () => {
    const steps: FormStep[] = ["sender", "receiver", "package", "review"]
    const currentIndex = steps.indexOf(currentStep)
    if (currentIndex > 0) {
      setCurrentStep(steps[currentIndex - 1])
    }
  }

  const onSubmit = async (formData: PackageFormData) => {
    if (currentStep !== "review") {
      nextStep()
      return
    }

    setError("")
    setLoading(true)

    try {
      const response = await apiService.registerPackage({
        senderName: formData.senderName,
        senderPhone: formData.senderPhone,
        senderAddress: formData.senderAddress,
        originBranchId: formData.originBranchId,
        receiverName: formData.receiverName,
        receiverPhone: formData.receiverPhone,
        receiverAddress: formData.receiverAddress,
        destinationBranchId: formData.destinationBranchId,
        packageDescription: formData.packageDescription || undefined,
        weight: formData.weight ? Number(formData.weight) : undefined,
        dimensions: formData.dimensions,
        declaredValue: formData.declaredValue ? Number(formData.declaredValue) : undefined,
        deliveryFee: Number(formData.deliveryFee),
        priority: formData.priority,
      })

      setSuccess({
        packageId: response.package.package_id,
        pickupCode: response.package.pickup_code,
      })

      toast({
        title: "Package Registered Successfully",
        description: `Package ID: ${response.package.package_id}`,
      })

      form.reset()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed")
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardHeader className="text-center">
          <div className="mx-auto bg-green-100 text-green-600 p-3 rounded-full w-fit mb-4">
            <Package className="h-8 w-8" />
          </div>
          <CardTitle className="text-2xl text-green-600">Package Registered Successfully!</CardTitle>
          <CardDescription>Your package has been registered in the system</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-card p-4 rounded-lg border">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Package ID</Label>
                <p className="text-lg font-mono font-bold">{success.packageId}</p>
              </div>
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Pickup Code</Label>
                <p className="text-lg font-mono font-bold">{success.pickupCode}</p>
              </div>
            </div>
          </div>

          <Alert>
            <AlertDescription>
              Please save the Package ID and Pickup Code. The receiver will need the pickup code to verify delivery.
            </AlertDescription>
          </Alert>

          <div className="flex gap-2">
            <Button onClick={() => setSuccess(null)} className="flex-1">
              Register Another Package
            </Button>
            <Button variant="outline" onClick={() => window.print()}>
              Print Slip
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  const renderSenderForm = () => (
    <div className="space-y-4 animate-slide-up-fade [animation-delay:100ms]">
      <h3 className="text-lg font-semibold flex items-center gap-2">
        <div className="p-1 rounded-md bg-primary/10">
          <User className="h-4 w-4 text-primary" />
        </div>
        Sender Information
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="senderName">Full Name *</Label>
          <Input
            id="senderName"
            {...form.register("senderName")}
            placeholder="John Doe"
            disabled={loading}
          />
          {form.formState.errors.senderName && (
            <p className="text-sm text-red-500">{form.formState.errors.senderName.message}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="senderPhone">Phone Number *</Label>
          <div className="relative">
            <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              id="senderPhone"
              {...form.register("senderPhone")}
              placeholder="+250788123456"
              className="pl-10"
              disabled={loading}
            />
          </div>
          {form.formState.errors.senderPhone && (
            <p className="text-sm text-red-500">{form.formState.errors.senderPhone.message}</p>
          )}
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="senderAddress">Address *</Label>
        <div className="relative">
          <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Textarea
            id="senderAddress"
            {...form.register("senderAddress")}
            placeholder="Street address, city, district"
            className="pl-10"
            disabled={loading}
          />
        </div>
        {form.formState.errors.senderAddress && (
          <p className="text-sm text-red-500">{form.formState.errors.senderAddress.message}</p>
        )}
      </div>
      <div className="space-y-2">
        <Label htmlFor="originBranch">Pickup Branch *</Label>
        <Select
          value={form.getValues("originBranchId")}
          onValueChange={(value) => form.setValue("originBranchId", value)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select pickup branch" />
          </SelectTrigger>
          <SelectContent>
            {branches.map((branch) => (
              <SelectItem key={branch.branch_id} value={branch.branch_id}>
                {branch.branch_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {form.formState.errors.originBranchId && (
          <p className="text-sm text-red-500">{form.formState.errors.originBranchId.message}</p>
        )}
      </div>
    </div>
  )

  const renderReceiverForm = () => (
    <div className="space-y-4 animate-slide-up-fade [animation-delay:200ms]">
      <h3 className="text-lg font-semibold flex items-center gap-2">
        <div className="p-1 rounded-md bg-primary/10">
          <User className="h-4 w-4 text-primary" />
        </div>
        Receiver Information
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="receiverName">Full Name *</Label>
          <Input
            id="receiverName"
            {...form.register("receiverName")}
            placeholder="Jane Smith"
            disabled={loading}
          />
          {form.formState.errors.receiverName && (
            <p className="text-sm text-red-500">{form.formState.errors.receiverName.message}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="receiverPhone">Phone Number *</Label>
          <div className="relative">
            <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              id="receiverPhone"
              {...form.register("receiverPhone")}
              placeholder="+250788654321"
              className="pl-10"
              disabled={loading}
            />
          </div>
          {form.formState.errors.receiverPhone && (
            <p className="text-sm text-red-500">{form.formState.errors.receiverPhone.message}</p>
          )}
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="receiverAddress">Address *</Label>
        <div className="relative">
          <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Textarea
            id="receiverAddress"
            {...form.register("receiverAddress")}
            placeholder="Street address, city, district"
            className="pl-10"
            disabled={loading}
          />
        </div>
        {form.formState.errors.receiverAddress && (
          <p className="text-sm text-red-500">{form.formState.errors.receiverAddress.message}</p>
        )}
      </div>
      <div className="space-y-2">
        <Label htmlFor="destinationBranch">Delivery Branch *</Label>
        <Select
          value={form.getValues("destinationBranchId")}
          onValueChange={(value) => form.setValue("destinationBranchId", value)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select delivery branch" />
          </SelectTrigger>
          <SelectContent>
            {branches.map((branch) => (
              <SelectItem key={branch.branch_id} value={branch.branch_id}>
                {branch.branch_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {form.formState.errors.destinationBranchId && (
          <p className="text-sm text-red-500">{form.formState.errors.destinationBranchId.message}</p>
        )}
      </div>
    </div>
  )

  const renderPackageForm = () => (
    <div className="space-y-4 animate-slide-up-fade [animation-delay:300ms]">
      <h3 className="text-lg font-semibold flex items-center gap-2">
        <div className="p-1 rounded-md bg-primary/10">
          <Package className="h-4 w-4 text-primary" />
        </div>
        Package Details
      </h3>
      <div className="space-y-2">
        <Label htmlFor="packageDescription">Description</Label>
        <Textarea
          id="packageDescription"
          {...form.register("packageDescription")}
          placeholder="Brief description of package contents"
          disabled={loading}
        />
        {form.formState.errors.packageDescription && (
          <p className="text-sm text-red-500">{form.formState.errors.packageDescription.message}</p>
        )}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="weight">Weight (kg)</Label>
          <div className="relative">
            <Weight className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              id="weight"
              type="number"
              step="0.1"
              {...form.register("weight")}
              placeholder="2.5"
              className="pl-10"
              disabled={loading}
            />
          </div>
          {form.formState.errors.weight && (
            <p className="text-sm text-red-500">{form.formState.errors.weight.message}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="dimensions">Dimensions</Label>
          <div className="relative">
            <Ruler className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              id="dimensions"
              {...form.register("dimensions")}
              placeholder="30x20x10 cm"
              className="pl-10"
              disabled={loading}
            />
          </div>
          {form.formState.errors.dimensions && (
            <p className="text-sm text-red-500">{form.formState.errors.dimensions.message}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="declaredValue">Declared Value (RWF)</Label>
          <div className="relative">
            <DollarSign className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              id="declaredValue"
              type="number"
              {...form.register("declaredValue")}
              placeholder="50000"
              className="pl-10"
              disabled={loading}
            />
          </div>
          {form.formState.errors.declaredValue && (
            <p className="text-sm text-red-500">{form.formState.errors.declaredValue.message}</p>
          )}
        </div>
      </div>
    </div>
  )

  const renderDeliveryOptions = () => (
    <div className="space-y-4 animate-slide-up-fade [animation-delay:400ms]">
      <h3 className="text-lg font-semibold flex items-center gap-2">
        <div className="p-1 rounded-md bg-primary/10">
          <DollarSign className="h-4 w-4 text-primary" />
        </div>
        Delivery Options
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="priority">Priority</Label>
          <Select
            value={form.getValues("priority")}
            onValueChange={(value: "normal" | "express" | "urgent") => form.setValue("priority", value)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="normal">Normal</SelectItem>
              <SelectItem value="express">Express</SelectItem>
              <SelectItem value="urgent">Urgent</SelectItem>
            </SelectContent>
          </Select>
          {form.formState.errors.priority && (
            <p className="text-sm text-red-500">{form.formState.errors.priority.message}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="deliveryFee">Delivery Fee (RWF) *</Label>
          <div className="relative">
            <DollarSign className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              id="deliveryFee"
              type="number"
              {...form.register("deliveryFee")}
              placeholder="5000"
              className="pl-10"
              disabled={loading}
            />
          </div>
          {form.formState.errors.deliveryFee && (
            <p className="text-sm text-red-500">{form.formState.errors.deliveryFee.message}</p>
          )}
        </div>
      </div>
    </div>
  )

  const renderReviewForm = () => {
    const formData = form.getValues()
    const originBranch = branches.find((b) => b.branch_id === formData.originBranchId)
    const destinationBranch = branches.find((b) => b.branch_id === formData.destinationBranchId)

    return (
      <div className="space-y-6 animate-slide-up-fade [animation-delay:100ms]">
        <div className="grid gap-6">
          <div>
            <h3 className="text-lg font-semibold">Sender Details</h3>
            <div className="mt-2 space-y-2">
              <p><span className="font-medium">Name:</span> {formData.senderName}</p>
              <p><span className="font-medium">Phone:</span> {formData.senderPhone}</p>
              <p><span className="font-medium">Address:</span> {formData.senderAddress}</p>
              <p><span className="font-medium">Pickup Branch:</span> {originBranch?.branch_name}</p>
            </div>
          </div>
          <div>
            <h3 className="text-lg font-semibold">Receiver Details</h3>
            <div className="mt-2 space-y-2">
              <p><span className="font-medium">Name:</span> {formData.receiverName}</p>
              <p><span className="font-medium">Phone:</span> {formData.receiverPhone}</p>
              <p><span className="font-medium">Address:</span> {formData.receiverAddress}</p>
              <p><span className="font-medium">Delivery Branch:</span> {destinationBranch?.branch_name}</p>
            </div>
          </div>
          <div>
            <h3 className="text-lg font-semibold">Package Details</h3>
            <div className="mt-2 space-y-2">
              <p><span className="font-medium">Description:</span> {formData.packageDescription || "N/A"}</p>
              <p><span className="font-medium">Weight:</span> {formData.weight ? `${formData.weight} kg` : "N/A"}</p>
              <p><span className="font-medium">Dimensions:</span> {formData.dimensions || "N/A"}</p>
              <p><span className="font-medium">Declared Value:</span> {formData.declaredValue ? `${formData.declaredValue} RWF` : "N/A"}</p>
              <p><span className="font-medium">Priority:</span> {formData.priority.charAt(0).toUpperCase() + formData.priority.slice(1)}</p>
              <p><span className="font-medium">Delivery Fee:</span> {formData.deliveryFee} RWF</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const renderCurrentStep = () => {
    switch (currentStep) {
      case "sender":
        return renderSenderForm()
      case "receiver":
        return renderReceiverForm()
      case "package":
        return (
          <>
            {renderPackageForm()}
            {renderDeliveryOptions()}
          </>
        )
      case "review":
        return renderReviewForm()
      default:
        return null
    }
  }

  const stepTitles: Record<FormStep, { title: string; description: string }> = {
    sender: {
      title: "Sender Information",
      description: "Enter the sender's details and pickup location",
    },
    receiver: {
      title: "Receiver Information",
      description: "Enter the receiver's details and delivery location",
    },
    package: {
      title: "Package Details",
      description: "Enter package specifications and shipping options",
    },
    review: {
      title: "Review & Confirm",
      description: "Review package details and confirm registration",
    },
  }

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <div className="flex items-center justify-center mb-4">
          <div className="p-3 rounded-full bg-primary/10">
            <Package className="h-6 w-6 text-primary" />
          </div>
        </div>
        <CardTitle className="text-center text-2xl">{stepTitles[currentStep].title}</CardTitle>
        <CardDescription className="text-center">{stepTitles[currentStep].description}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {renderCurrentStep()}

          <div className="flex justify-between mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={prevStep}
              disabled={currentStep === "sender" || loading}
            >
              Previous
            </Button>

            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {currentStep === "review" ? "Registering..." : "Next"}
                </>
              ) : (
                <>
                  {currentStep === "review" ? (
                    "Register Package"
                  ) : (
                    <>
                      Next
                      <Package className="ml-2 h-4 w-4" />
                    </>
                  )}
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}