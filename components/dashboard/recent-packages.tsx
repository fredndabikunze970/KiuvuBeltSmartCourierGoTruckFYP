"use client"

import { useState, useEffect } from "react"
import { apiService, type Package } from "@/lib/api"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Loader2, Eye, PackageIcon } from "lucide-react"
import Link from "next/link"

const statusColors = {
  registered: "bg-blue-100 text-blue-800",
  picked_up: "bg-amber-100 text-amber-800",
  in_transit: "bg-blue-100 text-blue-800",
  out_for_delivery: "bg-amber-100 text-amber-800",
  delivered: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800",
}

export function RecentPackages() {
  const [packages, setPackages] = useState<Package[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchRecentPackages = async () => {
      try {
        const response = await apiService.getPackages({ limit: 5 })
        setPackages(response.packages)
      } catch (error) {
        console.error("Failed to fetch recent packages:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchRecentPackages()
  }, [])

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
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
    }).format(amount)
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PackageIcon className="h-5 w-5" />
            Recent Packages
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <PackageIcon className="h-5 w-5" />
          Recent Packages
        </CardTitle>
        <CardDescription>Latest package registrations and updates</CardDescription>
      </CardHeader>
      <CardContent>
        {packages.length === 0 ? (
          <div className="text-center py-8">
            <PackageIcon className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No packages found</p>
          </div>
        ) : (
          <div className="space-y-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Package ID</TableHead>
                  <TableHead>Receiver</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Fee</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {packages.map((pkg) => (
                  <TableRow key={pkg.id}>
                    <TableCell className="font-mono font-medium">{pkg.package_id}</TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{pkg.receiver_name}</p>
                        <p className="text-sm text-muted-foreground">{pkg.receiver_phone}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={statusColors[pkg.status]} variant="secondary">
                        {pkg.status.replace("_", " ")}
                      </Badge>
                    </TableCell>
                    <TableCell>{formatCurrency(pkg.delivery_fee)}</TableCell>
                    <TableCell>{formatDate(pkg.created_at)}</TableCell>
                    <TableCell>
                      <Link href={`/dashboard/packages/${pkg.package_id}`}>
                        <Button variant="outline" size="sm">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            <div className="flex justify-center">
              <Link href="/dashboard/packages">
                <Button variant="outline">View All Packages</Button>
              </Link>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
