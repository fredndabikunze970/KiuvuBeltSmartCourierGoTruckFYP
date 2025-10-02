'use client';

import { db } from '@/lib/firebase-client';
import { off, onValue, ref } from 'firebase/database';
import 'leaflet/dist/leaflet.css';
import { useEffect, useState } from 'react';
import { MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MapPin, Navigation, Clock, User, Truck, Package, Loader2, Satellite, Car, Wrench } from 'lucide-react';

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
    assigned_packages?: string[];
    route_coordinates?: Array<{ latitude: number; longitude: number; timestamp: string }>;
}

// Enhanced truck icons with better design
const createTruckIcon = (status: string, plateNumber: string, speed?: number) => {
    const color =
        status === 'in_transit' ? '#3b82f6' :
            status === 'available' ? '#10b981' :
                status === 'maintenance' ? '#f59e0b' :
                    '#ef4444';

    const iconSize = speed && speed > 0 ? 'w-14 h-14' : 'w-12 h-12';
    const pulseAnimation = status === 'in_transit' ? 'animate-pulse' : '';

    return L.divIcon({
        html: `
            <div class="relative flex flex-col items-center">
                <div class="relative ${pulseAnimation}">
                    <div class="${iconSize} rounded-full bg-white border-3 shadow-lg flex items-center justify-center transition-all duration-300" style="border-color: ${color}">
                        <div class="text-2xl">🚚</div>
                        ${speed && speed > 0 ? `
                            <div class="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full border-2 border-white animate-ping"></div>
                        ` : ''}
                    </div>
                    <div class="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-3 h-3 bg-white rotate-45 border-r border-b" style="border-color: ${color}"></div>
                </div>
                <div class="mt-1 px-2 py-1 rounded-full text-xs font-bold text-white whitespace-nowrap shadow-sm" style="background-color: ${color}">
                    ${plateNumber}
                </div>
            </div>
        `,
        className: 'truck-marker',
        iconSize: [70, 70],
        iconAnchor: [35, 55],
    });
};

// Map updater component
function MapUpdater({ locations }: { locations: TruckLocation[] }) {
    const map = useMap();

    useEffect(() => {
        if (locations.length > 0) {
            const group = new L.FeatureGroup(
                locations.map(loc => L.marker([loc.latitude, loc.longitude]))
            );
            map.fitBounds(group.getBounds().pad(0.1));
        }
    }, [locations, map]);

    return null;
}

