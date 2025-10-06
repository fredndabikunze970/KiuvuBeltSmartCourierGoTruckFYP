'use client';

import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Box, Clock, DollarSign, PackageCheck, Truck, TrendingUp, Users, MapPin } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

interface PackageStatusData {
  status: string;
  count: number;
  percentage: number;
}

interface PackagesOverTimeData {
  date: string;
  totalPackages: number;
  deliveredPackages: number;
  inTransitPackages: number;
  pendingPackages: number;
  averageDeliveryHours: number;
}

interface PackagesByBranchData {
  id: string;
  branchName: string;
  totalPackages: number;
  deliveredPackages: number;
  inTransitPackages: number;
  pendingPackages: number;
  deliveryRate: number;
  averageDeliveryHours: number;
}

interface AverageDeliveryTimeData {
  averageDeliveryHours: number;
  totalDeliveries: number;
}

interface RevenueOverTimeData {
  date: string;
  totalPackages: number;
  deliveredPackages: number;
  totalRevenue: number;
  averagePackagePrice: number;
  revenuePerDelivery: number;
}

interface DriverPerformanceData {
  id: string;
  driverName: string;
  totalAssignments: number;
  deliveriesCompleted: number;
  deliveriesInProgress: number;
  completionRate: number;
  averageDeliveryHours: number;
}

// Professional color palette
const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4'];
const STATUS_COLORS = {
  delivered: '#10B981',
  'in-transit': '#F59E0B',
  pending: '#EF4444',
  cancelled: '#6B7280'
};

const LoadingCard = ({ children }: { children: React.ReactNode }) => (
  <Card className="bg-white shadow-sm border border-gray-200">
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
      <CardTitle className="text-sm font-semibold text-gray-600">
        <Skeleton className="h-4 w-[150px]" />
      </CardTitle>
    </CardHeader>
    <CardContent>
      <div className="relative">
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="h-32 w-32 animate-pulse rounded-full bg-gray-100" />
        </div>
        {children}
      </div>
    </CardContent>
  </Card>
);

const ErrorAlert = ({ message }: { message: string }) => (
  <Alert variant="destructive" className="mb-6 border-red-200 bg-red-50">
    <AlertDescription className="text-red-800">{message}</AlertDescription>
  </Alert>
);

