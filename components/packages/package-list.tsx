"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
// dialog handled by PackageDetailsModal
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useAuth } from "@/hooks/use-auth"
import { apiService, type Package } from "@/lib/api"
import {
    Calendar,
    Car,
    ChevronDown,
    ChevronRight,
    Edit,
    Eye,
    MapPin,
    Package as PackageIcon,
    Phone,
    Search,
    Truck,
    User
} from "lucide-react"
import Link from "next/link"
import { useEffect, useState } from "react"
import { PackageDetailsModal } from "./package-details-modal"
import { PackageListSkeleton } from "./package-list-skeleton"

const statusConfig = {
  registered: {
    label: "Registered",
    color: "bg-blue-100 text-blue-800 border-blue-200",
    icon: "📦"
  },
  picked_up: {
    label: "Picked Up",
    color: "bg-yellow-100 text-yellow-800 border-yellow-200",
    icon: "🚚"
  },
  in_transit: {
    label: "In Transit",
    color: "bg-purple-100 text-purple-800 border-purple-200",
    icon: "🚛"
  },
  out_for_delivery: {
    label: "Out for Delivery",
    color: "bg-orange-100 text-orange-800 border-orange-200",
    icon: "🏍️"
  },
  arrived: {
    label: "Arrived",
    color: "bg-emerald-100 text-emerald-800 border-emerald-200",
    icon: "🏁"
  },
  delivered: {
    label: "Delivered",
    color: "bg-green-100 text-green-800 border-green-200",
    icon: "✅"
  },
  cancelled: {
    label: "Cancelled",
    color: "bg-red-100 text-red-800 border-red-200",
    icon: "❌"
  },
}

const packageTypeConfig = {
  outgoing: {
    label: "Outgoing",
    color: "bg-green-100 text-green-800 border-green-200",
    icon: "📤"
  },
  incoming: {
    label: "Incoming",
    color: "bg-blue-100 text-blue-800 border-blue-200",
    icon: "📥"
  },
  other: {
    label: "Other",
    color: "bg-gray-100 text-gray-800 border-gray-200",
    icon: "📦"
  },
}

const priorityConfig = {
  normal: {
    label: "Normal",
    color: "bg-gray-100 text-gray-800 border-gray-200",
    timeline: "3-5 days"
  },
  express: {
    label: "Express",
    color: "bg-blue-100 text-blue-800 border-blue-200",
    timeline: "1-2 days"
  },
  urgent: {
    label: "Urgent",
    color: "bg-red-100 text-red-800 border-red-200",
    timeline: "Same day"
  },
}