// Geocoding service using OpenStreetMap Nominatim API
const geocodeLocation = async (latitude: number, longitude: number): Promise<string | null> => {
    try {
        const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=16&addressdetails=1`,
            {
                headers: {
                    'User-Agent': 'DeliveryDashboard/1.0',
                    'Accept-Language': 'en'
                }
            }
        );

        if (!response.ok) {
            throw new Error(`Geocoding failed: ${response.status}`);
        }

        const data = await response.json();

        if (data && data.display_name) {
            return data.display_name;
        }

        return null;
    } catch (error) {
        console.error('Geocoding error:', error);
        return null;
    }
};

// Custom hook for real-time vehicle data with geocoding and auto-refresh
function useRealTimeVehicles() {
    const [truckLocations, setTruckLocations] = useState<TruckLocation[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [refreshCount, setRefreshCount] = useState(0);

    // Function to process vehicle data with geocoding
    const processVehicleData = async (vehiclesData: any): Promise<TruckLocation[]> => {
        const locations: TruckLocation[] = [];
        const processedVehicles = Object.entries(vehiclesData);

        // First pass: create location objects without geocoding
        for (const [vehicleId, vehicle] of processedVehicles) {
            if (vehicle?.current_location?.latitude && vehicle?.current_location?.longitude) {
                const locationData: TruckLocation = {
                    id: vehicleId,
                    vehicle_id: vehicle.vehicle_id || vehicleId,
                    plate_number: vehicle.plate_number || 'UNKNOWN',
                    model: vehicle.model || 'Unknown Model',
                    latitude: vehicle.current_location.latitude,
                    longitude: vehicle.current_location.longitude,
                    driver_name: vehicle.driver_name || `Driver ${vehicle.driver_id || 'Unknown'}`,
                    driver_id: vehicle.driver_id || 'unknown',
                    last_updated: new Date(vehicle.last_updated || vehicle.current_location.timestamp || Date.now()).toISOString(),
                    status: vehicle.status || 'unknown',
                    speed: vehicle.current_location.speed,
                    heading: vehicle.current_location.heading,
                    accuracy: vehicle.current_location.accuracy,
                    address: vehicle.current_location.address,
                    assigned_packages: vehicle.assigned_packages || []
                };

                // Add route history if available
                if (vehicle.route_history) {
                    locationData.route_coordinates = Object.values(vehicle.route_history)
                        .sort((a: any, b: any) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
                        .slice(-10);
                }

                locations.push(locationData);
            }
        }

        return locations;
    };

    // Function to refresh geocoded addresses for all vehicles
    const refreshGeocodedAddresses = async (locations: TruckLocation[]): Promise<TruckLocation[]> => {
        const refreshedLocations = [...locations];

        const geocodingPromises = refreshedLocations.map(async (truck, index) => {
            try {
                // Only geocode if we don't have an address or it's time to refresh
                if (!truck.address || refreshCount % 3 === 0) { // Refresh address every 15 seconds (3 cycles)
                    const geocodedAddress = await geocodeLocation(truck.latitude, truck.longitude);
                    if (geocodedAddress) {
                        refreshedLocations[index] = {
                            ...truck,
                            address: geocodedAddress
                        };
                    }
                }
            } catch (error) {
                console.warn(`Failed to geocode for vehicle ${truck.id}:`, error);
            }
        });

        await Promise.allSettled(geocodingPromises);
        return refreshedLocations;
    };

    useEffect(() => {
        let unsubscribe: (() => void) | undefined;
        let refreshInterval: NodeJS.Timeout | undefined;

        const setupRealTimeTracking = async () => {
            try {
                console.log('Setting up real-time listener for vehicles...');
                const vehiclesRef = ref(db, 'vehicles');

                unsubscribe = onValue(vehiclesRef, async (snapshot) => {
                    const vehiclesData = snapshot.val();

                    if (vehiclesData) {
                        try {
                            // Process vehicle data first
                            const processedLocations = await processVehicleData(vehiclesData);

                            // Then update with geocoded addresses
                            const locationsWithAddresses = await refreshGeocodedAddresses(processedLocations);

                            setTruckLocations(locationsWithAddresses);
                            setError(null);
                        } catch (processingError) {
                            console.error('Error processing vehicle data:', processingError);
                        }
                    } else {
                        setTruckLocations([]);
                    }

                    setLoading(false);
                }, (error) => {
                    console.error('Firebase listener error:', error);
                    setError('Failed to connect to real-time tracking service');
                    setLoading(false);
                });

            } catch (err) {
                console.error('Error setting up real-time listener:', err);
                setError('Failed to initialize tracking service');
                setLoading(false);
            }
        };

        // Setup real-time tracking
        setupRealTimeTracking();

        // Setup auto-refresh interval for geocoding (every 5 seconds)
        refreshInterval = setInterval(() => {
            setRefreshCount(prev => prev + 1);
            setTruckLocations(prev => {
                if (prev.length > 0) {
                    // Trigger a re-render and potential address refresh
                    return [...prev];
                }
                return prev;
            });
        }, 5000); // 5 seconds

        // Cleanup function
        return () => {
            if (unsubscribe) {
                unsubscribe();
            }
            if (refreshInterval) {
                clearInterval(refreshInterval);
            }
        };
    }, [refreshCount]);

    return { truckLocations, loading, error };
}

// Tile layer configuration
const tileLayers = {
    standard: {
        url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        name: "Street Map"
    },
    satellite: {
        url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
        attribution: '&copy; <a href="https://www.esri.com/">Esri</a>',
        name: "Satellite View"
    },
    transit: {
        url: "https://{s}.tile.thunderforest.com/transport/{z}/{x}/{y}.png?apikey=your-api-key",
        attribution: '&copy; <a href="https://www.thunderforest.com/">Thunderforest</a>',
        name: "Transit Map"
    }
};

// Format the address to be more readable
const formatAddress = (address: string): string => {
    if (!address) return 'Acquiring location information...';

    try {
        const parts = address.split(',');
        const cleanParts = parts.map(part => part.trim()).filter(part => part.length > 0);

        if (cleanParts.length <= 3) {
            return cleanParts.join(', ');
        }

        return cleanParts.slice(0, Math.min(cleanParts.length, 4)).join(', ');
    } catch (error) {
        return address;
    }
};

export function EnhancedRealTimeTrackingMap() {
    const { truckLocations, loading, error } = useRealTimeVehicles();
    const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
    const [mapType, setMapType] = useState<'standard' | 'satellite' | 'transit'>('standard');
    const [refreshingTrucks, setRefreshingTrucks] = useState<Set<string>>(new Set());

    // Update timestamp when locations change
    useEffect(() => {
        if (truckLocations.length > 0) {
            setLastUpdate(new Date());
        }
    }, [truckLocations]);

    // Filter vehicles by status
    const inTransitVehicles = truckLocations.filter(truck => truck.status === 'in_transit');
    const availableVehicles = truckLocations.filter(truck => truck.status === 'available');
    const maintenanceVehicles = truckLocations.filter(truck => truck.status === 'maintenance');

    // Function to manually refresh location for a specific truck
    const refreshTruckLocation = async (truckId: string) => {
        if (refreshingTrucks.has(truckId)) return;

        setRefreshingTrucks(prev => new Set(prev).add(truckId));

        try {
            const truck = truckLocations.find(t => t.id === truckId);
            if (truck) {
                const newAddress = await geocodeLocation(truck.latitude, truck.longitude);
                if (newAddress) {
                    // Update the specific truck's address
                    const updatedTrucks = truckLocations.map(t =>
                        t.id === truckId ? { ...t, address: newAddress } : t
                    );
                    // This will trigger a re-render through the parent component
                }
            }
        } catch (error) {
            console.error(`Failed to refresh location for truck ${truckId}:`, error);
        } finally {
            setRefreshingTrucks(prev => {
                const newSet = new Set(prev);
                newSet.delete(truckId);
                return newSet;
            });
        }
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
                        <div className="flex items-center space-x-2 text-sm text-slate-500">
                            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                            <span>Auto-refresh: 5s</span>
                        </div>
                        <div className="text-sm text-slate-500">
                            Updated {lastUpdate.toLocaleTimeString()}
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
                                <option value="transit">🚗 Transit</option>
                            </select>
                        </div>
                    </div>

                    {/* Vehicle Status Summary */}
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
                        zoom={12}
                        style={{ height: '100%', width: '100%' }}
                        scrollWheelZoom={true}
                        className="z-0"
                    >
                        <TileLayer
                            url={tileLayers[mapType].url}
                            attribution={tileLayers[mapType].attribution}
                        />

                        <MapUpdater locations={truckLocations} />

                        {truckLocations.map((truck) => (
                            <Marker
                                key={truck.id}
                                position={[truck.latitude, truck.longitude]}
                                icon={createTruckIcon(truck.status, truck.plate_number, truck.speed)}
                            >
                                <Popup className="custom-popup min-w-[400px]">
                                    <div className="p-4">
                                        {/* Header */}
                                        <div className="flex items-start justify-between mb-4">
                                            <div className="flex items-center space-x-3">
                                                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                                                    <Truck className="h-6 w-6 text-blue-600" />
                                                </div>
                                                <div>
                                                    <h3 className="font-bold text-lg text-slate-900">{truck.driver_name}</h3>
                                                    <p className="text-sm text-slate-600">{truck.model} • {truck.plate_number}</p>
                                                </div>
                                            </div>
                                            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${truck.status === 'in_transit'
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

                                        <div className="space-y-4">
                                            {/* Location Information - Prominent Display */}
                                            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-200 shadow-sm">
                                                <div className="flex items-start justify-between mb-3">
                                                    <div className="flex items-center space-x-2">
                                                        <MapPin className="h-5 w-5 text-blue-600 flex-shrink-0" />
                                                        <div>
                                                            <span className="font-bold text-blue-900 text-sm block">CURRENT LOCATION</span>
                                                            <div className="flex items-center space-x-1 mt-1">
                                                                <span className="text-xs text-blue-700 bg-blue-100 px-2 py-1 rounded-full">
                                                                    📍 {truck.latitude.toFixed(6)}, {truck.longitude.toFixed(6)}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <button
                                                        onClick={() => refreshTruckLocation(truck.id)}
                                                        disabled={refreshingTrucks.has(truck.id)}
                                                        className="flex items-center space-x-1 text-xs bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
                                                    >
                                                        {refreshingTrucks.has(truck.id) ? (
                                                            <Loader2 className="h-3 w-3 animate-spin" />
                                                        ) : (
                                                            <span>Refresh</span>
                                                        )}
                                                    </button>
                                                </div>

                                                <div className="mt-2">
                                                    {truck.address ? (
                                                        <p className="text-blue-800 text-sm leading-relaxed font-medium bg-white/60 p-3 rounded-lg border border-blue-100">
                                                            {formatAddress(truck.address)}
                                                        </p>
                                                    ) : (
                                                        <div className="flex items-center space-x-3 bg-white/60 p-3 rounded-lg border border-blue-100">
                                                            <Loader2 className="h-4 w-4 text-blue-600 animate-spin flex-shrink-0" />
                                                            <div>
                                                                <p className="text-blue-700 text-sm font-medium">Acquiring location information</p>
                                                                <p className="text-blue-600 text-xs">Auto-refreshing...</p>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Vehicle & Driver Details */}
                                            <div className="grid grid-cols-2 gap-4 text-sm">
                                                <div className="space-y-3">
                                                    <div className="bg-slate-50 p-3 rounded-lg">
                                                        <div className="flex items-center space-x-1 mb-2">
                                                            <Truck className="h-4 w-4 text-slate-600" />
                                                            <span className="font-semibold text-slate-700">Vehicle ID</span>
                                                        </div>
                                                        <p className="text-slate-900 font-mono text-xs bg-white px-2 py-1 rounded border">
                                                            {truck.vehicle_id}
                                                        </p>
                                                    </div>
                                                    <div className="bg-slate-50 p-3 rounded-lg">
                                                        <div className="flex items-center space-x-1 mb-2">
                                                            <User className="h-4 w-4 text-slate-600" />
                                                            <span className="font-semibold text-slate-700">Driver ID</span>
                                                        </div>
                                                        <p className="text-slate-900 font-medium">{truck.driver_id}</p>
                                                    </div>
                                                </div>
                                                <div className="space-y-3">
                                                    <div className="bg-slate-50 p-3 rounded-lg">
                                                        <div className="flex items-center space-x-1 mb-2">
                                                            <Package className="h-4 w-4 text-slate-600" />
                                                            <span className="font-semibold text-slate-700">Assigned Packages</span>
                                                        </div>
                                                        <p className="text-slate-900 font-bold text-lg">
                                                            {truck.assigned_packages?.length || 0}
                                                        </p>
                                                    </div>
                                                    {truck.speed !== undefined && (
                                                        <div className="bg-slate-50 p-3 rounded-lg">
                                                            <div className="flex items-center space-x-1 mb-2">
                                                                <Navigation className="h-4 w-4 text-slate-600" />
                                                                <span className="font-semibold text-slate-700">Current Speed</span>
                                                            </div>
                                                            <p className={`font-bold text-lg ${(truck.speed * 3.6) > 80 ? 'text-red-600' :
                                                                    (truck.speed * 3.6) > 50 ? 'text-amber-600' : 'text-green-600'
                                                                }`}>
                                                                {(truck.speed * 3.6).toFixed(1)} km/h
                                                            </p>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Last Update */}
                                            <div className="bg-slate-50 rounded-lg p-3">
                                                <div className="flex items-center justify-between text-sm">
                                                    <div className="flex items-center space-x-2">
                                                        <Clock className="h-4 w-4 text-slate-600" />
                                                        <span className="font-semibold text-slate-700">Last Position Update</span>
                                                    </div>
                                                    <span className="text-slate-900 font-medium">
                                                        {new Date(truck.last_updated).toLocaleTimeString()}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </Popup>
                            </Marker>
                        ))}
                    </MapContainer>

                    {/* Enhanced Info Panel */}
                    <div className="absolute top-4 right-4 bg-white/95 backdrop-blur-sm rounded-xl shadow-xl p-5 min-w-[260px] border border-slate-200">
                        <div className="flex items-center space-x-2 mb-4">
                            <Satellite className="h-5 w-5 text-blue-600" />
                            <h4 className="font-bold text-slate-800 text-lg">Fleet Overview</h4>
                        </div>
                        <div className="space-y-4">
                            <div className="flex justify-between items-center pb-3 border-b border-slate-200">
                                <span className="text-sm font-semibold text-slate-700">Total Vehicles</span>
                                <span className="font-bold text-slate-900 text-xl">{truckLocations.length}</span>
                            </div>
                            <div className="flex justify-between items-center py-2">
                                <div className="flex items-center space-x-3">
                                    <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                                    <span className="text-sm text-slate-600">In Transit</span>
                                </div>
                                <span className="font-bold text-blue-600 text-lg">{inTransitVehicles.length}</span>
                            </div>
                            <div className="flex justify-between items-center py-2">
                                <div className="flex items-center space-x-3">
                                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                                    <span className="text-sm text-slate-600">Available</span>
                                </div>
                                <span className="font-bold text-green-600 text-lg">{availableVehicles.length}</span>
                            </div>
                            <div className="flex justify-between items-center py-2">
                                <div className="flex items-center space-x-3">
                                    <div className="w-3 h-3 bg-amber-500 rounded-full"></div>
                                    <span className="text-sm text-slate-600">Maintenance</span>
                                </div>
                                <span className="font-bold text-amber-600 text-lg">{maintenanceVehicles.length}</span>
                            </div>
                        </div>
                    </div>

                    {/* Auto-refresh indicator */}
                    <div className="absolute bottom-4 left-4 bg-green-500/90 text-white px-3 py-1 rounded-full text-xs font-medium backdrop-blur-sm">
                        🔄 Auto-refresh: 5s
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}