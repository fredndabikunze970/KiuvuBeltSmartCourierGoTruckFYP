import { PackageTracker } from "@/components/tracking/package-tracker"

interface TrackPackagePageProps {
  params: {
    packageId: string
  }
}

export default function TrackPackagePage({ params }: TrackPackagePageProps) {
  return (
    <div className="container mx-auto py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Package Tracking</h1>
        <p className="text-muted-foreground">Real-time tracking for package {params.packageId}</p>
      </div>
      <PackageTracker initialPackageId={params.packageId} />
    </div>
  )
}
