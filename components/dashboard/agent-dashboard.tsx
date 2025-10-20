'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/hooks/use-auth';
import { apiService } from '@/lib/api';
import { componentColors } from '@/lib/colors';
import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';
import {
    Package,
    Truck,
    CheckCircle,
    MapPin,
    RefreshCw,
    Building,
    AlertCircle,
    TrendingUp
} from 'lucide-react';

// Dynamically import the enhanced map component
const EnhancedRealTimeTrackingMap = dynamic(
    () => import('@/components/maps/real-time-tracking-map').then((mod) => ({
        default: mod.EnhancedRealTimeTrackingMap
    })),
    {
        ssr: false,
        loading: () => (
            <div className="h-96 bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl flex items-center justify-center border">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-10 w-10 border-2 border-blue-500 border-t-transparent mx-auto mb-3"></div>
                    <p className="text-sm text-gray-600 font-medium">Loading tracking map...</p>
                </div>
            </div>
        )
    }
);

interface AgentDashboardStats {
    packageStats: {
        total_packages: number;
        delivered: number;
        in_transit: number;
        registered: number;
        out_for_delivery: number;
        outgoing_packages: number;
        incoming_packages: number;
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
        package_type: string;
    }>;
}

// Status configuration for consistent styling using design system
const STATUS_CONFIG = {
    delivered: { color: componentColors.badge.active, icon: CheckCircle, iconColor: 'text-green-600' },
    in_transit: { color: componentColors.badge.agent, icon: Truck, iconColor: 'text-blue-600' },
    out_for_delivery: { color: componentColors.badge.outForDelivery, icon: Package, iconColor: 'text-orange-600' },
    registered: { color: componentColors.badge.inactive, icon: Building, iconColor: 'text-gray-600' }
};

