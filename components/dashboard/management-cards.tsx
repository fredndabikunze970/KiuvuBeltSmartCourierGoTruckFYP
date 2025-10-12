import { DashboardCard } from "@/components/ui/dashboard-card"
import { apiService } from "@/lib/api"
import { Building2, Car, Users } from "lucide-react"

export async function ManagementCards() {
  const [branchesData, driversData, carsData] = await Promise.all([
    apiService.getBranches(),
    apiService.getDrivers(),
    apiService.getCars(),
  ])

  const availableCars = carsData.cars.filter(car => car.status === 'available').length
  const totalCars = carsData.cars.length
  const activeDrivers = driversData.drivers.filter(driver => driver.assigned_car).length
  const totalDrivers = driversData.drivers.length

  return (
    <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
      <DashboardCard
        title="Total Branches"
        value={branchesData.branches.length.toString()}
        description="Active delivery locations"
        icon={Building2}
        className="bg-blue-50"
      />
      <DashboardCard
        title="Fleet Status"
        value={`${availableCars}/${totalCars}`}
        description="Available vehicles"
        icon={Car}
        className="bg-green-50"
      />
      <DashboardCard
        title="Driver Status"
        value={`${activeDrivers}/${totalDrivers}`}
        description="Active drivers"
        icon={Users}
        className="bg-blue-50"
      />
    </div>
  )
}