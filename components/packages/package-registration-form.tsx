"use client"

import type React from "react"

import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { apiService, type Branch, type Car, type Driver } from "@/lib/api"
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  DollarSign,
  Loader2,
  MapPin,
  Package,
  Phone,
  Ruler,
  User,
  Weight
} from "lucide-react"
import { useEffect, useState } from "react"



interface PackageFormData {
  senderName: string
  senderPhone: string
  senderAddress: string
  originBranchId: string
  receiverName: string
  receiverPhone: string
  receiverAddress: string
  destinationBranchId: string
  packageDescription: string
  weight: string
  dimensions: string
  declaredValue: string
  deliveryFee: string
  priority: "normal" | "express" | "urgent"
  assignedCarId: string
  assignedDriverId: string
  deliveryTime: string
}

const steps = [
  { id: 1, title: "Sender", icon: User },
  { id: 2, title: "Receiver", icon: User },
  { id: 3, title: "Package", icon: Package },
  { id: 4, title: "Delivery", icon: DollarSign },
  { id: 5, title: "Review", icon: CheckCircle2 },
]

export function PackageRegistrationForm() {
  const [branches, setBranches] = useState<Branch[]>([])
  const [cars, setCars] = useState<Car[]>([])
  const [drivers, setDrivers] = useState<Driver[]>([])
  const [currentStep, setCurrentStep] = useState(1)
  const [formData, setFormData] = useState<PackageFormData>({
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
    assignedCarId: "",
    assignedDriverId: "",
    deliveryTime: ""
  })

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState<{ packageId: string; pickupCode: string } | null>(null)
  const { toast } = useToast()

  // Fetch branches when component mounts
  useEffect(() => {
    const fetchData = async () => {
      try {
        console.log('Fetching data for package registration...');
        const [branchesRes, carsRes, driversRes] = await Promise.all([
          apiService.getBranches(),
          apiService.getCars(),
          apiService.getDrivers()
        ]);
        
        console.log('API Responses:', {
          branches: branchesRes,
          cars: carsRes,
          drivers: driversRes
        });
        
        // Set branches
        if (Array.isArray(branchesRes.branches)) {
          console.log('Branches loaded:', branchesRes.branches.length);
          setBranches(branchesRes.branches);
        } else {
          console.warn('No branches data received');
          setBranches([]);
        }

        // Set available cars
        if (Array.isArray(carsRes.cars)) {
          console.log('Cars loaded:', carsRes.cars.length);
          setCars(carsRes.cars);
        } else {
          console.warn('No cars data received');
          setCars([]);
        }

        // Set available drivers
        if (Array.isArray(driversRes.drivers)) {
          console.log('Drivers loaded:', driversRes.drivers.length);
          setDrivers(driversRes.drivers);
        } else {
          console.warn('No drivers data received');
          setDrivers([]);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
        toast({
          title: "Error",
          description: "Failed to fetch required data. Please check the console for details.",
          variant: "destructive",
        });
      }
    }

    fetchData();
  }, [toast])

  const handleInputChange = (field: keyof PackageFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const nextStep = () => {
    if (currentStep < steps.length) {
      setCurrentStep(currentStep + 1)
    }
  }

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  const validateStep = (step: number): boolean => {
    switch (step) {
      case 1:
        return !!(formData.senderName && formData.senderPhone && formData.senderAddress)
      case 2:
        return !!(formData.receiverName && formData.receiverPhone && formData.receiverAddress)
      case 3:
        return !!(formData.packageDescription && formData.weight)
      case 4:
        return !!(formData.deliveryFee && formData.priority && formData.deliveryTime && formData.originBranchId && formData.destinationBranchId)
      default:
        return true
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      const packageData = {
        senderName: formData.senderName,
        senderPhone: formData.senderPhone,
        senderAddress: formData.senderAddress,
        originBranchId: formData.originBranchId,
        receiverName: formData.receiverName,
        receiverPhone: formData.receiverPhone,
        receiverAddress: formData.receiverAddress,
        destinationBranchId: formData.destinationBranchId,
        packageDescription: formData.packageDescription || undefined,
        weight: formData.weight ? Number.parseFloat(formData.weight) : undefined,
        dimensions: formData.dimensions || undefined,
        declaredValue: formData.declaredValue ? Number.parseFloat(formData.declaredValue) : undefined,
        deliveryFee: Number.parseFloat(formData.deliveryFee),
        priority: formData.priority,
        assignedCarId: formData.assignedCarId || undefined,
        assignedDriverId: formData.assignedDriverId || undefined,
        deliveryTime: formData.deliveryTime ? new Date(formData.deliveryTime).toISOString() : undefined
      }

      const response = await apiService.registerPackage(packageData)

      setSuccess({
        packageId: response.package.package_id,
        pickupCode: response.package.pickup_code,
      })

      toast({
        title: "Package Registered Successfully",
        description: `Package ID: ${response.package.package_id}`,
      })

      // Reset form
      setFormData({
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
        assignedCarId: "",
        assignedDriverId: "",
        deliveryTime: ""
      })
      setCurrentStep(1)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed")
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <Card className="w-full max-w-6xl mx-auto my-8">
        <CardHeader className="text-center pb-4">
          <div className="mx-auto bg-green-100 text-green-600 p-3 rounded-full w-fit mb-3">
            <CheckCircle2 className="h-10 w-10" />
          </div>
          <CardTitle className="text-2xl text-green-600">Package Registered Successfully!</CardTitle>
          <CardDescription className="text-base">
            Your package has been registered and is ready for processing
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-4 rounded-lg border border-green-200">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="text-center p-3 bg-white rounded-lg border">
                <Label className="text-sm font-medium text-muted-foreground block mb-1">Package ID</Label>
                <p className="text-xl font-mono font-bold text-green-600">{success.packageId}</p>
              </div>
              <div className="text-center p-3 bg-white rounded-lg border">
                <Label className="text-sm font-medium text-muted-foreground block mb-1">Pickup Code</Label>
                <p className="text-xl font-mono font-bold text-blue-600">{success.pickupCode}</p>
              </div>
            </div>
          </div>

          <Alert className="bg-blue-50 border-blue-200">
            <AlertDescription className="text-blue-800 text-sm">
              <strong>Important:</strong> Save the Package ID and Pickup Code. The receiver needs the pickup code for delivery verification.
            </AlertDescription>
          </Alert>

          <div className="flex gap-2 pt-2">
            <Button onClick={() => setSuccess(null)} className="flex-1 bg-green-600 hover:bg-green-700 h-11">
              <Package className="mr-2 h-4 w-4" />
              Register Another Package
            </Button>
            <Button variant="outline" onClick={() => window.print()} className="h-11">
              Print Slip
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  const StepIndicator = () => (
    <div className="flex items-center justify-between mb-6">
      {steps.map((step, index) => {
        const StepIcon = step.icon
        const isCompleted = currentStep > step.id
        const isCurrent = currentStep === step.id

        return (
          <div key={step.id} className="flex items-center flex-1">
            <div className="flex flex-col items-center">
              <div
                className={`
                  flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all duration-200
                  ${isCompleted
                    ? "bg-green-500 border-green-500 text-white"
                    : isCurrent
                      ? "bg-primary border-primary text-white"
                      : "bg-muted border-muted-foreground text-muted-foreground"
                  }
                `}
              >
                {isCompleted ? (
                  <CheckCircle2 className="h-5 w-5" />
                ) : (
                  <StepIcon className="h-5 w-5" />
                )}
              </div>
              <span
                className={`
                  mt-1 text-xs font-medium transition-colors
                  ${isCompleted || isCurrent ? "text-foreground" : "text-muted-foreground"}
                `}
              >
                {step.title}
              </span>
            </div>
            {index < steps.length - 1 && (
              <div
                className={`
                  flex-1 h-1 mx-2 transition-colors
                  ${isCompleted ? "bg-green-500" : "bg-muted"}
                `}
              />
            )}
          </div>
        )
      })}
    </div>
  )

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-4">
            <div className="text-center mb-4">
              <h3 className="text-xl font-bold text-foreground">Sender Information</h3>
              <p className="text-muted-foreground text-sm mt-1">Enter sender details</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="senderName" className="text-sm font-semibold">
                  Full Name *
                </Label>
                <Input
                  id="senderName"
                  value={formData.senderName}
                  onChange={(e) => handleInputChange("senderName", e.target.value)}
                  placeholder="John Doe"
                  required
                  disabled={loading}
                  className="h-10"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="senderPhone" className="text-sm font-semibold">
                  Phone Number *
                </Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="senderPhone"
                    value={formData.senderPhone}
                    onChange={(e) => handleInputChange("senderPhone", e.target.value)}
                    placeholder="+250788123456"
                    className="pl-9 h-10"
                    required
                    disabled={loading}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="senderAddress" className="text-sm font-semibold">
                Complete Address *
              </Label>
              <div className="relative">
                <MapPin className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Textarea
                  id="senderAddress"
                  value={formData.senderAddress}
                  onChange={(e) => handleInputChange("senderAddress", e.target.value)}
                  placeholder="Street address, city, district"
                  className="pl-9 min-h-[80px]"
                  required
                  disabled={loading}
                />
              </div>
            </div>
          </div>
        )

      case 2:
        return (
          <div className="space-y-4">
            <div className="text-center mb-4">
              <h3 className="text-xl font-bold text-foreground">Receiver Information</h3>
              <p className="text-muted-foreground text-sm mt-1">Enter recipient details</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="receiverName" className="text-sm font-semibold">
                  Full Name *
                </Label>
                <Input
                  id="receiverName"
                  value={formData.receiverName}
                  onChange={(e) => handleInputChange("receiverName", e.target.value)}
                  placeholder="Jane Smith"
                  required
                  disabled={loading}
                  className="h-10"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="receiverPhone" className="text-sm font-semibold">
                  Phone Number *
                </Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="receiverPhone"
                    value={formData.receiverPhone}
                    onChange={(e) => handleInputChange("receiverPhone", e.target.value)}
                    placeholder="+250788654321"
                    className="pl-9 h-10"
                    required
                    disabled={loading}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="receiverAddress" className="text-sm font-semibold">
                Complete Address *
              </Label>
              <div className="relative">
                <MapPin className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Textarea
                  id="receiverAddress"
                  value={formData.receiverAddress}
                  onChange={(e) => handleInputChange("receiverAddress", e.target.value)}
                  placeholder="Street address, city, district"
                  className="pl-9 min-h-[80px]"
                  required
                  disabled={loading}
                />
              </div>
            </div>
          </div>
        )

      case 3:
        return (
          <div className="space-y-4">
            <div className="text-center mb-4">
              <h3 className="text-xl font-bold text-foreground">Package Details</h3>
              <p className="text-muted-foreground text-sm mt-1">Describe package contents</p>
            </div>

            <div className="space-y-3">
              <Label htmlFor="packageDescription" className="text-sm font-semibold">
                Package Description *
              </Label>
              <Textarea
                id="packageDescription"
                value={formData.packageDescription}
                onChange={(e) => handleInputChange("packageDescription", e.target.value)}
                placeholder="Brief description of package contents"
                className="min-h-[80px]"
                required
                disabled={loading}
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="weight" className="text-sm font-semibold">
                  Weight (kg) *
                </Label>
                <div className="relative">
                  <Weight className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="weight"
                    type="number"
                    step="0.1"
                    value={formData.weight}
                    onChange={(e) => handleInputChange("weight", e.target.value)}
                    placeholder="2.5"
                    className="pl-9 h-10"
                    required
                    disabled={loading}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="dimensions" className="text-sm font-semibold">
                  Dimensions
                </Label>
                <div className="relative">
                  <Ruler className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="dimensions"
                    value={formData.dimensions}
                    onChange={(e) => handleInputChange("dimensions", e.target.value)}
                    placeholder="30x20x10 cm"
                    className="pl-9 h-10"
                    disabled={loading}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="declaredValue" className="text-sm font-semibold">
                  Value (RWF)
                </Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="declaredValue"
                    type="number"
                    value={formData.declaredValue}
                    onChange={(e) => handleInputChange("declaredValue", e.target.value)}
                    placeholder="50000"
                    className="pl-9 h-10"
                    disabled={loading}
                  />
                </div>
              </div>
            </div>
          </div>
        )

      case 4:
        return (
          <div className="space-y-4">
            <div className="text-center mb-4">
              <h3 className="text-xl font-bold text-foreground">Delivery Options</h3>
              <p className="text-muted-foreground text-sm mt-1">Choose delivery preferences</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="originBranchId" className="text-sm font-semibold flex items-center">
                  Origin Branch <span className="text-red-500 ml-1">*</span>
                </Label>
                <Select value={formData.originBranchId} onValueChange={(value) => handleInputChange("originBranchId", value)}>
                  <SelectTrigger className="h-10">
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
                <Label htmlFor="destinationBranchId" className="text-sm font-semibold flex items-center">
                  Destination Branch <span className="text-red-500 ml-1">*</span>
                </Label>
                <Select value={formData.destinationBranchId} onValueChange={(value) => handleInputChange("destinationBranchId", value)}>
                  <SelectTrigger className="h-10">
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

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="assignedCarId" className="text-sm font-semibold">
                  Assign Vehicle <span className="text-gray-500 text-xs">(Optional)</span>
                </Label>
                <Select value={formData.assignedCarId} onValueChange={(value) => handleInputChange("assignedCarId", value)}>
                  <SelectTrigger className="h-10">
                    <SelectValue placeholder="Select vehicle" />
                  </SelectTrigger>
                  <SelectContent>
                    {cars.map((car) => (
                      <SelectItem key={car.car_id} value={car.car_id}>
                        {car.model} - {car.plate_number}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="assignedDriverId" className="text-sm font-semibold">
                  Assign Driver <span className="text-gray-500 text-xs">(Optional)</span>
                </Label>
                <Select value={formData.assignedDriverId} onValueChange={(value) => handleInputChange("assignedDriverId", value)}>
                  <SelectTrigger className="h-10">
                    <SelectValue placeholder="Select driver" />
                  </SelectTrigger>
                  <SelectContent>
                    {drivers.map((driver) => (
                      <SelectItem key={driver.driver_id} value={driver.driver_id}>
                        {driver.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="priority" className="text-sm font-semibold flex items-center">
                  Delivery Priority <span className="text-red-500 ml-1">*</span>
                </Label>
                <Select value={formData.priority} onValueChange={(value) => handleInputChange("priority", value)}>
                  <SelectTrigger className="h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="normal">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        Normal (3-5 days)
                      </div>
                    </SelectItem>
                    <SelectItem value="express">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                        Express (1-2 days)
                      </div>
                    </SelectItem>
                    <SelectItem value="urgent">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                        Urgent (Same day)
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="deliveryFee" className="text-sm font-semibold flex items-center">
                  Delivery Fee (RWF) <span className="text-red-500 ml-1">*</span>
                </Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="deliveryFee"
                    type="number"
                    value={formData.deliveryFee}
                    onChange={(e) => handleInputChange("deliveryFee", e.target.value)}
                    placeholder="5000"
                    className="pl-9 h-10"
                    required
                    disabled={loading}
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="deliveryTime" className="text-sm font-semibold flex items-center">
                  Delivery Time <span className="text-red-500 ml-1">*</span>
                </Label>
                <Input
                  id="deliveryTime"
                  type="datetime-local"
                  value={formData.deliveryTime}
                  onChange={(e) => handleInputChange("deliveryTime", e.target.value)}
                  className="h-10"
                  required
                  disabled={loading}
                />
              </div>
            </div>

            <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
              <h4 className="font-semibold text-blue-900 text-sm mb-1">Delivery Timeline</h4>
              <p className="text-blue-700 text-xs">
                Based on your priority selection. Express and Urgent deliveries may incur additional charges.
              </p>
            </div>
          </div>
        )

      case 5:
        return (
          <div className="space-y-4">
            <div className="text-center mb-4">
              <h3 className="text-xl font-bold text-foreground">Review & Confirm</h3>
              <p className="text-muted-foreground text-sm mt-1">Verify all information before submitting</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card className="bg-blue-50/50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <User className="h-4 w-4 text-blue-600" />
                    Sender
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-1 text-sm">
                  <div><strong>Name:</strong> {formData.senderName}</div>
                  <div><strong>Phone:</strong> {formData.senderPhone}</div>
                  <div><strong>Address:</strong> {formData.senderAddress}</div>
                </CardContent>
              </Card>

              <Card className="bg-green-50/50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <User className="h-4 w-4 text-green-600" />
                    Receiver
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-1 text-sm">
                  <div><strong>Name:</strong> {formData.receiverName}</div>
                  <div><strong>Phone:</strong> {formData.receiverPhone}</div>
                  <div><strong>Address:</strong> {formData.receiverAddress}</div>
                </CardContent>
              </Card>
            </div>

            <Card className="bg-purple-50/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Package className="h-4 w-4 text-purple-600" />
                  Package
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-1 text-sm">
                <div><strong>Description:</strong> {formData.packageDescription}</div>
                <div><strong>Weight:</strong> {formData.weight} kg</div>
                <div><strong>Dimensions:</strong> {formData.dimensions || "Not specified"}</div>
                <div><strong>Value:</strong> {formData.declaredValue ? `RWF ${formData.declaredValue}` : "Not specified"}</div>
              </CardContent>
            </Card>

            <Card className="bg-orange-50/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-orange-600" />
                  Delivery
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-1 text-sm">
                <div><strong>Priority:</strong> <span className="capitalize">{formData.priority}</span></div>
                <div><strong>Fee:</strong> RWF {formData.deliveryFee}</div>
                <div><strong>Delivery Time:</strong> {formData.deliveryTime ? new Date(formData.deliveryTime).toLocaleString() : "Not specified"}</div>
              </CardContent>
            </Card>

            {error && (
              <Alert variant="destructive" className="py-3">
                <AlertDescription className="text-sm">{error}</AlertDescription>
              </Alert>
            )}
          </div>
        )

      default:
        return null
    }
  }

  return (
    <Card className="w-full max-w-7xl mx-auto my-6">
      <CardHeader className="text-center pb-4">
        <div className="flex items-center justify-center mb-3">
          <div className="p-2 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 text-white">
            <Package className="h-6 w-6" />
          </div>
        </div>
        <CardTitle className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
          Package Registration
        </CardTitle>
        <CardDescription className="text-base text-muted-foreground">
          Complete the steps to register your package
        </CardDescription>
      </CardHeader>

      <CardContent className="px-6 pb-6">
        <StepIndicator />

        <form onSubmit={handleSubmit} className="space-y-6">
          {renderStepContent()}

          <div className="flex justify-between pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={prevStep}
              disabled={currentStep === 1 || loading}
              className="h-10 px-5"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>

            {currentStep < steps.length ? (
              <Button
                type="button"
                onClick={nextStep}
                disabled={!validateStep(currentStep) || loading}
                className="h-10 px-6 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
              >
                Continue
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            ) : (
              <Button
                type="submit"
                disabled={loading}
                className="h-10 px-6 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    Register Package
                  </>
                )}
              </Button>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  )
}