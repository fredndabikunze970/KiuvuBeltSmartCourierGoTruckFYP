// components/maps/real-time-tracking-map.tsx
'use client';

import { db } from '@/lib/firebase-client';
import { off, onValue, ref } from 'firebase/database';
import 'leaflet/dist/leaflet.css';
import { useEffect, useState } from 'react';
import { MapContainer, Marker, Popup, TileLayer, useMap, Polyline } from 'react-leaflet';
import L from 'leaflet';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MapPin, Navigation, Clock, User, Truck, Package, Loader2, History, Route, Eye, EyeOff, Car, Wrench, RefreshCw } from 'lucide-react';
import { geocodingService } from '@/utils/geocoding-services';

// Fix for default markers in Next.js
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface TruckLocation {
    id: string;
    vehicle_id: string;
    plate_number: string;
    model: string;
    latitude: number;
    longitude: number;
    driver_name: string;
    driver_id: string;
    last_updated: string;
    status: string;
    speed?: number;
    heading?: number;
    accuracy?: number;
    address?: string;
    fullAddress?: string;
    district?: string;
    sector?: string;
    coordinatesDisplay?: string;
    geocodingStatus: 'pending' | 'loading' | 'completed' | 'failed';
    assigned_packages?: string[];
    route_coordinates?: Array<{ latitude: number; longitude: number; timestamp: string }>;
}

interface LocationHistory {
    [vehicleId: string]: {
        [timestamp: string]: {
            latitude: number;
            longitude: number;
            speed?: number;
            heading?: number;
            accuracy?: number;
            address?: string;
        };
    };
}

// Format to Rwandan time
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
            minute: '2-digit'
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

// Enhanced truck icons
const createTruckIcon = (status: string, plateNumber: string, speed?: number) => {
    const color =
        status === 'in_transit' ? '#3b82f6' :
            status === 'available' ? '#10b981' :
                status === 'maintenance' ? '#f59e0b' :
                    '#ef4444';

    const isMoving = speed && speed > 2;

    return L.divIcon({
        html: `
      <div class="relative flex flex-col items-center">
        <div class="relative ${isMoving ? 'animate-pulse' : ''}">
          <div class="w-8 h-8 rounded-full bg-white border-2 shadow-lg flex items-center justify-center transition-all duration-300" style="border-color: ${color}">
            <div class="text-lg">🚚</div>
            ${isMoving ? `
              <div class="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full border border-white animate-ping"></div>
            ` : ''}
          </div>
          <div class="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-white rotate-45 border-r border-b" style="border-color: ${color}"></div>
        </div>
        <div class="mt-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold text-white whitespace-nowrap shadow-sm" style="background-color: ${color}">
          ${plateNumber || 'RAA XXX'}
        </div>
      </div>
    `,
        className: 'truck-marker',
        iconSize: [16, 16],
        iconAnchor: [8, 16],
    });
};

// Map updater component
function MapUpdater({ locations, autoZoom }: { locations: TruckLocation[], autoZoom: boolean }) {
    const map = useMap();

    useEffect(() => {
        if (locations.length > 0 && autoZoom) {
            const group = new L.FeatureGroup(
                locations.map(loc => L.marker([loc.latitude, loc.longitude]))
            );

            const bounds = group.getBounds();
            if (bounds.isValid()) {
                map.fitBounds(bounds.pad(0.1), {
                    maxZoom: 16,
                    animate: true
                });
            }
        }
    }, [locations, map, autoZoom]);

    return null;
}