export default function AgentDashboard() {
    const { user, loading: authLoading } = useAuth();
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [packages, setPackages] = useState<any[]>([]);
    const [branchName, setBranchName] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!authLoading && user) {
            fetchAgentPackages();
        }
    }, [authLoading, user]);

    const fetchAgentPackages = async () => {
        if (!user) return;

        setRefreshing(true);
        setError(null);

        try {
            // Prefer branch-scoped stats for agents. If branch_id exists on user, fetch by branch.
            if (user.branch_id) {
                // Ask the server for branch-scoped packages. The server enforces agent scoping
                // using the authenticated user's branch, but we include branchId for clarity
                // and for potential admin queries.
                const res = await apiService.getPackages({ branchId: String(user.branch_id), limit: 200 });
                setPackages(res.packages || []);

                // Fetch branch metadata (name)
                try {
                    const branchRes = await apiService.getBranch(String(user.branch_id));
                    setBranchName(branchRes.branch?.branch_name || null);
                } catch (err) {
                    console.error('Failed to fetch branch details', err);
                    setBranchName(null);
                }
            } else {
                // Fallback: fetch only packages assigned to this agent
                const res = await apiService.getPackages({ agent_id: String(user.id), limit: 50 });
                setPackages(res.packages || []);
                setBranchName(null);
            }
        } catch (err) {
            console.error('Failed to fetch agent packages', err);
            setError('Failed to load packages. Please try again.');
            setPackages([]);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    // Compute branch-scoped package and payment stats from the filtered packages
    const computedStats = packages.reduce(
        (acc, pkg) => {
            acc.packageStats.total_packages += 1;
            const status = pkg.status || 'registered';
            if (status in acc.packageStats) {
                // @ts-ignore
                acc.packageStats[status] = (acc.packageStats[status] || 0) + 1;
            }

            if (pkg.package_type === 'outgoing') acc.packageStats.outgoing_packages += 1;
            if (pkg.package_type === 'incoming') acc.packageStats.incoming_packages += 1;

            // Payment stats (best-effort using package fields)
            if (pkg.payment_status) {
                acc.paymentStats.total_payments += 1;
                if (pkg.payment_status === 'confirmed') acc.paymentStats.confirmed_payments += 1;
                if (pkg.payment_status === 'pending') acc.paymentStats.pending_payments += 1;
            }
            if (pkg.delivery_fee) {
                acc.paymentStats.total_amount += Number(pkg.delivery_fee) || 0;
            }

            return acc;
        },
        {
            packageStats: {
                total_packages: 0,
                delivered: 0,
                in_transit: 0,
                registered: 0,
                out_for_delivery: 0,
                outgoing_packages: 0,
                incoming_packages: 0,
            },
            paymentStats: {
                total_payments: 0,
                total_amount: 0,
                confirmed_payments: 0,
                pending_payments: 0,
            }
        } as AgentDashboardStats
    );

    // Loading state
    if (authLoading || loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50/30 p-6">
                <div className="max-w-7xl mx-auto">
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <div className="h-8 bg-gray-200 rounded w-64 mb-2 animate-pulse"></div>
                            <div className="h-4 bg-gray-200 rounded w-48 animate-pulse"></div>
                        </div>
                        <div className="h-9 bg-gray-200 rounded w-24 animate-pulse"></div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-8">
                        {[1, 2, 3, 4].map((i) => (
                            <div key={i} className="bg-white rounded-xl p-6 border shadow-sm">
                                <div className="h-5 bg-gray-200 rounded w-32 mb-4 animate-pulse"></div>
                                <div className="h-8 bg-gray-200 rounded w-20 mb-2 animate-pulse"></div>
                                <div className="h-4 bg-gray-200 rounded w-40 animate-pulse"></div>
                            </div>
                        ))}
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div className="lg:col-span-2">
                            <div className="bg-white rounded-xl p-6 border shadow-sm">
                                <div className="h-6 bg-gray-200 rounded w-48 mb-4 animate-pulse"></div>
                                <div className="h-96 bg-gray-100 rounded-lg animate-pulse"></div>
                            </div>
                        </div>
                        <div className="bg-white rounded-xl p-6 border shadow-sm">
                            <div className="h-6 bg-gray-200 rounded w-48 mb-4 animate-pulse"></div>
                            <div className="space-y-3">
                                {[1, 2, 3, 4, 5].map((i) => (
                                    <div key={i} className="h-16 bg-gray-100 rounded-lg animate-pulse"></div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (!user) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50/30 flex items-center justify-center p-6">
                <div className="max-w-md w-full bg-white rounded-2xl p-8 border shadow-sm text-center">
                    <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                    <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
                    <p className="text-gray-600 mb-6">You must be logged in as an agent to view this page.</p>
                    <Button onClick={() => window.location.reload()} className="w-full">
                        Try Again
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50/30 p-4 sm:p-6">
            <div className="max-w-7xl mx-auto">
                {/* Header Section */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8 gap-4">
                    <div className="space-y-2">
                        <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">Agent Dashboard</h1>
                        <div className="flex items-center gap-2 text-sm">
                            <Building className="h-4 w-4 text-gray-500" />
                            {branchName ? (
                                <span className="text-gray-600">
                                    Branch: <strong className="text-gray-800 font-semibold">{branchName}</strong>
                                </span>
                            ) : (
                                <span className="text-gray-500">Branch data: not available</span>
                            )}
                            {/* <span className="text-gray-300">•</span>
                            <span className="text-green-600 font-medium">
                                {packages.length} packages loaded
                            </span> */}
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <Button
                            onClick={fetchAgentPackages}
                            size="sm"
                            variant="outline"
                            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                            disabled={refreshing}
                        >
                            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                            {refreshing ? 'Refreshing...' : 'Refresh'}
                        </Button>
                    </div>
                </div>

                {/* Error Alert */}
                {error && (
                    <div className="mb-6 bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
                        <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
                        <p className="text-red-800 text-sm font-medium">{error}</p>
                    </div>
                )}

                {/* Stats Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-8">
                    <Card className="bg-white border shadow-sm hover:shadow-md transition-shadow duration-200">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                                <Package className="h-4 w-4 text-blue-600" />
                                Total Packages
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold text-gray-900 mb-1">
                                {computedStats.packageStats.total_packages}
                            </div>
                            <div className="text-xs text-gray-500">Packages in this branch</div>
                        </CardContent>
                    </Card>

                    <Card className="bg-white border shadow-sm hover:shadow-md transition-shadow duration-200">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                                <Truck className="h-4 w-4 text-orange-600" />
                                In Transit
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-semibold text-gray-900 mb-1">
                                {computedStats.packageStats.in_transit}
                            </div>
                            <div className="text-xs text-gray-500">Packages currently on route</div>
                        </CardContent>
                    </Card>

                    <Card className="bg-white border shadow-sm hover:shadow-md transition-shadow duration-200">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                                <CheckCircle className="h-4 w-4 text-green-600" />
                                Delivered
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-semibold text-gray-900 mb-1">
                                {computedStats.packageStats.delivered}
                            </div>
                            <div className="text-xs text-gray-500">Packages delivered in this branch</div>
                        </CardContent>
                    </Card>

                    <Card className="bg-white border shadow-sm hover:shadow-md transition-shadow duration-200">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                                <MapPin className="h-4 w-4 text-blue-600" />
                                Out for Delivery
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-semibold text-gray-900 mb-1">
                                {computedStats.packageStats.out_for_delivery}
                            </div>
                            <div className="text-xs text-gray-500">Ready for delivery</div>
                        </CardContent>
                    </Card>
                </div>

                {/* Main Content Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
                    {/* Map Section */}
                    <div className="lg:col-span-2">
                        <Card className="bg-white border shadow-sm h-full">
                            <CardHeader className="pb-4">
                                <CardTitle className="flex items-center gap-2 text-lg">
                                    <MapPin className="h-5 w-5 text-blue-600" />
                                    Live Tracking Map
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-0">
                                <EnhancedRealTimeTrackingMap />
                            </CardContent>
                        </Card>
                    </div>

                    {/* Recent Packages */}
                    <div>
                        <Card className="bg-white border shadow-sm h-full">
                            <CardHeader className="pb-4">
                                <CardTitle className="flex items-center gap-2 text-lg">
                                    <TrendingUp className="h-5 w-5 text-green-600" />
                                    Recent Packages
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-3">
                                    {packages.slice(0, 8).map((pkg) => {
                                        const statusConfig = STATUS_CONFIG[pkg.status as keyof typeof STATUS_CONFIG] ||
                                            STATUS_CONFIG.registered;
                                        const StatusIcon = statusConfig.icon;

                                        return (
                                            <div
                                                key={pkg.package_id}
                                                className="p-3 border rounded-lg hover:border-gray-400 transition-colors duration-150 bg-white group"
                                            >
                                                <div className="flex justify-between items-start mb-2">
                                                    <div className="font-medium text-sm text-gray-900 font-mono group-hover:text-blue-600 transition-colors">
                                                        {pkg.package_id}
                                                    </div>
                                                    <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${statusConfig.color}`}>
                                                        <StatusIcon className={`h-3 w-3 ${statusConfig.iconColor}`} />
                                                        <span className="capitalize">{pkg.status.replace('_', ' ')}</span>
                                                    </div>
                                                </div>
                                                <div className="text-xs text-gray-600 space-y-1">
                                                    <div className="flex justify-between">
                                                        <span>To: {pkg.receiver_name}</span>
                                                    </div>
                                                    {pkg.current_location && (
                                                        <div className="text-gray-500 truncate">
                                                            📍 {pkg.current_location}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                    {packages.length === 0 && (
                                        <div className="text-center py-8 text-gray-500">
                                            <Package className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                                            <p className="text-sm font-medium">No packages assigned yet</p>
                                            <p className="text-xs text-gray-400 mt-1">Packages will appear here once assigned</p>
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </div>
    );
}