export function PackageList() {
  const [packages, setPackages] = useState<Package[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [dateRange, setDateRange] = useState<string>("all")
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const { user } = useAuth()
  const [detailPkg, setDetailPkg] = useState<Package | null>(null)
  const [detailTracking, setDetailTracking] = useState<any[] | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailOpen, setDetailOpen] = useState(false)

  const fetchPackages = async () => {
    try {
      setLoading(true)
      const params: any = {
        page: currentPage,
        limit: 10,
      }

      if (statusFilter !== "all") {
        params.status = statusFilter
      }
      if (dateRange && dateRange !== 'all') {
        params.dateRange = dateRange
      }

  const response = await apiService.getPackages(params)
  setPackages(response.packages)
  setTotalPages(response.pagination.pages)
  setTotalCount(response.pagination.total)
    } catch (error) {
      console.error("Failed to fetch packages:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPackages()
  }, [currentPage, statusFilter, dateRange])

  const inDateRange = (createdAt: string, range: string) => {
    if (!createdAt) return false
    const d = new Date(createdAt)
    const startOfDay = (dt: Date) => new Date(dt.getFullYear(), dt.getMonth(), dt.getDate())

    const todayStart = startOfDay(new Date())
    const yesterdayStart = new Date(todayStart); yesterdayStart.setDate(todayStart.getDate() - 1)
    const weekStart = new Date(todayStart); weekStart.setDate(todayStart.getDate() - ((todayStart.getDay() + 6) % 7)) // Monday as start
    const monthStart = new Date(todayStart.getFullYear(), todayStart.getMonth(), 1)

    switch (range) {
      case 'today':
        return d >= todayStart
      case 'yesterday':
        return d >= yesterdayStart && d < todayStart
      case 'this_week':
        return d >= weekStart
      case 'this_month':
        return d >= monthStart
      case 'all':
      default:
        return true
    }
  }

  const filteredPackages = packages.filter(
    (pkg) => {
      const q = searchTerm.toLowerCase()
      const matchesText =
        pkg.package_id.toLowerCase().includes(q) ||
        pkg.sender_name.toLowerCase().includes(q) ||
        pkg.receiver_name.toLowerCase().includes(q)
      const matchesDate = dateRange === 'all' ? true : inDateRange(pkg.created_at, dateRange)
      return matchesText && matchesDate
    }
  )

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-RW", {
      style: "currency",
      currency: "RWF",
      minimumFractionDigits: 0,
    }).format(amount)
  }

  if (loading) {
    return <PackageListSkeleton />
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Package Management
          </h2>
          <p className="text-muted-foreground mt-1">
            {user?.role === "agent" ? "Manage your registered packages" : "Monitor all packages in the system"}
          </p>
        </div>
        <Link href="/dashboard/packages/register">
          <Button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
            <PackageIcon className="mr-2 h-4 w-4" />
            Register New Package
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search packages by ID, sender, or receiver..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 h-11 bg-white/80 backdrop-blur-sm"
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-48 h-11 bg-white/80 backdrop-blur-sm">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="registered">📦 Registered</SelectItem>
                <SelectItem value="picked_up">🚚 Picked Up</SelectItem>
                <SelectItem value="in_transit">🚛 In Transit</SelectItem>
                <SelectItem value="out_for_delivery">🏍️ Out for Delivery</SelectItem>
                <SelectItem value="arrived">🏁 Arrived</SelectItem>
                <SelectItem value="delivered">✅ Delivered</SelectItem>
                <SelectItem value="cancelled">❌ Cancelled</SelectItem>
              </SelectContent>
              </Select>

              <Select value={dateRange} onValueChange={setDateRange}>
                <SelectTrigger className="w-full sm:w-40 h-11 bg-white/80 backdrop-blur-sm">
                  <SelectValue placeholder="Date Range" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Dates</SelectItem>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="yesterday">Yesterday</SelectItem>
                  <SelectItem value="this_week">This Week</SelectItem>
                  <SelectItem value="this_month">This Month</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-600">Total Packages</p>
                <p className="text-2xl font-bold text-blue-800">{totalCount}</p>
              </div>
              <div className="p-2 bg-blue-200 rounded-lg">
                <PackageIcon className="h-5 w-5 text-blue-700" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-600">Delivered</p>
                <p className="text-2xl font-bold text-green-800">
                  {packages.filter(pkg => pkg.status === 'delivered').length}
                </p>
              </div>
              <div className="p-2 bg-green-200 rounded-lg">
                <div className="h-5 w-5 text-green-700">✅</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-purple-600">In Transit</p>
                <p className="text-2xl font-bold text-purple-800">
                  {packages.filter(pkg => pkg.status === 'in_transit').length}
                </p>
              </div>
              <div className="p-2 bg-purple-200 rounded-lg">
                <Car className="h-5 w-5 text-purple-700" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-orange-600">Pending</p>
                <p className="text-2xl font-bold text-orange-800">
                  {packages.filter(pkg =>
                    ['registered', 'picked_up', 'out_for_delivery'].includes(pkg.status)
                  ).length}
                </p>
              </div>
              <div className="p-2 bg-orange-200 rounded-lg">
                <div className="h-5 w-5 text-orange-700">⏳</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Package Table */}
      <Tabs defaultValue="table" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="table" className="flex items-center gap-2">
            <Table className="h-4 w-4" />
            Table View
          </TabsTrigger>
          <TabsTrigger value="grid" className="flex items-center gap-2">
            <PackageIcon className="h-4 w-4" />
            Grid View
          </TabsTrigger>
        </TabsList>

        <TabsContent value="table" className="space-y-4">
          <Card>
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-xl">Packages Overview</CardTitle>
                  <CardDescription>
                    Showing {filteredPackages.length} package{filteredPackages.length !== 1 ? 's' : ''}
                  </CardDescription>
                </div>
                <Badge variant="outline" className="text-sm">
                  Page {currentPage} of {totalPages}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-muted/50">
                    <TableRow>
                      <TableHead className="w-12"></TableHead>
                      <TableHead className="min-w-[200px]">Package Details</TableHead>
                      <TableHead className="min-w-[140px]">Status</TableHead>
                      <TableHead className="min-w-[180px]">Route</TableHead>
                      <TableHead className="min-w-[150px]">Vehicle Info</TableHead>
                      <TableHead className="min-w-[120px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredPackages.map((pkg, index) => {
                      const status = statusConfig[pkg.status]
                      const priority = priorityConfig[pkg.priority]

                      return (
                        <Collapsible key={pkg.id} asChild>
                          <>
                            <TableRow className="group hover:bg-muted/30 transition-colors border-b">
                              <TableCell>
                                <CollapsibleTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 p-0 hover:bg-primary/10"
                                  >
                                    <ChevronRight className="h-4 w-4 transition-transform group-data-[state=open]:rotate-90" />
                                  </Button>
                                </CollapsibleTrigger>
                              </TableCell>
                              <TableCell>
                                <div className="space-y-2">
                                  <div className="flex items-center gap-2">
                                    <div className="p-1.5 bg-primary/10 rounded-lg">
                                      <PackageIcon className="h-3.5 w-3.5 text-primary" />
                                    </div>
                                    <span className="font-mono font-semibold text-sm">{pkg.package_id}</span>
                                  </div>
                                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                    <Calendar className="h-3 w-3" />
                                    {formatDate(pkg.created_at)}
                                  </div>
                                  <div className="font-semibold text-primary">
                                    {formatCurrency(pkg.delivery_fee)}
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="space-y-2">
                                  <Badge
                                    variant="outline"
                                    className={`${status.color} font-medium text-xs`}
                                  >
                                    {status.icon} {status.label}
                                  </Badge>
                                  <Badge
                                    variant="outline"
                                    className={`${priority.color} font-medium text-xs`}
                                  >
                                    {priority.label}
                                  </Badge>
                                  {pkg.package_type && (
                                    <Badge
                                      variant="outline"
                                      className={`${packageTypeConfig[pkg.package_type]?.color || "bg-gray-100 text-gray-800 border-gray-200"} font-medium text-xs`}
                                    >
                                      {packageTypeConfig[pkg.package_type]?.icon} {packageTypeConfig[pkg.package_type]?.label}
                                    </Badge>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="space-y-2">
                                  <div className="flex items-center gap-2">
                                    <MapPin className="h-3.5 w-3.5 text-green-600" />
                                    <div>
                                      <p className="font-medium text-sm">{pkg.origin_branch_name || 'N/A'}</p>
                                      <p className="text-xs text-muted-foreground truncate max-w-[120px]">
                                        {pkg.sender_name}
                                      </p>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <MapPin className="h-3.5 w-3.5 text-red-600" />
                                    <div>
                                      <p className="font-medium text-sm">{pkg.destination_branch_name || 'N/A'}</p>
                                      <p className="text-xs text-muted-foreground truncate max-w-[120px]">
                                        {pkg.receiver_name}
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell>
                                {pkg.car_plate_number || pkg.driver_name ? (
                                  <div className="space-y-2">
                                    <div className="flex items-center gap-2">
                                      <Car className="h-3.5 w-3.5 text-blue-600" />
                                      <div>
                                        <p className="font-medium text-sm">{pkg.car_plate_number}</p>
                                        <p className="text-xs text-muted-foreground">{pkg.car_model}</p>
                                      </div>
                                    </div>
                                    {pkg.driver_name && (
                                      <div className="flex items-center gap-2">
                                        <User className="h-3.5 w-3.5 text-orange-600" />
                                        <p className="text-sm font-medium">{pkg.driver_name}</p>
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  <div className="text-center p-2 bg-muted/50 rounded-lg">
                                    <p className="text-xs text-muted-foreground font-medium">Awaiting Vehicle Assignment</p>
                                  </div>
                                )}
                              </TableCell>
                              <TableCell>
                                <div className="flex gap-2 items-center">
                                  <>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      aria-label={`View details for ${pkg.package_id}`}
                                      title={`View details for ${pkg.package_id}`}
                                      className="h-8 px-2 py-1 flex items-center gap-2 hover:bg-blue-50 hover:text-blue-700"
                                      onClick={async (e) => {
                                        e.preventDefault()
                                        setDetailLoading(true)
                                        try {
                                          const res = await apiService.getPackage(pkg.package_id)
                                          setDetailPkg(res.package)
                                          setDetailTracking(res.tracking || [])
                                          setDetailOpen(true)
                                        } catch (err) {
                                          console.error('Failed to load package details', err)
                                          setDetailPkg(null)
                                          setDetailTracking([])
                                        } finally {
                                          setDetailLoading(false)
                                        }
                                      }}
                                    >
                                      <Eye className="h-4 w-4" />
                                      <span className="hidden sm:inline text-sm">Details</span>
                                    </Button>

                                    <PackageDetailsModal packageData={detailPkg} open={detailOpen} onOpenChange={setDetailOpen} />
                                  </>

                                  <Link href={`/dashboard/packages/${pkg.package_id}/update`}>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      aria-label={`Edit package ${pkg.package_id}`}
                                      title={`Edit package ${pkg.package_id}`}
                                      className="h-8 px-2 py-1 flex items-center gap-2 hover:bg-green-50 hover:text-green-700"
                                    >
                                      <Edit className="h-4 w-4" />
                                      <span className="hidden sm:inline text-sm">Edit</span>
                                    </Button>
                                  </Link>

                                  <Link href={`/track/${pkg.package_id}`}>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      aria-label={`Track package ${pkg.package_id}`}
                                      title={`Track package ${pkg.package_id}`}
                                      className="h-8 px-2 py-1 flex items-center gap-2 bg-gradient-to-r from-purple-50 to-purple-100 hover:from-purple-100 hover:to-purple-200 text-purple-700"
                                    >
                                      <Truck className="h-4 w-4" />
                                      <span className="hidden sm:inline text-sm">Track</span>
                                    </Button>
                                  </Link>
                                </div>
                              </TableCell>
                            </TableRow>

                            <TableRow>
                              <TableCell colSpan={6} className="p-0">
                                <CollapsibleContent>
                                  <div className="bg-muted/30 px-6 py-4 border-t">
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                      {/* Sender Details */}
                                      <div className="space-y-3">
                                        <div className="flex items-center gap-2">
                                          <User className="h-4 w-4 text-blue-600" />
                                          <h4 className="font-semibold text-sm">Sender Information</h4>
                                        </div>
                                        <div className="space-y-2 text-sm">
                                          <div>
                                            <p className="font-medium">{pkg.sender_name}</p>
                                            <div className="flex items-center gap-1 text-muted-foreground">
                                              <Phone className="h-3 w-3" />
                                              <p>{pkg.sender_phone}</p>
                                            </div>
                                          </div>
                                          <p className="text-muted-foreground">{pkg.sender_address}</p>
                                        </div>
                                      </div>

                                      {/* Receiver Details */}
                                      <div className="space-y-3">
                                        <div className="flex items-center gap-2">
                                          <User className="h-4 w-4 text-green-600" />
                                          <h4 className="font-semibold text-sm">Receiver Information</h4>
                                        </div>
                                        <div className="space-y-2 text-sm">
                                          <div>
                                            <p className="font-medium">{pkg.receiver_name}</p>
                                            <div className="flex items-center gap-1 text-muted-foreground">
                                              <Phone className="h-3 w-3" />
                                              <p>{pkg.receiver_phone}</p>
                                            </div>
                                          </div>
                                          <p className="text-muted-foreground">{pkg.receiver_address}</p>
                                        </div>
                                      </div>

                                      {/* Package Details */}
                                      <div className="space-y-3">
                                        <div className="flex items-center gap-2">
                                          <PackageIcon className="h-4 w-4 text-purple-600" />
                                          <h4 className="font-semibold text-sm">Package Information</h4>
                                        </div>
                                        <div className="space-y-2 text-sm">
                                          {pkg.package_description && (
                                            <div>
                                              <p className="font-medium">Description</p>
                                              <p className="text-muted-foreground">{pkg.package_description}</p>
                                            </div>
                                          )}
                                          <div className="grid grid-cols-2 gap-2">
                                            {pkg.weight && (
                                              <div>
                                                <p className="font-medium">Weight</p>
                                                <p className="text-muted-foreground">{pkg.weight} kg</p>
                                              </div>
                                            )}
                                            {pkg.dimensions && (
                                              <div>
                                                <p className="font-medium">Dimensions</p>
                                                <p className="text-muted-foreground">{pkg.dimensions}</p>
                                              </div>
                                            )}
                                          </div>
                                          <div>
                                            <p className="font-medium">Registered By</p>
                                            <p className="text-muted-foreground">{pkg.agent_name}</p>
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                </CollapsibleContent>
                              </TableCell>
                            </TableRow>
                          </>
                        </Collapsible>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>

              {filteredPackages.length === 0 && (
                <div className="text-center py-16">
                  <div className="mx-auto w-24 h-24 bg-muted/50 rounded-full flex items-center justify-center mb-4">
                    <PackageIcon className="h-10 w-10 text-muted-foreground" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">No packages found</h3>
                  <p className="text-muted-foreground max-w-sm mx-auto mb-6">
                    {searchTerm
                      ? "No packages match your search criteria. Try adjusting your search terms."
                      : "Get started by registering your first package."}
                  </p>
                  <Link href="/dashboard/packages/register">
                    <Button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
                      <PackageIcon className="mr-2 h-4 w-4" />
                      Register First Package
                    </Button>
                  </Link>
                </div>
              )}

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between p-6 border-t">
                  <p className="text-sm text-muted-foreground">
                    Showing page {currentPage} of {totalPages}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                      disabled={currentPage === 1}
                      className="flex items-center gap-1"
                    >
                      <ChevronDown className="h-4 w-4 rotate-90" />
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                      disabled={currentPage === totalPages}
                      className="flex items-center gap-1"
                    >
                      Next
                      <ChevronDown className="h-4 w-4 -rotate-90" />
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="grid">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {filteredPackages.map((pkg, index) => {
              const status = statusConfig[pkg.status]
              const priority = priorityConfig[pkg.priority]

              return (
                <Card key={pkg.id} className="hover:shadow-lg transition-all duration-300 border-l-4 border-l-primary">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <div className="p-1.5 bg-primary/10 rounded-lg">
                            <PackageIcon className="h-4 w-4 text-primary" />
                          </div>
                          <span className="font-mono font-bold text-sm">{pkg.package_id}</span>
                        </div>
                        <Badge className={status.color}>
                          {status.icon} {status.label}
                        </Badge>
                      </div>
                      <Badge variant="outline" className={priority.color}>
                        {priority.label}
                      </Badge>
                    </div>
                    <CardDescription className="flex items-center gap-1 text-xs">
                      <Calendar className="h-3 w-3" />
                      {formatDateTime(pkg.created_at)}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Route Information */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="text-center flex-1">
                          <MapPin className="h-4 w-4 text-green-600 mx-auto mb-1" />
                          <p className="font-semibold text-sm">{pkg.origin_branch_name || 'Origin'}</p>
                          <p className="text-xs text-muted-foreground truncate">{pkg.sender_name}</p>
                        </div>
                        <div className="flex-1 text-center">
                          <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                            <Car className="h-4 w-4 text-primary" />
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">{priority.timeline}</p>
                        </div>
                        <div className="text-center flex-1">
                          <MapPin className="h-4 w-4 text-red-600 mx-auto mb-1" />
                          <p className="font-semibold text-sm">{pkg.destination_branch_name || 'Destination'}</p>
                          <p className="text-xs text-muted-foreground truncate">{pkg.receiver_name}</p>
                        </div>
                      </div>
                    </div>

                    {/* Vehicle Information */}
                    {(pkg.car_plate_number || pkg.driver_name) && (
                      <div className="bg-muted/50 rounded-lg p-3 space-y-2">
                        <div className="flex items-center gap-2">
                          <Car className="h-4 w-4 text-blue-600" />
                          <span className="font-medium text-sm">Vehicle Information</span>
                        </div>
                        {pkg.car_plate_number && (
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Plate Number:</span>
                            <span className="font-medium">{pkg.car_plate_number}</span>
                          </div>
                        )}
                        {pkg.car_model && (
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Vehicle Model:</span>
                            <span className="font-medium">{pkg.car_model}</span>
                          </div>
                        )}
                        {pkg.driver_name && (
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Driver:</span>
                            <span className="font-medium">{pkg.driver_name}</span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Price */}
                    <div className="flex items-center justify-between p-3 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg">
                      <span className="font-medium text-sm">Delivery Fee</span>
                      <span className="font-bold text-primary">{formatCurrency(pkg.delivery_fee)}</span>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2">
                      <Link href={`/dashboard/packages/${pkg.package_id}`} className="flex-1">
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full flex items-center justify-center gap-2"
                          aria-label={`View details for ${pkg.package_id}`}
                          title={`View details for ${pkg.package_id}`}
                        >
                          <Eye className="h-4 w-4" />
                          <span className="hidden sm:inline">Details</span>
                        </Button>
                      </Link>
                      <Link href={`/track/${pkg.package_id}`} className="flex-1">
                        <Button
                          size="sm"
                          className="w-full bg-gradient-to-r from-blue-600 to-purple-600 flex items-center justify-center gap-2"
                          aria-label={`Track package ${pkg.package_id}`}
                          title={`Track package ${pkg.package_id}`}
                        >
                          <Truck className="h-4 w-4" />
                          <span className="hidden sm:inline">Track</span>
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              )
            })}

            {filteredPackages.length === 0 && (
              <div className="col-span-full text-center py-16">
                <div className="mx-auto w-24 h-24 bg-muted/50 rounded-full flex items-center justify-center mb-4">
                  <PackageIcon className="h-10 w-10 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold mb-2">No packages found</h3>
                <p className="text-muted-foreground max-w-sm mx-auto mb-6">
                  {searchTerm
                    ? "No packages match your search criteria."
                    : "Start by registering your first package."}
                </p>
                <Link href="/dashboard/packages/register">
                  <Button className="bg-gradient-to-r from-blue-600 to-purple-600">
                    <PackageIcon className="mr-2 h-4 w-4" />
                    Register Package
                  </Button>
                </Link>
              </div>
            )}
          </div>

          {/* Pagination for grid view */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-6">
              <p className="text-sm text-muted-foreground">
                Page {currentPage} of {totalPages}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}