// Custom hook for real-time vehicle data
function useRealTimeVehicles() {
    const [truckLocations, setTruckLocations] = useState<TruckLocation[]>([]);
    const [locationHistory, setLocationHistory] = useState<LocationHistory>({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let unsubscribeVehicles: (() => void) | undefined;
        let unsubscribeHistory: (() => void) | undefined;

        const setupRealTimeTracking = async () => {
            try {
                const vehiclesRef = ref(db, 'vehicles');
                const historyRef = ref(db, 'location_history');

                unsubscribeVehicles = onValue(vehiclesRef, async (vehiclesSnapshot) => {
                    const vehiclesData = vehiclesSnapshot.val();

                    unsubscribeHistory = onValue(historyRef, async (historySnapshot) => {
                        const historyData = historySnapshot.val();

                        if (vehiclesData) {
                            try {
                                const locations: TruckLocation[] = [];

                                // First pass: create locations with coordinates only
                                Object.entries(vehiclesData).forEach(([vehicleId, vehicle]: [string, any]) => {
                                    if (vehicle?.current_location?.latitude && vehicle?.current_location?.longitude) {
                                        const coordinatesDisplay = geocodingService.getCoordinatesDisplay(
                                            vehicle.current_location.latitude,
                                            vehicle.current_location.longitude
                                        );

                                        const locationData: TruckLocation = {
                                            id: vehicleId,
                                            vehicle_id: vehicle.vehicle_id || vehicleId,
                                            plate_number: vehicle.plate_number || `RAA ${vehicleId.slice(-3).toUpperCase()}A`,
                                            model: vehicle.model || 'Delivery Truck',
                                            latitude: vehicle.current_location.latitude,
                                            longitude: vehicle.current_location.longitude,
                                            driver_name: vehicle.driver_name || `Driver ${vehicle.driver_id || '001'}`,
                                            driver_id: vehicle.driver_id || `DRV${vehicleId.slice(-3)}`,
                                            last_updated: vehicle.last_updated || new Date().toISOString(),
                                            status: vehicle.status || 'in_transit',
                                            speed: vehicle.current_location.speed,
                                            heading: vehicle.current_location.heading,
                                            accuracy: vehicle.current_location.accuracy,
                                            coordinatesDisplay: coordinatesDisplay,
                                            geocodingStatus: 'pending',
                                            assigned_packages: vehicle.assigned_packages || []
                                        };

                                        locations.push(locationData);
                                    }
                                });

                                // Set initial state with coordinates only
                                setTruckLocations(locations);
                                setLocationHistory(historyData || {});
                                setError(null);
                                setLoading(false);

                                // Second pass: geocode addresses in background
                                locations.forEach(async (location) => {
                                    try {
                                        setTruckLocations(prev => prev.map(loc =>
                                            loc.id === location.id ? { ...loc, geocodingStatus: 'loading' } : loc
                                        ));

                                        const geocodeResult = await geocodingService.geocode(
                                            location.latitude,
                                            location.longitude
                                        );

                                        setTruckLocations(prev => prev.map(loc =>
                                            loc.id === location.id ? {
                                                ...loc,
                                                address: geocodeResult.address,
                                                fullAddress: geocodeResult.fullAddress,
                                                district: geocodeResult.district,
                                                sector: geocodeResult.sector,
                                                geocodingStatus: 'completed'
                                            } : loc
                                        ));

                                    } catch (error) {
                                        console.warn(`Geocoding failed for vehicle ${location.id}:`, error);
                                        setTruckLocations(prev => prev.map(loc =>
                                            loc.id === location.id ? {
                                                ...loc,
                                                geocodingStatus: 'failed',
                                                address: location.coordinatesDisplay + ' (Geocoding failed)'
                                            } : loc
                                        ));
                                    }
                                });

                            } catch (processingError) {
                                console.error('Error processing vehicle data:', processingError);
                                setError('Failed to process vehicle data');
                                setLoading(false);
                            }
                        } else {
                            setTruckLocations([]);
                            setLocationHistory({});
                            setLoading(false);
                        }
                    }, (historyError) => {
                        console.error('Firebase history listener error:', historyError);
                        setError('Failed to load location history');
                        setLoading(false);
                    });

                }, (vehiclesError) => {
                    console.error('Firebase vehicles listener error:', vehiclesError);
                    setError('Failed to connect to real-time tracking service');
                    setLoading(false);
                });

            } catch (err) {
                console.error('Error setting up real-time listener:', err);
                setError('Failed to initialize tracking service');
                setLoading(false);
            }
        };

        setupRealTimeTracking();

        return () => {
            if (unsubscribeVehicles) unsubscribeVehicles();
            if (unsubscribeHistory) unsubscribeHistory();
        };
    }, []);

    return { truckLocations, locationHistory, loading, error };
}

