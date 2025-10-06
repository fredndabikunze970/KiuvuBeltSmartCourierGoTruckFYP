import { PackageTracker } from '@/components/tracking/package-tracker';
import { DashboardLayout } from "@/components/layout/dashboard-layout";

interface TrackingPageParams {
  params: {
    trackingId: string;
  };
}

export default function TrackingPage({ params }: TrackingPageParams) {
  const { trackingId } = params;

  return (
    <DashboardLayout>
      <div className="container mx-auto p-4">
        <PackageTracker trackingId={trackingId} />
      </div>
    </DashboardLayout>
  );
}