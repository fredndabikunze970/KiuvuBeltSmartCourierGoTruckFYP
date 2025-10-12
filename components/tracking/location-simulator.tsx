"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Play, Pause, RotateCcw, MapPin } from "lucide-react"

interface LocationSimulatorProps {
  trackingNumber: string
  onLocationUpdate: (location: { latitude: number; longitude: number; address: string }) => void
}

export function LocationSimulator({ trackingNumber, onLocationUpdate }: LocationSimulatorProps) {
  const [isSimulating, setIsSimulating] = useState(false)
  const [currentStep, setCurrentStep] = useState(0)

  // Simulate route from Kigali to Butare
  const routePoints = [
    { latitude: -1.9441, longitude: 30.0619, address: "Kigali City Center" },
    { latitude: -1.9706, longitude: 30.1044, address: "Kigali Airport Road" },
    { latitude: -2.0469, longitude: 29.9736, address: "Muhanga District" },
    { latitude: -2.3272, longitude: 29.7378, address: "Huye District" },
    { latitude: -2.6189, longitude: 29.7378, address: "Butare University" },
  ]

  useEffect(() => {
    let interval: NodeJS.Timeout

    if (isSimulating) {
      interval = setInterval(() => {
        const nextStep = (currentStep + 1) % routePoints.length
        setCurrentStep(nextStep)
        onLocationUpdate(routePoints[nextStep])
      }, 3000) // Update every 3 seconds
    }

    return () => {
      if (interval) clearInterval(interval)
    }
  }, [isSimulating, currentStep, onLocationUpdate])

  const startSimulation = () => {
    setIsSimulating(true)
    onLocationUpdate(routePoints[currentStep])
  }

  const stopSimulation = () => {
    setIsSimulating(false)
  }

  const resetSimulation = () => {
    setIsSimulating(false)
    setCurrentStep(0)
    onLocationUpdate(routePoints[0])
  }

  return (
    <Card className="border-0 shadow-lg w-full max-w-md mx-auto sm:max-w-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xl sm:text-2xl lg:text-3xl flex-wrap">
          <MapPin className="h-5 w-5 text-primary" />
          Location Simulator
          <Badge variant={isSimulating ? "default" : "outline"} className="ml-auto text-sm sm:text-base">{isSimulating ? "Running" : "Stopped"}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 sm:space-y-6">
        <div className="flex flex-col sm:flex-row gap-3">
          <Button
            onClick={isSimulating ? stopSimulation : startSimulation}
            variant={isSimulating ? "destructive" : "default"}
            className="flex items-center gap-2 w-full sm:w-auto"
          >
            {isSimulating ? (
              <>
                <Pause className="h-4 w-4" />
                Stop
              </>
            ) : (
              <>
                <Play className="h-4 w-4" />
                Start
              </>
            )}
          </Button>

          <Button onClick={resetSimulation} variant="outline" className="flex items-center gap-2 bg-transparent w-full sm:w-auto">
            <RotateCcw className="h-4 w-4" />
            Reset
          </Button>
        </div>

        <div className="p-4 bg-card rounded-lg border space-y-1 sm:space-y-2">
          <div className="text-sm text-muted-foreground mb-2 sm:text-base">Current Location:</div>
          <div className="font-medium text-base sm:text-lg lg:text-xl">{routePoints[currentStep].address}</div>
          <div className="font-mono text-sm text-muted-foreground sm:text-base">
            {routePoints[currentStep].latitude.toFixed(6)}, {routePoints[currentStep].longitude.toFixed(6)}
          </div>
          <div className="text-xs text-muted-foreground mt-2 sm:text-sm lg:text-base">
            Step {currentStep + 1} of {routePoints.length}
          </div>
        </div>

        <div className="space-y-2 sm:space-y-3">
          <div className="text-sm font-medium sm:text-base lg:text-lg">Route Progress:</div>
          <div className="space-y-1">
            {routePoints.map((point, index) => (
              <div
                key={index}
                className={`flex items-center gap-2 text-sm p-2 rounded ${
                  index === currentStep
                    ? "bg-primary/10 text-primary font-medium"
                    : index < currentStep
                      ? "bg-green-50 text-green-700"
                      : "text-muted-foreground"
                }`}
              >
                <div
                  className={`w-2 h-2 rounded-full ${
                    index === currentStep ? "bg-primary" : index < currentStep ? "bg-green-500" : "bg-gray-300"
                  }`}
                />
                <span className="text-sm sm:text-base lg:text-lg">{point.address}</span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
