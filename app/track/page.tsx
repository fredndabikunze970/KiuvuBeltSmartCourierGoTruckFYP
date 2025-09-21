import { PackageTracker } from "@/components/tracking/package-tracker"

export default function TrackPage() {
  return (
    <div className="container mx-auto py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Package Tracking</h1>
        <p className="text-muted-foreground">Track your package in real-time with live GPS updates</p>
      </div>
      <PackageTracker />
    </div>
  )
}
