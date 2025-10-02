'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { AlertCircle, CheckCircle, Clock, DollarSign, Package, Truck, Users, MapPin } from 'lucide-react';
import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';

// Dynamically import the enhanced map component
const EnhancedRealTimeTrackingMap = dynamic(
    () => import('@/components/maps/real-time-tracking-map').then(mod => mod.EnhancedRealTimeTrackingMap),
    {
        ssr: false,
        loading: () => (
            <div className="h-96 bg-slate-100 rounded-lg flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                    <p className="text-sm text-slate-600">Loading advanced tracking...</p>
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
    };
    timestamp: string;
}

export function EnhancedDashboardNew() {
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

    const fetchDashboardStats = async () => {
        try {
            const response = await fetch('/api/dashboard/stats');
            if (!response.ok) {
                throw new Error('Failed to fetch dashboard stats');
            }
            const data = await response.json();
            setStats(data);
            setLastUpdated(new Date());
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred');
        } finally {
            setLoading(false);
        }
    };

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
                        <Truck className="h-8 w-8 text-blue-600 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
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
                        <AlertCircle className="h-10 w-10 text-red-500" />
                    </div>
                    <div className="space-y-3">
                        <h2 className="text-2xl font-bold text-red-600">Unable to Load Dashboard</h2>
                        <p className="text-slate-600">{error}</p>
                    </div>
                    <button
                        onClick={() => {
                            setLoading(true);
                            setError(null);
                            fetchDashboardStats();
                        }}
                        className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200 font-medium"
                    >
                        Try Again
                    </button>
                </div>
            </div>
        );
    }

    if (!stats) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50/30 flex items-center justify-center">
                <div className="text-center space-y-6">
                    <Package className="h-16 w-16 text-slate-400 mx-auto" />
                    <div className="space-y-3">
                        <h2 className="text-2xl font-bold text-slate-800">No Data Available</h2>
                        <p className="text-slate-600">Dashboard statistics are not available at the moment.</p>
                    </div>
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
                return 'bg-purple-100 text-purple-800 border border-purple-200';
            case 'registered':
                return 'bg-amber-100 text-amber-800 border border-amber-200';
            default:
                return 'bg-slate-100 text-slate-800 border border-slate-200';
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
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50/30 p-6">
            {/* Header Section */}
            <div className="mb-8">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-800">Delivery Dashboard</h1>
                        <p className="text-slate-600 mt-2">Real-time overview of your delivery operations and fleet</p>
                    </div>
                    <div className="flex items-center space-x-4">
                        <div className="flex items-center space-x-2">
                            <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                            <span className="text-sm font-medium text-green-600">Live</span>
                        </div>
                        <div className="text-sm text-slate-500">
                            Updated {lastUpdated.toLocaleTimeString()}
                        </div>
                    </div>
                </div>
            </div>

            {/* Key Metrics Grid */}
            <div className="grid gap-6 mb-8 md:grid-cols-2 lg:grid-cols-4">
                {/* Total Packages */}
                <Card className="bg-white/80 backdrop-blur-sm border-slate-200 shadow-sm hover:shadow-md transition-all duration-300">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                        <CardTitle className="text-sm font-semibold text-slate-600">Total Packages</CardTitle>
                        <div className="p-2 bg-blue-100 rounded-lg">
                            <Package className="h-5 w-5 text-blue-600" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-slate-800">{stats.packageStats.total_packages}</div>
                        <div className="flex items-center space-x-2 mt-2">
                            <div className="w-full bg-slate-200 rounded-full h-2">
                                <div
                                    className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                                    style={{ width: `${(stats.packageStats.in_transit / stats.packageStats.total_packages) * 100}%` }}
                                ></div>
                            </div>
                            <span className="text-xs font-medium text-slate-500 whitespace-nowrap">
                                {stats.packageStats.in_transit} in transit
                            </span>
                        </div>
                    </CardContent>
                </Card>

                {/* Fleet Status */}
                <Card className="bg-white/80 backdrop-blur-sm border-slate-200 shadow-sm hover:shadow-md transition-all duration-300">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                        <CardTitle className="text-sm font-semibold text-slate-600">Active Fleet</CardTitle>
                        <div className="p-2 bg-green-100 rounded-lg">
                            <Truck className="h-5 w-5 text-green-600" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-slate-800">{stats.fleetStats.active_vehicles}</div>
                        <div className="flex items-center space-x-2 mt-2">
                            <div className="w-full bg-slate-200 rounded-full h-2">
                                <div
                                    className="bg-green-600 h-2 rounded-full transition-all duration-500"
                                    style={{ width: `${fleetUtilization}%` }}
                                ></div>
                            </div>
                            <span className="text-xs font-medium text-slate-500 whitespace-nowrap">
                                of {stats.fleetStats.total_vehicles}
                            </span>
                        </div>
                    </CardContent>
                </Card>

                {/* Delivered Packages */}
                <Card className="bg-white/80 backdrop-blur-sm border-slate-200 shadow-sm hover:shadow-md transition-all duration-300">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                        <CardTitle className="text-sm font-semibold text-slate-600">Delivered</CardTitle>
                        <div className="p-2 bg-green-100 rounded-lg">
                            <CheckCircle className="h-5 w-5 text-green-600" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-slate-800">{stats.packageStats.delivered}</div>
                        <div className="flex items-center space-x-2 mt-2">
                            <Progress value={deliveryProgress} className="h-2 bg-slate-200 [&>div]:bg-green-500" />
                            <span className="text-xs text-slate-500 font-medium whitespace-nowrap">
                                {Math.round(deliveryProgress)}%
                            </span>
                        </div>
                    </CardContent>
                </Card>

                {/* Revenue */}
                <Card className="bg-white/80 backdrop-blur-sm border-slate-200 shadow-sm hover:shadow-md transition-all duration-300">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                        <CardTitle className="text-sm font-semibold text-slate-600">Total Revenue</CardTitle>
                        <div className="p-2 bg-emerald-100 rounded-lg">
                            <DollarSign className="h-5 w-5 text-emerald-600" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-slate-800">
                            {formatCurrency(Number(stats.paymentStats.total_amount) || 0)}
                        </div>
                        <p className="text-xs text-slate-500 mt-2">
                            {stats.paymentStats.confirmed_payments} confirmed payments
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Main Content Grid */}
            <div className="space-y-6">
                {/* Enhanced Real-time Fleet Tracking */}
                <EnhancedRealTimeTrackingMap />

                {/* Payment Overview and Recent Packages - Side by side */}
                <div className="grid gap-6 lg:grid-cols-2">
                    {/* Payment Statistics */}
                    <Card className="bg-white/80 backdrop-blur-sm border-slate-200 shadow-sm">
                        <CardHeader className="pb-4">
                            <CardTitle className="flex items-center space-x-2 text-slate-800">
                                <DollarSign className="h-5 w-5 text-green-600" />
                                <span>Payment Overview</span>
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-5">
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <span className="text-sm font-medium text-slate-600">Total Payments</span>
                                    <span className="font-bold text-slate-800">{stats.paymentStats.total_payments}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-sm font-medium text-slate-600">Total Amount</span>
                                    <span className="font-bold text-slate-800">
                                        {formatCurrency(Number(stats.paymentStats.total_amount) || 0)}
                                    </span>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-slate-600">Payment Success Rate</span>
                                    <span className="font-medium text-green-600">
                                        {stats.paymentStats.confirmed_payments}/{stats.paymentStats.total_payments}
                                    </span>
                                </div>
                                <Progress
                                    value={paymentProgress}
                                    className="h-3 bg-slate-200 [&>div]:bg-green-500"
                                />
                                <div className="flex justify-between text-xs text-slate-500">
                                    <span>Pending: {stats.paymentStats.pending_payments}</span>
                                    <span>Confirmed: {stats.paymentStats.confirmed_payments}</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Recent Packages */}
                    <Card className="bg-white/80 backdrop-blur-sm border-slate-200 shadow-sm">
                        <CardHeader className="pb-4">
                            <CardTitle className="flex items-center space-x-2 text-slate-800">
                                <Package className="h-5 w-5 text-blue-600" />
                                <span>Recent Packages</span>
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4 max-h-80 overflow-y-auto">
                                {stats.recentPackages.map((pkg, index) => (
                                    <div
                                        key={pkg.package_id}
                                        className="flex items-center space-x-3 p-3 rounded-lg border border-slate-100 bg-white/50 hover:bg-white transition-colors duration-200 group"
                                    >
                                        <div className="flex-shrink-0 w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center group-hover:bg-blue-100 transition-colors">
                                            <span className="text-xs font-medium text-slate-600">{index + 1}</span>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-semibold text-slate-800 truncate">
                                                {pkg.package_id}
                                            </p>
                                            <p className="text-xs text-slate-500 truncate">
                                                {pkg.sender_name} → {pkg.receiver_name}
                                            </p>
                                            <p className="text-xs text-slate-400 mt-1">
                                                {new Date(pkg.created_at).toLocaleDateString()}
                                            </p>
                                        </div>
                                        <div className="flex flex-col items-end space-y-1">
                                            <span
                                                className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${getStatusColor(pkg.status)}`}
                                            >
                                                {pkg.status.replace('_', ' ')}
                                            </span>
                                            <div className="flex items-center space-x-1">
                                                {pkg.payment_status === 'confirmed' ? (
                                                    <>
                                                        <CheckCircle className="h-3 w-3 text-green-500" />
                                                        <span className="text-xs text-green-600">Paid</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <Clock className="h-3 w-3 text-amber-500" />
                                                        <span className="text-xs text-amber-600">Pending</span>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}