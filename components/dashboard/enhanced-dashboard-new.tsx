// components/dashboard/enhanced-dashboard-new.tsx
'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';
import { db } from '@/lib/firebase-client';
import { ref, onValue, off } from 'firebase/database';
import { componentColors } from '@/lib/colors';

// Dynamically import the enhanced map component
const EnhancedRealTimeTrackingMap = dynamic(
    () => import('@/components/maps/real-time-tracking-map').then(mod => mod.EnhancedRealTimeTrackingMap),
    {
        ssr: false,
        loading: () => (
            <div className="h-96 bg-gray-50 rounded-lg flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
                    <p className="text-sm text-gray-600">Loading advanced tracking...</p>
                </div>
            </div>
        )
    }
);

interface DashboardStats {
    packageStats: {
        total_packages: number;
        delivered: number;
        in_transit: number;
        registered: number;
        out_for_delivery: number;
    };
    paymentStats: {
        total_payments: number;
        total_amount: number;
        confirmed_payments: number;
        pending_payments: number;
    };
    recentPackages: Array<{
        package_id: string;
        sender_name: string;
        receiver_name: string;
        status: string;
        current_location: string;
        payment_status: string;
        created_at: string;
    }>;
    fleetStats: {
        total_vehicles: number;
        active_vehicles: number;
        available_vehicles: number;
        maintenance_vehicles: number;
        vehicles: Array<any>;
    };
    locationHistory: any;
    timestamp: string;
}

interface HistoryPoint {
    timestamp: string;
    latitude: number;
    longitude: number;
    speed?: number;
    heading?: number;
    accuracy?: number;
    address?: string;
    formattedAddress: string;
    coordinatesDisplay: string;
    city?: string;
    district?: string;
    province?: string;
    country?: string;
    isGeocoded: boolean;
}

// Enhanced geocoding service with caching and error handling
class EnhancedGeocodingService {
    private cache: Map<string, any>;
    private pendingRequests: Map<string, Promise<any>>;

    constructor() {
        this.cache = new Map();
        this.pendingRequests = new Map();
    }

    async reverseGeocode(lat: number, lng: number): Promise<{
        address: string;
        city?: string;
        district?: string;
        province?: string;
        country?: string;
    }> {
        const cacheKey = `${lat.toFixed(6)},${lng.toFixed(6)}`;

        // Return from cache if available
        if (this.cache.has(cacheKey)) {
            return this.cache.get(cacheKey);
        }

        // Return pending request if exists
        if (this.pendingRequests.has(cacheKey)) {
            return this.pendingRequests.get(cacheKey)!;
        }

        try {
            // Create new request
            const geocodePromise = this.performReverseGeocode(lat, lng);
            this.pendingRequests.set(cacheKey, geocodePromise);

            const result = await geocodePromise;
            this.cache.set(cacheKey, result);
            this.pendingRequests.delete(cacheKey);

            return result;
        } catch (error) {
            this.pendingRequests.delete(cacheKey);
            throw error;
        }
    }

    private async performReverseGeocode(lat: number, lng: number): Promise<any> {
        // Try multiple geocoding services in sequence
        const services = [
            this.tryOpenStreetMap,
            this.tryNominatim
        ];

        for (const service of services) {
            try {
                const result = await service(lat, lng);
                if (result && result.address) {
                    return result;
                }
            } catch (error) {
                console.warn(`Geocoding service failed:`, error);
                continue;
            }
        }

        // Fallback to coordinates display
        return {
            address: `Location at ${lat.toFixed(4)}, ${lng.toFixed(4)}`,
            coordinatesDisplay: `${lat.toFixed(4)}, ${lng.toFixed(4)}`
        };
    }

    private async tryOpenStreetMap(lat: number, lng: number): Promise<any> {
        const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`
        );

        if (!response.ok) throw new Error('OSM request failed');

        const data = await response.json();
        if (data.error) throw new Error(data.error);

        return this.formatOSMResponse(data);
    }

    private async tryNominatim(lat: number, lng: number): Promise<any> {
        const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`
        );

        if (!response.ok) throw new Error('Nominatim request failed');

        const data = await response.json();
        return this.formatOSMResponse(data);
    }

    private formatOSMResponse(data: any) {
        const address = data.address;
        let formattedAddress = '';

        if (address.road && address.house_number) {
            formattedAddress = `${address.road} ${address.house_number}`;
        } else if (address.road) {
            formattedAddress = address.road;
        } else if (address.neighbourhood) {
            formattedAddress = address.neighbourhood;
        } else if (address.suburb) {
            formattedAddress = address.suburb;
        } else {
            formattedAddress = data.display_name?.split(',')[0] || 'Unknown Location';
        }

        return {
            address: formattedAddress,
            city: address.city || address.town || address.village,
            district: address.state_district,
            province: address.state,
            country: address.country,
            fullAddress: data.display_name,
            coordinatesDisplay: `${parseFloat(data.lat).toFixed(4)}, ${parseFloat(data.lon).toFixed(4)}`
        };
    }

    getCoordinatesDisplay(lat: number, lng: number): string {
        return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
    }

    clearCache() {
        this.cache.clear();
        this.pendingRequests.clear();
    }
}

