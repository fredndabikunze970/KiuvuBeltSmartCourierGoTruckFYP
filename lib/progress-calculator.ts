/**
 * Progressive Progress Calculator
 * Calculates progress in real-time with incremental updates
 */

interface ProgressCalculationParams {
  originLat: number;
  originLng: number;
  destLat: number;
  destLng: number;
  currentLat: number;
  currentLng: number;
  routeDistance: number;
  apiKey: string;
  onProgressUpdate?: (progress: number, details: ProgressDetails) => void;
}

interface ProgressDetails {
  distanceTraveled: number;
  distanceRemaining: number;
  progress: number;
  isOnRoute: boolean;
  estimatedArrival?: string;
  currentSpeed?: number;
}

/**
 * Calculate progress with real-time updates
 * This function provides incremental progress updates instead of waiting for completion
 */
export async function calculateProgressIncremental(
  params: ProgressCalculationParams
): Promise<ProgressDetails> {
  const {
    originLat,
    originLng,
    currentLat,
    currentLng,
    routeDistance,
    apiKey,
    onProgressUpdate,
  } = params;

  try {
    // Immediately send initial estimate based on straight-line distance
    const straightLineDistance = haversineDistance(
      originLat,
      originLng,
      currentLat,
      currentLng
    );
    const initialProgress = Math.min(
      100,
      Math.max(0, (straightLineDistance / routeDistance) * 100)
    );

    if (onProgressUpdate) {
      onProgressUpdate(initialProgress, {
        distanceTraveled: straightLineDistance,
        distanceRemaining: routeDistance - straightLineDistance,
        progress: initialProgress,
        isOnRoute: false, // Unknown at this point
      });
    }

    // Now fetch accurate route-based distance
    const currentDistanceUrl = `https://us1.locationiq.com/v1/directions/driving/${originLng},${originLat};${currentLng},${currentLat}?key=${apiKey}&overview=simplified`;

    const currentDistResponse = await fetch(currentDistanceUrl);

    if (!currentDistResponse.ok) {
      throw new Error(`LocationIQ error: ${currentDistResponse.status}`);
    }

    const currentDistData = await currentDistResponse.json();
    const traveledRoute = currentDistData?.routes?.[0];

    if (!traveledRoute) {
      throw new Error("No route data returned");
    }

    const distanceTraveled = traveledRoute.distance; // in meters
    const distanceRemaining = Math.max(0, routeDistance - distanceTraveled);
    const progress = Math.min(
      100,
      Math.max(0, (distanceTraveled / routeDistance) * 100)
    );

    // Check if vehicle is on route (within 10% deviation)
    const deviation = Math.abs(distanceTraveled - routeDistance);
    const isOnRoute = deviation < routeDistance * 0.1;

    const details: ProgressDetails = {
      distanceTraveled,
      distanceRemaining,
      progress,
      isOnRoute,
    };

    // Send final accurate update
    if (onProgressUpdate) {
      onProgressUpdate(progress, details);
    }

    return details;
  } catch (error) {
    console.error("❌ Error calculating progress:", error);

    // Fallback to straight-line estimate
    const straightLineDistance = haversineDistance(
      originLat,
      originLng,
      currentLat,
      currentLng
    );
    const fallbackProgress = Math.min(
      100,
      Math.max(0, (straightLineDistance / routeDistance) * 100)
    );

    return {
      distanceTraveled: straightLineDistance,
      distanceRemaining: routeDistance - straightLineDistance,
      progress: fallbackProgress,
      isOnRoute: false,
    };
  }
}

/**
 * Haversine formula for calculating distance between two coordinates
 * Returns distance in meters
 */
function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

/**
 * Calculate estimated arrival time
 */
export function calculateEstimatedArrival(
  distanceRemaining: number,
  speed?: number,
  estimatedTime?: number,
  routeDistance?: number
): string | undefined {
  if (speed && speed > 0) {
    // Use current speed (speed is in m/s)
    const remainingTimeHours = distanceRemaining / 1000 / (speed * 3.6);
    const remainingTimeMs = remainingTimeHours * 60 * 60 * 1000;
    return new Date(Date.now() + remainingTimeMs).toISOString();
  } else if (estimatedTime && routeDistance) {
    // Use average speed from total route
    const avgSpeed = routeDistance / estimatedTime; // m/s
    const remainingTimeSec = distanceRemaining / avgSpeed;
    return new Date(Date.now() + remainingTimeSec * 1000).toISOString();
  }
  return undefined;
}
