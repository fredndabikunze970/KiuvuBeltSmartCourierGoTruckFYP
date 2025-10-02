import { PackageTracker } from '@/components/tracking/package-tracker';

interface TrackingPageParams {
  params: {
    trackingId: string;
  };
}

export default function TrackingPage({ params }: TrackingPageParams) {
  const { trackingId } = params;

  return (
    <div className="container mx-auto p-4">
      <PackageTracker trackingId={trackingId} />
    </div>
  );
}