// Fleet Overview Component
function FleetOverviewPanel({
    isVisible,
    onToggle,
    truckLocations
}: {
    isVisible: boolean;
    onToggle: () => void;
    truckLocations: TruckLocation[];
}) {
    if (!isVisible) return null;

    const inTransitVehicles = truckLocations.filter(truck => truck.status === 'in_transit');
    const availableVehicles = truckLocations.filter(truck => truck.status === 'available');
    const maintenanceVehicles = truckLocations.filter(truck => truck.status === 'maintenance');

    return (
        <div className="absolute top-4 right-4 bg-white/95 backdrop-blur-sm rounded-xl shadow-xl p-4 min-w-[220px] border border-slate-200 z-[1000]">
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-2">
                    <Truck className="h-4 w-4 text-blue-600" />
                    <h4 className="font-bold text-slate-800 text-sm">Fleet Overview</h4>
                </div>
                <button
                    onClick={onToggle}
                    className="text-slate-400 hover:text-slate-600 transition-colors"
                >
                    <EyeOff className="h-4 w-4" />
                </button>
            </div>
            <div className="space-y-3">
                <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                    <span className="text-xs font-semibold text-slate-700">Total Vehicles</span>
                    <span className="font-bold text-slate-900 text-lg">{truckLocations.length}</span>
                </div>
                <div className="flex justify-between items-center py-1">
                    <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                        <span className="text-xs text-slate-600">In Transit</span>
                    </div>
                    <span className="font-bold text-blue-600 text-sm">{inTransitVehicles.length}</span>
                </div>
                <div className="flex justify-between items-center py-1">
                    <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <span className="text-xs text-slate-600">Available</span>
                    </div>
                    <span className="font-bold text-green-600 text-sm">{availableVehicles.length}</span>
                </div>
                <div className="flex justify-between items-center py-1">
                    <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-amber-500 rounded-full"></div>
                        <span className="text-xs text-slate-600">Maintenance</span>
                    </div>
                    <span className="font-bold text-amber-600 text-sm">{maintenanceVehicles.length}</span>
                </div>
            </div>
        </div>
    );
}