// Create instance
const enhancedGeocodingService = new EnhancedGeocodingService();

// Format to Rwandan time (Central Africa Time - CAT)
const formatRwandaTime = (timestamp: string | number | Date): string => {
    try {
        const date = typeof timestamp === 'string' ? new Date(parseInt(timestamp)) : new Date(timestamp);
        return date.toLocaleTimeString('en-RW', {
            timeZone: 'Africa/Kigali',
            hour12: false,
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
    } catch {
        return new Date().toLocaleTimeString('en-RW', {
            timeZone: 'Africa/Kigali',
            hour12: false,
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
    }
};

const formatRwandaDateTime = (timestamp: string | number | Date): string => {
    try {
        const date = typeof timestamp === 'string' ? new Date(parseInt(timestamp)) : new Date(timestamp);
        return date.toLocaleDateString('en-RW', {
            timeZone: 'Africa/Kigali',
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        }) + ' at ' + formatRwandaTime(timestamp);
    } catch {
        return 'Invalid date';
    }
};

const formatRwandaDate = (timestamp: string | number | Date): string => {
    try {
        const date = typeof timestamp === 'string' ? new Date(parseInt(timestamp)) : new Date(timestamp);
        return date.toLocaleDateString('en-RW', {
            timeZone: 'Africa/Kigali',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    } catch {
        return 'Invalid date';
    }
};

// Enhanced CAR001 History Component with Professional Design
function Car001History({ locationHistory }: { locationHistory: any }) {
    const [car001History, setCar001History] = useState<HistoryPoint[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [refreshing, setRefreshing] = useState(false);
    const [geocodingProgress, setGeocodingProgress] = useState<number>(0);

    // Process and limit history to 8 entries (FIFO) with enhanced geocoding
    const processHistoryData = async (historyData: any): Promise<HistoryPoint[]> => {
        if (!historyData) return [];

        const historyEntries = Object.entries(historyData)
            .sort(([a], [b]) => parseInt(b) - parseInt(a)) // Sort by timestamp descending (newest first)
            .slice(0, 8) // Take only the 8 most recent entries
            .map(([timestamp, data]: [string, any]) => ({
                timestamp,
                latitude: data.latitude,
                longitude: data.longitude,
                speed: data.speed,
                heading: data.heading,
                accuracy: data.accuracy,
                address: data.address,
                formattedAddress: data.address || enhancedGeocodingService.getCoordinatesDisplay(data.latitude, data.longitude),
                coordinatesDisplay: enhancedGeocodingService.getCoordinatesDisplay(data.latitude, data.longitude),
                isGeocoded: false
            }));

        // Enhanced geocoding with progress tracking
        const totalEntries = historyEntries.length;
        let processedCount = 0;

        const enhancedEntries = await Promise.all(
            historyEntries.map(async (entry) => {
                try {
                    const geocodedData = await enhancedGeocodingService.reverseGeocode(
                        entry.latitude,
                        entry.longitude
                    );

                    processedCount++;
                    setGeocodingProgress((processedCount / totalEntries) * 100);

                    return {
                        ...entry,
                        ...geocodedData,
                        formattedAddress: geocodedData.address,
                        isGeocoded: true
                    };
                } catch (error) {
                    console.warn('Geocoding failed for:', entry.coordinatesDisplay, error);
                    processedCount++;
                    setGeocodingProgress((processedCount / totalEntries) * 100);

                    return {
                        ...entry,
                        isGeocoded: false
                    };
                }
            })
        );

        return enhancedEntries;
    };

    const refreshHistory = async () => {
        setRefreshing(true);
        setGeocodingProgress(0);
        enhancedGeocodingService.clearCache();

        try {
            const processedHistory = await processHistoryData(locationHistory?.['CAR001']);
            setCar001History(processedHistory);
            setError(null);
        } catch (err) {
            console.error('Error refreshing history:', err);
            setError('Failed to refresh vehicle history');
        } finally {
            setRefreshing(false);
            setGeocodingProgress(0);
        }
    };

    useEffect(() => {
        if (!locationHistory) {
            setCar001History([]);
            setLoading(false);
            return;
        }

        const loadHistory = async () => {
            try {
                setLoading(true);
                setGeocodingProgress(0);
                const processedHistory = await processHistoryData(locationHistory['CAR001']);
                setCar001History(processedHistory);
                setError(null);
            } catch (err) {
                console.error('Error loading CAR001 history:', err);
                setError('Failed to load vehicle history');
                setCar001History([]);
            } finally {
                setLoading(false);
                setGeocodingProgress(0);
            }
        };

        loadHistory();
    }, [locationHistory]);

    // Real-time Firebase listener for CAR001 updates
    useEffect(() => {
        const car001Ref = ref(db, 'location_history/CAR001');

        const unsubscribe = onValue(car001Ref, async (snapshot) => {
            try {
                const historyData = snapshot.val();
                if (historyData) {
                    const processedHistory = await processHistoryData(historyData);
                    setCar001History(processedHistory);
                    setError(null);
                }
            } catch (err) {
                console.error('Error in real-time CAR001 update:', err);
            }
        }, (error) => {
            console.error('Firebase CAR001 listener error:', error);
            setError('Real-time connection failed');
        });

        return () => unsubscribe();
    }, []);

    const getSpeedColor = (speed: number) => {
        if (speed < 10) return 'text-green-600 bg-green-50';
        if (speed < 30) return 'text-amber-600 bg-amber-50';
        return 'text-red-600 bg-red-50';
    };

    const getAccuracyColor = (accuracy: number) => {
        if (accuracy < 10) return 'text-green-600';
        if (accuracy < 25) return 'text-yellow-600';
        return 'text-red-600';
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-12">
                <div className="relative mb-4">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
                    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-blue-500">🚗</div>
                </div>
                <p className="text-sm font-medium text-gray-700 mb-2">Loading CAR001 History</p>
                {geocodingProgress > 0 && (
                    <div className="w-48">
                    <Progress value={geocodingProgress} className="h-1 bg-gray-200 [&>div]:bg-blue-500" />
                        <p className="text-xs text-slate-500 mt-1 text-center">
                            Geocoding... {Math.round(geocodingProgress)}%
                        </p>
                    </div>
                )}
            </div>
        );
    }

    if (error) {
        return (
            <div className="text-center py-8">
                <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-3">
                    <div className="text-red-500 text-2xl">⚠️</div>
                </div>
                <h3 className="text-lg font-semibold text-red-700 mb-2">Connection Error</h3>
                <p className="text-sm text-red-600 mb-4">{error}</p>
                <button
                    onClick={refreshHistory}
                    disabled={refreshing}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-all duration-200 font-medium flex items-center space-x-2 mx-auto shadow-sm hover:shadow-md"
                >
                    <div className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`}>🔄</div>
                    <span>Retry Connection</span>
                </button>
            </div>
        );
    }

    if (car001History.length === 0) {
        return (
            <div className="text-center py-12">
                <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
                    <div className="text-blue-400 text-3xl">🚗</div>
                </div>
                <h3 className="text-lg font-semibold text-slate-700 mb-2">No History Data</h3>
                <p className="text-sm text-slate-500 mb-4">Waiting for CAR001 location updates</p>
                <button
                    onClick={refreshHistory}
                    disabled={refreshing}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-all duration-200 font-medium flex items-center space-x-2 mx-auto shadow-sm hover:shadow-md"
                >
                    <div className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`}>🔄</div>
                    <span>Check for Updates</span>
                </button>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Header with Stats */}
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h4 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                        <div className="text-blue-600">🚗</div>
                        CAR001 Location History
                    </h4>
                    <p className="text-sm text-slate-500">Real-time tracking with enhanced geocoding</p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="text-right">
                        <p className="text-xs font-medium text-slate-500">Last Update</p>
                        <p className="text-sm font-semibold text-slate-700">
                            {formatRwandaTime(car001History[0]?.timestamp)}
                        </p>
                    </div>
                    <button
                        onClick={refreshHistory}
                        disabled={refreshing}
                        className="p-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50 transition-all duration-200 shadow-sm hover:shadow-md"
                        title="Refresh History"
                    >
                        <div className={`text-slate-600 ${refreshing ? 'animate-spin' : ''}`}>🔄</div>
                    </button>
                </div>
            </div>

            {/* Geocoding Progress */}
            {geocodingProgress > 0 && geocodingProgress < 100 && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-blue-700">Processing Locations</span>
                        <span className="text-sm text-blue-600">{Math.round(geocodingProgress)}%</span>
                    </div>
                    <Progress value={geocodingProgress} className="h-2 bg-blue-50 [&>div]:bg-blue-500" />
                </div>
            )}

            {/* History Timeline */}
            <div className="space-y-3">
                {car001History.map((point, index) => (
                    <div
                        key={point.timestamp}
                        className="bg-white rounded-xl border-2 border-slate-100 hover:border-blue-200 hover:shadow-lg transition-all duration-300 cursor-pointer group"
                    >
                        <div className="p-4">
                            {/* Header */}
                            <div className="flex items-start justify-between mb-3">
                                <div className="flex items-center gap-3">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${index === 0
                                            ? 'bg-green-100 text-green-600 border-2 border-green-200'
                                            : 'bg-blue-100 text-blue-600 border-2 border-blue-200'
                                        }`}>
                                        {index + 1}
                                    </div>
                                    <div>
                                        <p className="text-sm font-semibold text-slate-800">
                                            {formatRwandaDateTime(point.timestamp)}
                                        </p>
                                        <div className="flex items-center gap-2 mt-1">
                                            <div className="text-slate-400">🕒</div>
                                            <p className="text-xs text-slate-500">
                                                {formatRwandaTime(point.timestamp)}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Speed Indicator */}
                                {point.speed && (
                                    <div className={`px-3 py-1 rounded-full text-xs font-bold ${getSpeedColor(point.speed * 3.6)}`}>
                                        {(point.speed * 3.6).toFixed(0)} km/h
                                    </div>
                                )}
                            </div>

                            {/* Location Details */}
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                                {/* Coordinates */}
                                <div className="lg:col-span-1">
                                    <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
                                        <div className="flex items-center gap-2 mb-2">
                                            <div className="text-blue-500">📍</div>
                                            <span className="text-xs font-semibold text-slate-700">COORDINATES</span>
                                        </div>
                                        <div className="font-mono text-sm text-slate-800 bg-white p-2 rounded border">
                                            📍 {point.coordinatesDisplay}
                                        </div>
                                        {point.accuracy && (
                                            <div className="flex items-center justify-between mt-2 text-xs">
                                                <span className="text-slate-500">Accuracy:</span>
                                                <span className={`font-medium ${getAccuracyColor(point.accuracy)}`}>
                                                    ±{point.accuracy}m
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Address */}
                                <div className="lg:col-span-2">
                                    <div className="bg-gradient-to-r from-blue-50 to-blue-50 rounded-lg p-3 border border-blue-200">
                                        <div className="flex items-center gap-2 mb-2">
                                            <div className="text-blue-500">🗺️</div>
                                            <span className="text-xs font-semibold text-blue-700">LOCATION</span>
                                            {point.isGeocoded && (
                                                <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full font-medium">
                                                    Verified
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-sm font-semibold text-slate-800 leading-tight mb-2">
                                            {point.formattedAddress}
                                        </p>
                                        {(point.city || point.district) && (
                                            <div className="flex flex-wrap gap-2 mt-2">
                                                {point.city && (
                                                    <span className="px-2 py-1 bg-white text-slate-700 text-xs rounded border font-medium">
                                                        🏙️ {point.city}
                                                    </span>
                                                )}
                                                {point.district && (
                                                    <span className="px-2 py-1 bg-white text-slate-700 text-xs rounded border font-medium">
                                                        🗺️ {point.district}
                                                    </span>
                                                )}
                                                {point.province && (
                                                    <span className="px-2 py-1 bg-white text-slate-700 text-xs rounded border font-medium">
                                                        🌍 {point.province}
                                                    </span>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Additional Data */}
                            {(point.heading || point.accuracy) && (
                                <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100">
                                    {point.heading && (
                                        <div className="flex items-center gap-2 text-xs text-slate-600">
                                            <div className="text-blue-500">🧭</div>
                                            <span>Heading: <strong>{point.heading}°</strong></span>
                                        </div>
                                    )}
                                    <div className="flex items-center gap-4 text-xs text-slate-500">
                                        <span>Lat: {point.latitude.toFixed(6)}</span>
                                        <span>Lng: {point.longitude.toFixed(6)}</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {/* Footer Stats */}
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                    <div>
                        <p className="text-2xl font-bold text-slate-800">{car001History.length}</p>
                        <p className="text-xs text-slate-500">Locations</p>
                    </div>
                    <div>
                        <p className="text-2xl font-bold text-green-600">
                            {car001History.filter(p => p.isGeocoded).length}
                        </p>
                        <p className="text-xs text-slate-500">Geocoded</p>
                    </div>
                    <div>
                        <p className="text-2xl font-bold text-blue-600">
                            {car001History.filter(p => p.speed && p.speed > 0).length}
                        </p>
                        <p className="text-xs text-slate-500">Moving</p>
                    </div>
                    <div>
                        <p className="text-2xl font-bold text-blue-600">
                            {new Set(car001History.map(p => formatRwandaDate(p.timestamp))).size}
                        </p>
                        <p className="text-xs text-gray-500">Active Days</p>
                    </div>
                </div>
            </div>

            {/* Auto-update Notice */}
            <div className="text-center pt-2">
                <p className="text-xs text-slate-400 flex items-center justify-center gap-2">
                    <div>🕒</div>
                    Showing {car001History.length} most recent locations • Auto-updates every 30 seconds
                </p>
            </div>
        </div>
    );
}

// General Vehicle History Component with Real-time Updates
function DashboardVehicleHistory({ locationHistory }: { locationHistory: any }) {
    const [recentHistory, setRecentHistory] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    // Process history data with FIFO logic (4 most recent entries total)
    const processRecentHistory = (historyData: any) => {
        if (!historyData) return [];

        const allHistoryPoints: any[] = [];

        // Process all vehicles' history (excluding CAR001 since it has its own card)
        Object.entries(historyData).forEach(([vehicleId, vehicleHistory]: [string, any]) => {
            if (vehicleId === 'CAR001') return;

            const historyEntries = Object.entries(vehicleHistory)
                .sort(([a], [b]) => parseInt(b) - parseInt(a)) // Sort by timestamp descending
                .slice(0, 2) // Get last 2 entries per vehicle
                .map(([timestamp, data]: [string, any]) => ({
                    vehicleId,
                    timestamp,
                    latitude: data.latitude,
                    longitude: data.longitude,
                    speed: data.speed,
                    address: data.address || enhancedGeocodingService.getCoordinatesDisplay(data.latitude, data.longitude),
                    coordinatesDisplay: enhancedGeocodingService.getCoordinatesDisplay(data.latitude, data.longitude)
                }));

            allHistoryPoints.push(...historyEntries);
        });

        // Sort all points by timestamp and take the 4 most recent
        return allHistoryPoints
            .sort((a, b) => parseInt(b.timestamp) - parseInt(a.timestamp))
            .slice(0, 4);
    };

    const refreshHistory = () => {
        setRefreshing(true);
        try {
            const processedHistory = processRecentHistory(locationHistory);
            setRecentHistory(processedHistory);
        } catch (error) {
            console.error('Error refreshing vehicle history:', error);
        } finally {
            setRefreshing(false);
        }
    };

    useEffect(() => {
        const processedHistory = processRecentHistory(locationHistory);
        setRecentHistory(processedHistory);
        setLoading(false);
    }, [locationHistory]);

    // Real-time Firebase listener for all vehicle updates
    useEffect(() => {
        const historyRef = ref(db, 'location_history');

        const unsubscribe = onValue(historyRef, (snapshot) => {
            try {
                const historyData = snapshot.val();
                if (historyData) {
                    const processedHistory = processRecentHistory(historyData);
                    setRecentHistory(processedHistory);
                }
            } catch (error) {
                console.error('Error in real-time vehicle history update:', error);
            }
        }, (error) => {
            console.error('Firebase vehicle history listener error:', error);
        });

        return () => unsubscribe();
    }, []);

    if (loading) {
        return (
            <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                <span className="ml-2 text-sm text-slate-600">Loading history...</span>
            </div>
        );
    }

    if (recentHistory.length === 0) {
        return (
            <div className="text-center py-8 text-slate-500">
                <div className="text-slate-400 text-2xl mb-2">📜</div>
                <p className="text-sm">No recent location history available</p>
                <p className="text-xs text-slate-400 mt-1">Vehicle tracking data will appear here</p>
                <button
                    onClick={refreshHistory}
                    disabled={refreshing}
                    className="mt-3 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors text-sm font-medium flex items-center space-x-2 mx-auto"
                >
                    <div className={`${refreshing ? 'animate-spin' : ''}`}>🔄</div>
                    <span>Refresh</span>
                </button>
            </div>
        );
    }

    return (
        <div className="space-y-3">
            <div className="flex justify-between items-center mb-2">
                <h4 className="text-sm font-semibold text-slate-700">Recent Vehicle Activity</h4>
                <button
                    onClick={refreshHistory}
                    disabled={refreshing}
                    className="flex items-center space-x-1 text-xs text-blue-600 hover:text-blue-700 disabled:opacity-50 transition-colors"
                >
                    <div className={`${refreshing ? 'animate-spin' : ''}`}>🔄</div>
                    <span>Refresh</span>
                </button>
            </div>

            {recentHistory.map((point, index) => (
                <div
                    key={`${point.vehicleId}-${point.timestamp}`}
                    className="bg-slate-50 rounded-lg p-3 border border-slate-200 hover:border-slate-300 transition-all duration-200 group"
                >
                    <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center space-x-2">
                            <div className="w-6 h-6 bg-blue-50 rounded-full flex items-center justify-center flex-shrink-0 group-hover:bg-blue-100 transition-colors">
                                <span className="text-xs font-bold text-blue-500">{index + 1}</span>
                            </div>
                            <div>
                                <p className="text-xs font-semibold text-slate-700">
                                    Vehicle {point.vehicleId}
                                </p>
                                <p className="text-xs text-slate-500">
                                    {formatRwandaTime(point.timestamp)}
                                </p>
                            </div>
                        </div>
                        {point.speed && (
                            <div className="text-xs text-slate-500 bg-white px-2 py-1 rounded border">
                                {(point.speed * 3.6).toFixed(1)} km/h
                            </div>
                        )}
                    </div>
                    <div className="text-xs text-slate-600 bg-white/60 p-2 rounded border border-slate-100">
                        <div className="flex justify-between mb-1">
                            <span className="font-medium">Coordinates:</span>
                            <span className="font-mono">📍 {point.coordinatesDisplay}</span>
                        </div>
                        {point.address && (
                            <p className="text-slate-500 mt-1 font-medium">
                                {point.address}
                            </p>
                        )}
                    </div>
                </div>
            ))}

            <div className="text-center pt-2 border-t border-slate-200">
                <p className="text-xs text-slate-500">
                    Showing {recentHistory.length} most recent activities • Real-time updates
                </p>
            </div>
        </div>
    );
}

export function EnhancedDashboardNew() {
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
    const [refreshing, setRefreshing] = useState(false);

    const fetchDashboardStats = async () => {
        try {
            setRefreshing(true);
            const response = await fetch('/api/dashboard/stats');
            if (!response.ok) {
                throw new Error('Failed to fetch dashboard stats');
            }
            const data = await response.json();
            setStats(data);
            setLastUpdated(new Date());
            setError(null);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    // Real-time Firebase listener for dashboard stats
    useEffect(() => {
        const vehiclesRef = ref(db, 'vehicles');
        const packagesRef = ref(db, 'packages');
        const paymentsRef = ref(db, 'payments');

        const unsubscribeVehicles = onValue(vehiclesRef, (snapshot) => {
            fetchDashboardStats();
        });

        const unsubscribePackages = onValue(packagesRef, (snapshot) => {
            fetchDashboardStats();
        });

        const unsubscribePayments = onValue(paymentsRef, (snapshot) => {
            fetchDashboardStats();
        });

        return () => {
            unsubscribeVehicles();
            unsubscribePackages();
            unsubscribePayments();
        };
    }, []);

    useEffect(() => {
        fetchDashboardStats();

        // Refresh every 30 seconds for real-time updates
        const interval = setInterval(fetchDashboardStats, 30 * 1000);
        return () => clearInterval(interval);
    }, []);

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50/30 flex items-center justify-center">
                <div className="flex flex-col items-center space-y-6">
                    <div className="relative">
                        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600"></div>
                        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-blue-600">🚚</div>
                    </div>
                    <div className="text-center space-y-2">
                        <h2 className="text-2xl font-bold text-slate-800">Loading Dashboard</h2>
                        <p className="text-slate-600">Preparing your delivery insights...</p>
                    </div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50/30 flex items-center justify-center">
                <div className="text-center space-y-6 max-w-md mx-auto p-8">
                    <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto">
                        <div className="text-red-500 text-2xl">⚠️</div>
                    </div>
                    <div className="space-y-3">
                        <h2 className="text-2xl font-bold text-red-600">Unable to Load Dashboard</h2>
                        <p className="text-slate-600">{error}</p>
                    </div>
                    <button
                        onClick={fetchDashboardStats}
                        disabled={refreshing}
                        className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors duration-200 font-medium flex items-center space-x-2 mx-auto"
                    >
                        <div className={`${refreshing ? 'animate-spin' : ''}`}>🔄</div>
                        <span>Try Again</span>
                    </button>
                </div>
            </div>
        );
    }

    if (!stats) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50/30 flex items-center justify-center">
                <div className="text-center space-y-6">
                    <div className="text-slate-400 text-4xl">📦</div>
                    <div className="space-y-3">
                        <h2 className="text-2xl font-bold text-slate-800">No Data Available</h2>
                        <p className="text-slate-600">Dashboard statistics are not available at the moment.</p>
                    </div>
                    <button
                        onClick={fetchDashboardStats}
                        disabled={refreshing}
                        className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors font-medium flex items-center space-x-2 mx-auto"
                    >
                        <div className={`${refreshing ? 'animate-spin' : ''}`}>🔄</div>
                        <span>Refresh Data</span>
                    </button>
                </div>
            </div>
        );
    }

    const deliveryProgress = stats.packageStats.total_packages > 0
        ? (stats.packageStats.delivered / stats.packageStats.total_packages) * 100
        : 0;

    const paymentProgress = stats.paymentStats.total_payments > 0
        ? (stats.paymentStats.confirmed_payments / stats.paymentStats.total_payments) * 100
        : 0;

    const fleetUtilization = stats.fleetStats.total_vehicles > 0
        ? (stats.fleetStats.active_vehicles / stats.fleetStats.total_vehicles) * 100
        : 0;

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'delivered':
                return 'bg-green-100 text-green-800 border border-green-200';
            case 'in_transit':
                return 'bg-blue-100 text-blue-800 border border-blue-200';
            case 'out_for_delivery':
                return 'bg-blue-100 text-blue-800 border border-blue-200';
            case 'registered':
                return 'bg-amber-100 text-amber-800 border border-amber-200';
            default:
                return 'bg-gray-100 text-gray-800 border border-gray-200';
        }
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-RW', {
            style: 'currency',
            currency: 'RWF',
            minimumFractionDigits: 0
        }).format(amount);
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50/30 p-6">
            {/* Header Section */}
            <div className="mb-8">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-800">Delivery Dashboard</h1>
                        <p className="text-gray-600 mt-2">Real-time overview of your delivery operations and fleet</p>
                    </div>
                    <div className="flex items-center space-x-4">
                        <div className="flex items-center space-x-2">
                            <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                            <span className="text-sm font-medium text-green-600">Live</span>
                        </div>
                        <div className="text-sm text-gray-500">
                            Updated {formatRwandaTime(lastUpdated)}
                        </div>
                        <button
                            onClick={fetchDashboardStats}
                            disabled={refreshing}
                            className="flex items-center space-x-2 text-sm text-gray-600 hover:text-gray-800 disabled:opacity-50 transition-colors"
                        >
                            <div className={`${refreshing ? 'animate-spin' : ''}`}>🔄</div>
                            <span>Refresh</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Key Metrics Grid */}
            <div className="grid gap-6 mb-8 md:grid-cols-2 lg:grid-cols-4">
                {/* Total Packages */}
                <Card className="bg-white/80 backdrop-blur-sm border-gray-200 shadow-sm hover:shadow-md transition-all duration-300">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                        <CardTitle className="text-sm font-semibold text-gray-600">Total Packages</CardTitle>
                        <div className="p-2 bg-blue-50 rounded-lg">
                            <div className="text-blue-500">📦</div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-gray-800">{stats.packageStats.total_packages}</div>
                        <div className="flex items-center space-x-2 mt-2">
                            <div className="w-full bg-gray-200 rounded-full h-2">
                                <div
                                    className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                                    style={{ width: `${(stats.packageStats.in_transit / stats.packageStats.total_packages) * 100}%` }}
                                ></div>
                            </div>
                            <span className="text-xs font-medium text-gray-500 whitespace-nowrap">
                                {stats.packageStats.in_transit} in transit
                            </span>
                        </div>
                    </CardContent>
                </Card>

                {/* Fleet Status */}
                <Card className="bg-white/80 backdrop-blur-sm border-gray-200 shadow-sm hover:shadow-md transition-all duration-300">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                        <CardTitle className="text-sm font-semibold text-gray-600">Active Fleet</CardTitle>
                        <div className="p-2 bg-green-100 rounded-lg">
                            <div className="text-green-600">🚚</div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-gray-800">{stats.fleetStats.active_vehicles}</div>
                        <div className="flex items-center space-x-2 mt-2">
                            <div className="w-full bg-gray-200 rounded-full h-2">
                                <div
                                    className="bg-green-600 h-2 rounded-full transition-all duration-500"
                                    style={{ width: `${fleetUtilization}%` }}
                                ></div>
                            </div>
                            <span className="text-xs font-medium text-gray-500 whitespace-nowrap">
                                of {stats.fleetStats.total_vehicles}
                            </span>
                        </div>
                    </CardContent>
                </Card>

                {/* Delivered Packages */}
                <Card className="bg-white/80 backdrop-blur-sm border-gray-200 shadow-sm hover:shadow-md transition-all duration-300">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                        <CardTitle className="text-sm font-semibold text-gray-600">Delivered</CardTitle>
                        <div className="p-2 bg-green-100 rounded-lg">
                            <div className="text-green-600">✅</div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-gray-800">{stats.packageStats.delivered}</div>
                        <div className="flex items-center space-x-2 mt-2">
                            <Progress value={deliveryProgress} className="h-2 bg-gray-200 [&>div]:bg-green-500" />
                            <span className="text-xs text-gray-500 font-medium whitespace-nowrap">
                                {Math.round(deliveryProgress)}%
                            </span>
                        </div>
                    </CardContent>
                </Card>

                {/* Revenue */}
                <Card className="bg-white/80 backdrop-blur-sm border-gray-200 shadow-sm hover:shadow-md transition-all duration-300">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                        <CardTitle className="text-sm font-semibold text-gray-600">Total Revenue</CardTitle>
                        <div className="p-2 bg-green-100 rounded-lg">
                            <div className="text-green-600">💰</div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-gray-800">
                            {formatCurrency(Number(stats.paymentStats.total_amount) || 0)}
                        </div>
                        <p className="text-xs text-gray-500 mt-2">
                            {stats.paymentStats.confirmed_payments} confirmed payments
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Main Content Grid */}
            <div className="space-y-6">
                {/* Enhanced Real-time Fleet Tracking */}
                <EnhancedRealTimeTrackingMap />

                {/* Four Column Layout for Additional Data */}
                <div className="grid gap-6 lg:grid-cols-4">
                    {/* Payment Statistics */}
                    <Card className="bg-white/80 backdrop-blur-sm border-gray-200 shadow-sm lg:col-span-1">
                        <CardHeader className="pb-4">
                            <CardTitle className="flex items-center space-x-2 text-gray-800">
                                <div className="text-green-600">💰</div>
                                <span className="text-sm">Payment Overview</span>
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-medium text-gray-600">Total Payments</span>
                                    <span className="font-bold text-gray-800 text-sm">{stats.paymentStats.total_payments}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-medium text-gray-600">Total Amount</span>
                                    <span className="font-bold text-gray-800 text-sm">
                                        {formatCurrency(Number(stats.paymentStats.total_amount) || 0)}
                                    </span>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <div className="flex items-center justify-between text-xs">
                                    <span className="text-gray-600">Success Rate</span>
                                    <span className="font-medium text-green-600">
                                        {stats.paymentStats.confirmed_payments}/{stats.paymentStats.total_payments}
                                    </span>
                                </div>
                                <Progress
                                    value={paymentProgress}
                                    className="h-2 bg-gray-200 [&>div]:bg-green-500"
                                />
                                <div className="flex justify-between text-xs text-gray-500">
                                    <span>Pending: {stats.paymentStats.pending_payments}</span>
                                    <span>Confirmed: {stats.paymentStats.confirmed_payments}</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* CAR001 Detailed History */}
                    <Card className="bg-white/80 backdrop-blur-sm border-slate-200 shadow-sm lg:col-span-2">
                        <CardHeader className="pb-4">
                            <CardTitle className="flex items-center space-x-2 text-slate-800">
                                <div className="text-blue-600">🚗</div>
                                <span>CAR001 Location History</span>
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="max-h-80 overflow-y-auto">
                                <Car001History locationHistory={stats.locationHistory} />
                            </div>
                        </CardContent>
                    </Card>

                    {/* Recent Packages */}
                    <Card className="bg-white/80 backdrop-blur-sm border-slate-200 shadow-sm lg:col-span-1">
                        <CardHeader className="pb-4">
                            <CardTitle className="flex items-center space-x-2 text-slate-800">
                                <div className="text-blue-600">📦</div>
                                <span className="text-sm">Recent Packages</span>
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-3 max-h-80 overflow-y-auto">
                                {stats.recentPackages.slice(0, 4).map((pkg, index) => (
                                    <div
                                        key={pkg.package_id}
                                        className="flex items-center space-x-2 p-2 rounded-lg border border-slate-100 bg-white/50 hover:bg-white transition-colors duration-200 group"
                                    >
                                        <div className="flex-shrink-0 w-6 h-6 bg-slate-100 rounded-full flex items-center justify-center group-hover:bg-blue-100 transition-colors">
                                            <span className="text-xs font-medium text-slate-600">{index + 1}</span>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-xs font-semibold text-slate-800 truncate">
                                                {pkg.package_id}
                                            </p>
                                            <p className="text-xs text-slate-500 truncate">
                                                {pkg.sender_name} → {pkg.receiver_name}
                                            </p>
                                        </div>
                                        <div className="flex flex-col items-end space-y-1">
                                            <span
                                                className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${getStatusColor(pkg.status)}`}
                                            >
                                                {pkg.status.replace('_', ' ')}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Other Vehicles History */}
                <div className="grid gap-6 lg:grid-cols-2">
                    {/* Vehicle Location History */}
                    <Card className="bg-white/80 backdrop-blur-sm border-gray-200 shadow-sm">
                        <CardHeader className="pb-4">
                            <CardTitle className="flex items-center space-x-2 text-gray-900">
                                <div className="text-amber-600">📜</div>
                                <span>Other Vehicles History</span>
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <DashboardVehicleHistory locationHistory={stats.locationHistory} />
                        </CardContent>
                    </Card>

                    {/* Fleet Status Summary */}
                    <Card className="bg-white/80 backdrop-blur-sm border-slate-200 shadow-sm">
                        <CardHeader className="pb-4">
                            <CardTitle className="flex items-center space-x-2 text-slate-800">
                                <div className="text-green-600">🚚</div>
                                <span>Fleet Status Summary</span>
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                                    <span className="text-sm font-medium text-slate-700">Total Vehicles</span>
                                    <span className="font-bold text-slate-800">{stats.fleetStats.total_vehicles}</span>
                                </div>
                                <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                                    <span className="text-sm font-medium text-blue-700">In Transit</span>
                                    <span className="font-bold text-blue-800">{stats.fleetStats.active_vehicles}</span>
                                </div>
                                <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                                    <span className="text-sm font-medium text-green-700">Available</span>
                                    <span className="font-bold text-green-800">{stats.fleetStats.available_vehicles}</span>
                                </div>
                                <div className="flex justify-between items-center p-3 bg-amber-50 rounded-lg">
                                    <span className="text-sm font-medium text-amber-700">Maintenance</span>
                                    <span className="font-bold text-amber-800">{stats.fleetStats.maintenance_vehicles}</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}