const StatsCard = ({
  title,
  value,
  icon: Icon,
  trend,
  description
}: {
  title: string;
  value: string | number;
  icon: any;
  trend?: number;
  description?: string;
}) => (
  <Card className="bg-white shadow-sm hover:shadow-md transition-shadow duration-200 border border-gray-200">
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
      <CardTitle className="text-sm font-semibold text-gray-600">{title}</CardTitle>
      <div className="p-2 rounded-lg bg-blue-50">
        <Icon className="h-4 w-4 text-blue-600" />
      </div>
    </CardHeader>
    <CardContent>
      <div className="text-2xl font-bold text-gray-900">{value}</div>
      {trend !== undefined && (
        <div className={`flex items-center text-xs mt-1 ${trend >= 0 ? 'text-green-600' : 'text-red-600'
          }`}>
          <TrendingUp className={`h-3 w-3 mr-1 ${trend < 0 ? 'transform rotate-180' : ''}`} />
          {Math.abs(trend)}% from last period
        </div>
      )}
      {description && (
        <p className="text-xs text-gray-500 mt-1">{description}</p>
      )}
    </CardContent>
  </Card>
);

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-3 shadow-lg border border-gray-200 rounded-lg">
        <p className="font-semibold text-gray-900">{`${label}`}</p>
        {payload.map((entry: any, index: number) => (
          <p key={index} className="text-sm" style={{ color: entry.color }}>
            {`${entry.name}: ${entry.value?.toLocaleString()}`}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

const RevenueTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-3 shadow-lg border border-gray-200 rounded-lg">
        <p className="font-semibold text-gray-900">{`${label}`}</p>
        {payload.map((entry: any, index: number) => (
          <p key={index} className="text-sm" style={{ color: entry.color }}>
            {`${entry.name}: ${formatCurrency(entry.value)}`}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

const formatCurrency = (amount: number) => {
  if (typeof amount !== 'number' || isNaN(amount)) {
    return 'RWF 0';
  }
  return `RWF ${Math.round(amount).toLocaleString('en-US')}`;
};

const formatTime = (hours: number | undefined) => {
  if (hours === undefined || hours === null) return 'N/A';
  const wholeHours = Math.floor(hours);
  const minutes = Math.round((hours - wholeHours) * 60);
  return `${wholeHours}h ${minutes}m`;
};

const AnalyticsContent = () => {
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [packageStatus, setPackageStatus] = useState<PackageStatusData[]>([]);
  const [packagesOverTime, setPackagesOverTime] = useState<PackagesOverTimeData[]>([]);
  const [packagesByBranch, setPackagesByBranch] = useState<PackagesByBranchData[]>([]);
  const [averageDeliveryTime, setAverageDeliveryTime] = useState<AverageDeliveryTimeData | null>(null);
  const [revenueOverTime, setRevenueOverTime] = useState<RevenueOverTimeData[]>([]);
  const [driverPerformance, setDriverPerformance] = useState<DriverPerformanceData[]>([]);
  const [timeframe, setTimeframe] = useState<string>('month');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isInitialLoad) {
      setIsInitialLoad(false);
      return;
    }

    loadAnalyticsData();
  }, [timeframe, isInitialLoad]);

  const loadAnalyticsData = async () => {
    setIsLoading(true);
    setError(null);

    try {
      await Promise.all([
        fetchPackageStatus(),
        fetchPackagesOverTime(timeframe),
        fetchPackagesByBranch(),
        fetchAverageDeliveryTime(),
        fetchRevenueOverTime(timeframe),
        fetchDriverPerformance()
      ]);
    } catch (err) {
      setError('Failed to load analytics data. Please try again later.');
      console.error('Error loading analytics:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchPackageStatus = async () => {
    try {
      const res = await fetch('/api/analytics/package-status');
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      const { success, data } = await res.json();

      if (success && Array.isArray(data)) {
        const total = data.reduce((sum, row) => sum + row.count, 0);
        const withPercent = data.map(row => ({
          ...row,
          percentage: total > 0 ? (row.count / total) * 100 : 0
        }));
        setPackageStatus(withPercent);
      } else {
        setPackageStatus([]);
      }
    } catch (error) {
      console.error('Error fetching package status analytics:', error);
      setPackageStatus([]);
    }
  };

  const fetchPackagesOverTime = async (interval: string) => {
    try {
      const res = await fetch(`/api/analytics/packages-over-time?interval=${interval}`);
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      const { success, data } = await res.json();

      if (success && Array.isArray(data)) {
        setPackagesOverTime(data);
      } else {
        setPackagesOverTime([]);
      }
    } catch (error) {
      console.error('Error fetching packages over time analytics:', error);
      setPackagesOverTime([]);
    }
  };

  const fetchPackagesByBranch = async () => {
    try {
      const res = await fetch('/api/analytics/packages-by-branch');
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      const { success, data } = await res.json();

      if (success && Array.isArray(data)) {
        setPackagesByBranch(data);
      } else {
        setPackagesByBranch([]);
      }
    } catch (error) {
      console.error('Error fetching packages by branch analytics:', error);
      setPackagesByBranch([]);
    }
  };

  const fetchAverageDeliveryTime = async () => {
    try {
      const res = await fetch('/api/analytics/average-delivery-time');
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      const { success, data } = await res.json();

      if (success && data) {
        setAverageDeliveryTime(data);
      } else {
        setAverageDeliveryTime(null);
      }
    } catch (error) {
      console.error('Error fetching average delivery time analytics:', error);
      setAverageDeliveryTime(null);
    }
  };

  const fetchRevenueOverTime = async (interval: string) => {
    try {
      const res = await fetch(`/api/analytics/revenue-over-time?interval=${interval}`);
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      const { success, data } = await res.json();

      if (success && Array.isArray(data)) {
        const processedData = data.map(item => ({
          ...item,
          totalRevenue: typeof item.totalRevenue === 'string' ? parseFloat(item.totalRevenue) : item.totalRevenue,
          averagePackagePrice: typeof item.averagePackagePrice === 'string' ? parseFloat(item.averagePackagePrice) : item.averagePackagePrice,
          revenuePerDelivery: typeof item.revenuePerDelivery === 'string' ? parseFloat(item.revenuePerDelivery) : item.revenuePerDelivery
        }));
        setRevenueOverTime(processedData);
      } else {
        setRevenueOverTime([]);
      }
    } catch (error) {
      console.error('Error fetching revenue over time analytics:', error);
      setRevenueOverTime([]);
    }
  };

  const fetchDriverPerformance = async () => {
    try {
      const res = await fetch('/api/analytics/driver-performance');
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      const { success, data } = await res.json();

      if (success && Array.isArray(data)) {
        setDriverPerformance(data);
      } else {
        setDriverPerformance([]);
      }
    } catch (error) {
      console.error('Error fetching driver performance analytics:', error);
      setDriverPerformance([]);
    }
  };

  // Calculate summary statistics
  const totalPackages = packageStatus.reduce((sum, item) => sum + item.count, 0);
  const totalRevenue = revenueOverTime.reduce((sum, item) => {
    const revenue = typeof item.totalRevenue === 'string' ? parseFloat(item.totalRevenue) : item.totalRevenue;
    return sum + (isNaN(revenue) ? 0 : revenue);
  }, 0);
  const totalDrivers = driverPerformance.length;
  const totalDeliveries = driverPerformance.reduce((sum, item) => sum + item.deliveriesCompleted, 0);
  const deliveryRate = totalPackages > 0 ? (totalDeliveries / totalPackages) * 100 : 0;

  // Don't render anything on the first load to prevent hydration mismatch
  if (isInitialLoad) {
    return null;
  }

  if (error) {
    return (
      <div className="space-y-6">
        <ErrorAlert message={error} />
        <div className="text-center">
          <button
            onClick={loadAnalyticsData}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Analytics Dashboard</h1>
          <p className="text-gray-600 mt-2">
            Comprehensive overview of your delivery operations and performance metrics
          </p>
        </div>
        <Select onValueChange={setTimeframe} defaultValue={timeframe}>
          <SelectTrigger className="w-[180px] bg-white">
            <SelectValue placeholder="Select timeframe" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="day">Daily</SelectItem>
            <SelectItem value="week">Weekly</SelectItem>
            <SelectItem value="month">Monthly</SelectItem>
            <SelectItem value="year">Yearly</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Overview Statistics */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Total Packages"
          value={totalPackages.toLocaleString()}
          icon={Box}
          trend={12.5}
          description="All packages in the system"
        />
        <StatsCard
          title="Total Revenue"
          value={formatCurrency(totalRevenue)}
          icon={DollarSign}
          trend={8.2}
          description="Total revenue generated"
        />
        <StatsCard
          title="Active Drivers"
          value={totalDrivers}
          icon={Users}
          trend={-2.1}
          description="Currently active drivers"
        />
        <StatsCard
          title="Delivery Rate"
          value={`${deliveryRate.toFixed(1)}%`}
          icon={TrendingUp}
          trend={5.7}
          description="Successful delivery percentage"
        />
      </div>

      {/* Charts Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Package Status Distribution */}
        <Card className="bg-white shadow-sm border border-gray-200">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <PackageCheck className="h-5 w-5 text-blue-600" />
              Package Status Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="h-[300px] flex items-center justify-center">
                <Skeleton className="h-64 w-64 rounded-full" />
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={packageStatus}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="count"
                    nameKey="status"
                    label={({ status, percentage }) => `${status}: ${percentage.toFixed(1)}%`}
                  >
                    {packageStatus.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={STATUS_COLORS[entry.status as keyof typeof STATUS_COLORS] || COLORS[index % COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => [value.toLocaleString(), 'Count']} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Delivery Performance Over Time */}
        <Card className="bg-white shadow-sm border border-gray-200">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-600" />
              Delivery Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="h-[300px] flex items-center justify-center">
                <Skeleton className="h-64 w-full" />
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={packagesOverTime}>
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 12 }}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 12 }}
                    tickLine={false}
                  />
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="deliveredPackages"
                    stroke="#10B981"
                    strokeWidth={2}
                    name="Delivered"
                    dot={{ fill: '#10B981', strokeWidth: 2 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="inTransitPackages"
                    stroke="#F59E0B"
                    strokeWidth={2}
                    name="In Transit"
                    dot={{ fill: '#F59E0B', strokeWidth: 2 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="pendingPackages"
                    stroke="#EF4444"
                    strokeWidth={2}
                    name="Pending"
                    dot={{ fill: '#EF4444', strokeWidth: 2 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Branch Performance */}
        <Card className="bg-white shadow-sm border border-gray-200">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <MapPin className="h-5 w-5 text-purple-600" />
              Branch Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="h-[300px] flex items-center justify-center">
                <Skeleton className="h-64 w-full" />
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={packagesByBranch}>
                  <XAxis
                    dataKey="branchName"
                    tick={{ fontSize: 12 }}
                    angle={-45}
                    textAnchor="end"
                    height={80}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 12 }}
                    tickLine={false}
                  />
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <Bar
                    dataKey="deliveredPackages"
                    name="Delivered"
                    fill="#10B981"
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar
                    dataKey="inTransitPackages"
                    name="In Transit"
                    fill="#F59E0B"
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar
                    dataKey="pendingPackages"
                    name="Pending"
                    fill="#EF4444"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Revenue Analytics */}
        <Card className="bg-white shadow-sm border border-gray-200">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-green-600" />
              Revenue Analytics
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="h-[300px] flex items-center justify-center">
                <Skeleton className="h-64 w-full" />
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={revenueOverTime}>
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 12 }}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 12 }}
                    tickLine={false}
                    tickFormatter={(value) => `RWF ${value / 1000}k`}
                  />
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <Tooltip content={<RevenueTooltip />} />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="totalRevenue"
                    stroke="#3B82F6"
                    strokeWidth={2}
                    name="Total Revenue"
                    dot={{ fill: '#3B82F6', strokeWidth: 2 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="revenuePerDelivery"
                    stroke="#10B981"
                    strokeWidth={2}
                    name="Revenue per Delivery"
                    dot={{ fill: '#10B981', strokeWidth: 2 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Driver Performance */}
        <Card className="bg-white shadow-sm border border-gray-200 lg:col-span-2">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Truck className="h-5 w-5 text-blue-600" />
              Driver Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="h-[300px] flex items-center justify-center">
                <Skeleton className="h-64 w-full" />
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={driverPerformance} layout="vertical" margin={{ left: 100 }}>
                  <XAxis type="number" tickLine={false} />
                  <YAxis
                    type="category"
                    dataKey="driverName"
                    tickLine={false}
                    tick={{ fontSize: 12 }}
                    width={80}
                  />
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <Bar
                    dataKey="deliveriesCompleted"
                    name="Completed"
                    fill="#10B981"
                    radius={[0, 4, 4, 0]}
                  />
                  <Bar
                    dataKey="deliveriesInProgress"
                    name="In Progress"
                    fill="#F59E0B"
                    radius={[0, 4, 4, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Key Metrics Summary */}
      <div className="grid gap-6 md:grid-cols-3">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-blue-900 flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Average Delivery Time
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-900">
              {averageDeliveryTime ? formatTime(averageDeliveryTime.averageDeliveryHours) : 'N/A'}
            </div>
            <p className="text-xs text-blue-700 mt-1">
              Based on {averageDeliveryTime?.totalDeliveries.toLocaleString() || 0} deliveries
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-green-900 flex items-center gap-2">
              <PackageCheck className="h-4 w-4" />
              Success Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-900">
              {deliveryRate.toFixed(1)}%
            </div>
            <p className="text-xs text-green-700 mt-1">
              {totalDeliveries.toLocaleString()} successful deliveries
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-purple-900 flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Avg. Revenue per Delivery
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-900">
              {totalDeliveries > 0 ? formatCurrency(totalRevenue / totalDeliveries) : 'RWF 0'}
            </div>
            <p className="text-xs text-purple-700 mt-1">
              Across all completed deliveries
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

const AnalyticsPage = () => {
  return (
    <DashboardLayout>
      <div className="container mx-auto p-6 bg-gray-50 min-h-screen">
        <AnalyticsContent />
      </div>
    </DashboardLayout>
  );
};

export default AnalyticsPage;