// Vehicle History Component
function VehicleHistoryPanel({
    vehicle,
    locationHistory,
    isExpanded
}: {
    vehicle: TruckLocation;
    locationHistory: LocationHistory;
    isExpanded: boolean;
}) {
    const [historyPoints, setHistoryPoints] = useState<any[]>([]);
    const [loadingHistory, setLoadingHistory] = useState(true);

    useEffect(() => {
        const loadHistoryData = async () => {
            if (!vehicle || !locationHistory[vehicle.id]) {
                setHistoryPoints([]);
                setLoadingHistory(false);
                return;
            }

            try {
                const vehicleHistory = locationHistory[vehicle.id];
                const historyEntries = Object.entries(vehicleHistory)
                    .sort(([a], [b]) => parseInt(b) - parseInt(a))
                    .slice(0, 6);

                const historyWithAddresses = await Promise.all(
                    historyEntries.map(async ([timestamp, data]: [string, any]) => {
                        let address = data.address;
                        let formattedAddress = '';

                        try {
                            if (!address) {
                                const geocodeResult = await geocodingService.geocode(data.latitude, data.longitude);
                                address = geocodeResult.address;
                            }

                            if (address) {
                                formattedAddress = address;
                            }
                        } catch (error) {
                            console.warn('Failed to geocode history point:', error);
                            address = geocodingService.getCoordinatesDisplay(data.latitude, data.longitude);
                            formattedAddress = address;
                        }

                        return {
                            latitude: data.latitude,
                            longitude: data.longitude,
                            timestamp,
                            address: address || 'Address not available',
                            formattedAddress: formattedAddress || 'Acquiring location information...',
                            speed: data.speed
                        };
                    })
                );

                setHistoryPoints(historyWithAddresses);
            } catch (error) {
                console.error('Error loading history data:', error);
                setHistoryPoints([]);
            } finally {
                setLoadingHistory(false);
            }
        };

        if (isExpanded) {
            loadHistoryData();
        }
    }, [vehicle, locationHistory, isExpanded]);

    if (!isExpanded) return null;

    return (
        <div className="absolute bottom-4 left-4 bg-white/95 backdrop-blur-sm rounded-xl shadow-xl p-4 min-w-[300px] max-w-[400px] border border-slate-200 max-h-80 overflow-y-auto z-[1000]">
            <div className="flex items-center justify-between mb-3">
                <h4 className="font-bold text-slate-800 text-sm flex items-center space-x-2">
                    <History className="h-4 w-4 text-blue-600" />
                    <span>Vehicle History - {vehicle.plate_number}</span>
                </h4>
            </div>

            {loadingHistory ? (
                <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 text-blue-600 animate-spin" />
                    <span className="ml-2 text-sm text-slate-600">Loading history...</span>
                </div>
            ) : historyPoints.length === 0 ? (
                <div className="text-center py-8 text-slate-500 text-sm">
                    No history data available for this vehicle
                </div>
            ) : (
                <div className="space-y-3">
                    {historyPoints.map((point, index) => (
                        <div key={point.timestamp} className="bg-slate-50 rounded-lg p-3 border border-slate-200">
                            <div className="flex justify-between items-start mb-2">
                                <div className="flex items-center space-x-2">
                                    <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                                        <span className="text-xs font-bold text-blue-600">{index + 1}</span>
                                    </div>
                                    <div>
                                        <p className="text-xs font-semibold text-slate-700">
                                            {formatRwandaTime(point.timestamp)}
                                        </p>
                                        {point.speed && (
                                            <p className="text-xs text-slate-500">
                                                Speed: {(point.speed * 3.6).toFixed(1)} km/h
                                            </p>
                                        )}
                                    </div>
                                </div>
                                <div className="text-xs text-slate-500 bg-white px-2 py-1 rounded border">
                                    📍 {point.latitude.toFixed(4)}, {point.longitude.toFixed(4)}
                                </div>
                            </div>
                            <p className="text-xs text-slate-600 leading-tight bg-white/60 p-2 rounded border border-slate-100">
                                {point.formattedAddress}
                            </p>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

export function EnhancedRealTimeTrackingMap() {
    const { truckLocations, locationHistory, loading, error } = useRealTimeVehicles();
    const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
    const [mapType, setMapType] = useState<'standard' | 'satellite'>('standard');
    const [showRouteHistory, setShowRouteHistory] = useState<boolean>(true);
    const [autoZoom, setAutoZoom] = useState<boolean>(true);
    const [showFleetOverview, setShowFleetOverview] = useState<boolean>(true);
    const [selectedTruck, setSelectedTruck] = useState<TruckLocation | null>(null);
    const [showVehicleHistory, setShowVehicleHistory] = useState<boolean>(false);
    const [refreshingGeocoding, setRefreshingGeocoding] = useState<Set<string>>(new Set());

    // Update timestamp when locations change
    useEffect(() => {
        if (truckLocations.length > 0) {
            setLastUpdate(new Date());
            if (!selectedTruck && truckLocations.length > 0) {
                setSelectedTruck(truckLocations[0]);
            }
        }
    }, [truckLocations, selectedTruck]);

    // Manual refresh of geocoding for a specific truck
    const refreshGeocoding = async (truckId: string) => {
        if (refreshingGeocoding.has(truckId)) return;

        setRefreshingGeocoding(prev => new Set(prev).add(truckId));

        const truck = truckLocations.find(t => t.id === truckId);
        if (!truck) return;

        try {
            setTruckLocations(prev => prev.map(loc =>
                loc.id === truckId ? { ...loc, geocodingStatus: 'loading' } : loc
            ));

            const geocodeResult = await geocodingService.geocode(
                truck.latitude,
                truck.longitude
            );

            setTruckLocations(prev => prev.map(loc =>
                loc.id === truckId ? {
                    ...loc,
                    address: geocodeResult.address,
                    fullAddress: geocodeResult.fullAddress,
                    district: geocodeResult.district,
                    sector: geocodeResult.sector,
                    geocodingStatus: 'completed'
                } : loc
            ));

        } catch (error) {
            console.warn(`Manual geocoding refresh failed for vehicle ${truckId}:`, error);
            setTruckLocations(prev => prev.map(loc =>
                loc.id === truckId ? {
                    ...loc,
                    geocodingStatus: 'failed',
                    address: truck.coordinatesDisplay + ' (Refresh failed)'
                } : loc
            ));
        } finally {
            setRefreshingGeocoding(prev => {
                const newSet = new Set(prev);
                newSet.delete(truckId);
                return newSet;
            });
        }
    };

    // Filter vehicles by status
    const inTransitVehicles = truckLocations.filter(truck => truck.status === 'in_transit');
    const availableVehicles = truckLocations.filter(truck => truck.status === 'available');
    const maintenanceVehicles = truckLocations.filter(truck => truck.status === 'maintenance');

    // Function to get route coordinates for a vehicle
    const getRouteCoordinates = (truck: TruckLocation) => {
        if (!showRouteHistory || !truck.route_coordinates || truck.route_coordinates.length < 2) {
            return [];
        }

        return truck.route_coordinates.map(coord => [coord.latitude, coord.longitude] as [number, number]);
    };

    if (loading) {
        return (
            <Card className="bg-white/80 backdrop-blur-sm border-slate-200 shadow-lg">
                <CardHeader className="pb-4">
                    <CardTitle className="flex items-center space-x-2 text-slate-800">
                        <MapPin className="h-5 w-5 text-blue-600" />
                        <span>Real-time Fleet Tracking</span>
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="h-96 w-full rounded-lg bg-gradient-to-br from-slate-50 to-blue-50/20 border border-slate-200 flex items-center justify-center">
                        <div className="text-center space-y-4">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                            <div className="space-y-2">
                                <p className="font-semibold text-slate-800">Initializing Fleet Tracking</p>
                                <p className="text-sm text-slate-600">Loading vehicle locations...</p>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>
        );
    }

    if (error) {
        return (
            <Card className="bg-white/80 backdrop-blur-sm border-slate-200 shadow-lg">
                <CardHeader className="pb-4">
                    <CardTitle className="flex items-center space-x-2 text-slate-800">
                        <MapPin className="h-5 w-5 text-blue-600" />
                        <span>Real-time Fleet Tracking</span>
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="h-96 w-full rounded-lg bg-red-50/80 border border-red-200 flex items-center justify-center">
                        <div className="text-center space-y-4 max-w-sm">
                            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto">
                                <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.35 16.5c-.77.833.192 2.5 1.732 2.5z" />
                                </svg>
                            </div>
                            <div className="space-y-2">
                                <h3 className="font-semibold text-red-800 text-lg">Tracking Service Unavailable</h3>
                                <p className="text-red-600 text-sm">{error}</p>
                            </div>
                            <button
                                onClick={() => window.location.reload()}
                                className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
                            >
                                Retry Connection
                            </button>
                        </div>
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="bg-white/80 backdrop-blur-sm border-slate-200 shadow-lg">
            <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center space-x-2 text-slate-800">
                        <MapPin className="h-5 w-5 text-blue-600" />
                        <span>Real-time Fleet Tracking</span>
                    </CardTitle>
                    <div className="flex items-center space-x-4">
                        <div className="flex items-center space-x-2">
                            <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                            <span className="text-sm font-medium text-green-600">Live</span>
                        </div>
                        <div className="text-sm text-slate-500">
                            Updated {formatRwandaTime(lastUpdate)}
                        </div>
                    </div>
                </div>

                {/* Map Controls */}
                <div className="flex flex-wrap items-center justify-between gap-4 mt-4">
                    <div className="flex items-center space-x-4">
                        <div className="flex items-center space-x-2">
                            <label className="text-sm font-medium text-slate-700">Map View:</label>
                            <select
                                value={mapType}
                                onChange={(e) => setMapType(e.target.value as any)}
                                className="text-sm border border-slate-300 rounded-lg px-3 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                            >
                                <option value="standard">🗺️ Street Map</option>
                                <option value="satellite">🛰️ Satellite</option>
                            </select>
                        </div>

                        <div className="flex items-center space-x-2">
                            <input
                                type="checkbox"
                                id="showRouteHistory"
                                checked={showRouteHistory}
                                onChange={(e) => setShowRouteHistory(e.target.checked)}
                                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                            />
                            <label htmlFor="showRouteHistory" className="flex items-center space-x-1 text-sm text-slate-700">
                                <Route className="h-4 w-4" />
                                <span>Show Route</span>
                            </label>
                        </div>

                        <div className="flex items-center space-x-2">
                            <input
                                type="checkbox"
                                id="autoZoom"
                                checked={autoZoom}
                                onChange={(e) => setAutoZoom(e.target.checked)}
                                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                            />
                            <label htmlFor="autoZoom" className="flex items-center space-x-1 text-sm text-slate-700">
                                <MapPin className="h-4 w-4" />
                                <span>Auto Zoom</span>
                            </label>
                        </div>

                        <button
                            onClick={() => setShowFleetOverview(!showFleetOverview)}
                            className="flex items-center space-x-1 text-sm text-slate-700 bg-slate-100 hover:bg-slate-200 px-3 py-1 rounded-lg transition-colors"
                        >
                            {showFleetOverview ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            <span>Fleet Overview</span>
                        </button>

                        {selectedTruck && (
                            <button
                                onClick={() => setShowVehicleHistory(!showVehicleHistory)}
                                className="flex items-center space-x-1 text-sm text-slate-700 bg-slate-100 hover:bg-slate-200 px-3 py-1 rounded-lg transition-colors"
                            >
                                <History className="h-4 w-4" />
                                <span>Vehicle History</span>
                            </button>
                        )}
                    </div>

                    <div className="flex items-center space-x-4 text-sm">
                        <div className="flex items-center space-x-2 bg-blue-50 px-3 py-1 rounded-lg">
                            <Car className="h-4 w-4 text-blue-600" />
                            <span className="text-slate-700">In Transit: <strong className="text-blue-600">{inTransitVehicles.length}</strong></span>
                        </div>
                        <div className="flex items-center space-x-2 bg-green-50 px-3 py-1 rounded-lg">
                            <Truck className="h-4 w-4 text-green-600" />
                            <span className="text-slate-700">Available: <strong className="text-green-600">{availableVehicles.length}</strong></span>
                        </div>
                        <div className="flex items-center space-x-2 bg-amber-50 px-3 py-1 rounded-lg">
                            <Wrench className="h-4 w-4 text-amber-600" />
                            <span className="text-slate-700">Maintenance: <strong className="text-amber-600">{maintenanceVehicles.length}</strong></span>
                        </div>
                    </div>
                </div>
            </CardHeader>

            <CardContent className="p-0">
                <div className="h-96 lg:h-[500px] relative">
                    <MapContainer
                        center={[-1.9441, 30.0619]} // Kigali, Rwanda
                        zoom={13}
                        style={{ height: '100%', width: '100%' }}
                        scrollWheelZoom={true}
                        className="z-0"
                    >
                        <TileLayer
                            url={mapType === 'standard'
                                ? "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                : "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                            }
                            attribution={mapType === 'standard'
                                ? '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                                : '&copy; <a href="https://www.esri.com/">Esri</a>'
                            }
                        />

                        <MapUpdater locations={truckLocations} autoZoom={autoZoom && truckLocations.length > 0} />

                        {/* Render route history polylines */}
                        {truckLocations.map((truck) => {
                            const routeCoordinates = getRouteCoordinates(truck);
                            if (routeCoordinates.length > 0) {
                                return (
                                    <Polyline
                                        key={`route-${truck.id}`}
                                        positions={routeCoordinates}
                                        color={truck.status === 'in_transit' ? '#3b82f6' :
                                            truck.status === 'available' ? '#10b981' : '#f59e0b'}
                                        weight={3}
                                        opacity={0.6}
                                    />
                                );
                            }
                            return null;
                        })}

                        {/* Render truck markers */}
                        {truckLocations.map((truck) => (
                            <Marker
                                key={truck.id}
                                position={[truck.latitude, truck.longitude]}
                                icon={createTruckIcon(truck.status, truck.plate_number, truck.speed)}
                                eventHandlers={{
                                    click: () => {
                                        setSelectedTruck(truck);
                                        setShowVehicleHistory(true);
                                    },
                                }}
                            >
                                <Popup className="custom-popup min-w-[320px]">
                                    <div className="p-3">
                                        <div className="flex items-start justify-between mb-3">
                                            <div className="flex items-center space-x-2">
                                                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                                                    <Truck className="h-4 w-4 text-blue-600" />
                                                </div>
                                                <div className="min-w-0">
                                                    <h3 className="font-bold text-sm text-slate-900 truncate">{truck.driver_name}</h3>
                                                    <p className="text-xs text-slate-600 truncate">{truck.model} • {truck.plate_number}</p>
                                                </div>
                                            </div>
                                            <span className={`px-2 py-1 rounded-full text-[10px] font-semibold flex-shrink-0 ${truck.status === 'in_transit'
                                                ? 'bg-blue-100 text-blue-800 border border-blue-200'
                                                : truck.status === 'available'
                                                    ? 'bg-green-100 text-green-800 border border-green-200'
                                                    : truck.status === 'maintenance'
                                                        ? 'bg-amber-100 text-amber-800 border border-amber-200'
                                                        : 'bg-red-100 text-red-800 border border-red-200'
                                                }`}>
                                                {truck.status.replace('_', ' ').toUpperCase()}
                                            </span>
                                        </div>

                                        <div className="space-y-3">
                                            {/* Location Information */}
                                            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-3 border border-blue-200">
                                                <div className="flex items-center justify-between mb-2">
                                                    <div className="flex items-center space-x-1">
                                                        <MapPin className="h-4 w-4 text-blue-600 flex-shrink-0" />
                                                        <span className="font-bold text-blue-900 text-xs">CURRENT LOCATION</span>
                                                    </div>
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            refreshGeocoding(truck.id);
                                                        }}
                                                        disabled={refreshingGeocoding.has(truck.id) || truck.geocodingStatus === 'loading'}
                                                        className="flex items-center space-x-1 text-[10px] bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium flex-shrink-0"
                                                    >
                                                        {refreshingGeocoding.has(truck.id) || truck.geocodingStatus === 'loading' ? (
                                                            <Loader2 className="h-2.5 w-2.5 animate-spin" />
                                                        ) : (
                                                            <RefreshCw className="h-2.5 w-2.5" />
                                                        )}
                                                        <span>Refresh</span>
                                                    </button>
                                                </div>

                                                <div className="space-y-2">
                                                    <div className="flex items-center space-x-1">
                                                        <span className="text-xs text-blue-700 bg-blue-100 px-1.5 py-0.5 rounded font-mono">
                                                            📍 {truck.coordinatesDisplay}
                                                        </span>
                                                    </div>

                                                    <div className="mt-1">
                                                        {truck.geocodingStatus === 'loading' ? (
                                                            <div className="flex items-center space-x-2 bg-white/60 p-2 rounded border border-blue-100">
                                                                <Loader2 className="h-3 w-3 text-blue-600 animate-spin flex-shrink-0" />
                                                                <div>
                                                                    <p className="text-blue-700 text-xs font-medium">Getting address from coordinates...</p>
                                                                    <p className="text-blue-600 text-[10px] mt-1">
                                                                        Using LocationIQ & Google Maps APIs
                                                                    </p>
                                                                </div>
                                                            </div>
                                                        ) : truck.address ? (
                                                            <>
                                                                <p className="text-blue-800 text-xs leading-tight font-medium bg-white/60 p-2 rounded border border-blue-100">
                                                                    {truck.address}
                                                                </p>
                                                                {truck.fullAddress && truck.fullAddress !== truck.address && (
                                                                    <p className="text-blue-600 text-[10px] mt-1 italic">
                                                                        {truck.fullAddress}
                                                                    </p>
                                                                )}
                                                                <p className="text-green-600 text-[10px] mt-1 font-medium">
                                                                    ✅ Real address from coordinates
                                                                </p>
                                                            </>
                                                        ) : (
                                                            <div className="flex items-center space-x-2 bg-amber-50 p-2 rounded border border-amber-200">
                                                                <Loader2 className="h-3 w-3 text-amber-600 animate-spin flex-shrink-0" />
                                                                <div>
                                                                    <p className="text-amber-700 text-xs font-medium">Acquiring address details...</p>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Vehicle Details */}
                                            <div className="grid grid-cols-2 gap-2 text-xs">
                                                <div className="bg-slate-50 p-2 rounded">
                                                    <div className="flex items-center space-x-1 mb-1">
                                                        <Truck className="h-3 w-3 text-slate-600" />
                                                        <span className="font-semibold text-slate-700">Vehicle ID</span>
                                                    </div>
                                                    <p className="text-slate-900 font-mono text-[10px] bg-white px-1.5 py-0.5 rounded border truncate">
                                                        {truck.vehicle_id}
                                                    </p>
                                                </div>
                                                <div className="bg-slate-50 p-2 rounded">
                                                    <div className="flex items-center space-x-1 mb-1">
                                                        <User className="h-3 w-3 text-slate-600" />
                                                        <span className="font-semibold text-slate-700">Driver ID</span>
                                                    </div>
                                                    <p className="text-slate-900 font-medium text-xs">{truck.driver_id}</p>
                                                </div>
                                                <div className="bg-slate-50 p-2 rounded">
                                                    <div className="flex items-center space-x-1 mb-1">
                                                        <Package className="h-3 w-3 text-slate-600" />
                                                        <span className="font-semibold text-slate-700">Packages</span>
                                                    </div>
                                                    <p className="text-slate-900 font-bold text-sm">
                                                        {truck.assigned_packages?.length || 0}
                                                    </p>
                                                </div>
                                                {truck.speed !== undefined && (
                                                    <div className="bg-slate-50 p-2 rounded">
                                                        <div className="flex items-center space-x-1 mb-1">
                                                            <Navigation className="h-3 w-3 text-slate-600" />
                                                            <span className="font-semibold text-slate-700">Speed</span>
                                                        </div>
                                                        <p className={`font-bold text-sm ${(truck.speed * 3.6) > 80 ? 'text-red-600' :
                                                            (truck.speed * 3.6) > 50 ? 'text-amber-600' : 'text-green-600'
                                                            }`}>
                                                            {(truck.speed * 3.6).toFixed(1)} km/h
                                                        </p>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Last Update */}
                                            <div className="bg-slate-50 rounded p-2">
                                                <div className="flex items-center justify-between text-xs">
                                                    <div className="flex items-center space-x-1">
                                                        <Clock className="h-3 w-3 text-slate-600" />
                                                        <span className="font-semibold text-slate-700">Last Update</span>
                                                    </div>
                                                    <span className="text-slate-900 font-medium text-xs">
                                                        {formatRwandaTime(truck.last_updated)}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* History Button */}
                                            <button
                                                onClick={() => {
                                                    setSelectedTruck(truck);
                                                    setShowVehicleHistory(true);
                                                }}
                                                className="w-full flex items-center justify-center space-x-2 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                                            >
                                                <History className="h-4 w-4" />
                                                <span>View Location History</span>
                                            </button>
                                        </div>
                                    </div>
                                </Popup>
                            </Marker>
                        ))}
                    </MapContainer>

                    {/* Toggleable Fleet Overview Panel */}
                    <FleetOverviewPanel
                        isVisible={showFleetOverview}
                        onToggle={() => setShowFleetOverview(false)}
                        truckLocations={truckLocations}
                    />

                    {/* Vehicle History Panel */}
                    {selectedTruck && (
                        <VehicleHistoryPanel
                            vehicle={selectedTruck}
                            locationHistory={locationHistory}
                            isExpanded={showVehicleHistory}
                        />
                    )}

                    {/* Control indicators */}
                    <div className="absolute bottom-4 right-4 flex flex-col space-y-1">
                        <div className="bg-green-500/90 text-white px-2 py-1 rounded-full text-[10px] font-medium backdrop-blur-sm">
                            🔄 Real-time
                        </div>
                        <div className="bg-purple-500/90 text-white px-2 py-1 rounded-full text-[10px] font-medium backdrop-blur-sm flex items-center space-x-1">
                            <Route className="h-2.5 w-2.5" />
                            <span>Route: {showRouteHistory ? 'ON' : 'OFF'}</span>
                        </div>
                        <div className="bg-blue-500/90 text-white px-2 py-1 rounded-full text-[10px] font-medium backdrop-blur-sm flex items-center space-x-1">
                            <MapPin className="h-2.5 w-2.5" />
                            <span>Zoom: {autoZoom ? 'ON' : 'OFF'}</span>
                        </div>
                    </div>

                    {/* Geocoding Status */}
                    {truckLocations.some(truck => truck.geocodingStatus === 'loading') && (
                        <div className="absolute bottom-4 left-4 bg-blue-500/90 text-white px-3 py-2 rounded-lg text-xs font-medium backdrop-blur-sm flex items-center space-x-2">
                            <Loader2 className="h-3 w-3 animate-spin" />
                            <span>Getting real addresses from coordinates...</span>
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}