/**
 * Progress Persistence Utility
 * Handles saving and restoring progress state to prevent loss on page refresh
 */

export interface ProgressState {
  packageId: string;
  progress: number;
  lastUpdated: string;
  currentLocation?: {
    latitude: number;
    longitude: number;
    timestamp: number;
  };
  distanceTraveled?: number;
  distanceRemaining?: number;
  estimatedArrival?: string;
}

const STORAGE_KEY_PREFIX = "tracking_progress_";
const STORAGE_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Save progress state to localStorage
 */
export function saveProgressState(state: ProgressState): void {
  try {
    const key = `${STORAGE_KEY_PREFIX}${state.packageId}`;
    const data = {
      ...state,
      expiresAt: Date.now() + STORAGE_EXPIRY_MS,
    };
    localStorage.setItem(key, JSON.stringify(data));
    console.log("✅ Progress saved:", {
      packageId: state.packageId,
      progress: state.progress,
    });
  } catch (error) {
    console.error("❌ Failed to save progress:", error);
  }
}

/**
 * Load progress state from localStorage
 */
export function loadProgressState(packageId: string): ProgressState | null {
  try {
    const key = `${STORAGE_KEY_PREFIX}${packageId}`;
    const stored = localStorage.getItem(key);

    if (!stored) {
      return null;
    }

    const data = JSON.parse(stored);

    // Check if expired
    if (data.expiresAt && Date.now() > data.expiresAt) {
      localStorage.removeItem(key);
      console.log("⚠️ Progress expired, cleared:", packageId);
      return null;
    }

    console.log("✅ Progress restored:", {
      packageId,
      progress: data.progress,
    });
    return data;
  } catch (error) {
    console.error("❌ Failed to load progress:", error);
    return null;
  }
}

/**
 * Clear progress state from localStorage
 */
export function clearProgressState(packageId: string): void {
  try {
    const key = `${STORAGE_KEY_PREFIX}${packageId}`;
    localStorage.removeItem(key);
    console.log("✅ Progress cleared:", packageId);
  } catch (error) {
    console.error("❌ Failed to clear progress:", error);
  }
}

/**
 * Clear all expired progress states
 */
export function clearExpiredProgress(): void {
  try {
    const now = Date.now();
    const keysToRemove: string[] = [];

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(STORAGE_KEY_PREFIX)) {
        const stored = localStorage.getItem(key);
        if (stored) {
          const data = JSON.parse(stored);
          if (data.expiresAt && now > data.expiresAt) {
            keysToRemove.push(key);
          }
        }
      }
    }

    keysToRemove.forEach((key) => localStorage.removeItem(key));
    console.log(`✅ Cleared ${keysToRemove.length} expired progress states`);
  } catch (error) {
    console.error("❌ Failed to clear expired progress:", error);
  }
}
