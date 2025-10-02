"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { LucideIcon } from "lucide-react"

interface DashboardCardProps {
  title: string
  value: string | number
  description?: string
  icon?: LucideIcon
  trend?: {
    value: number
    timeframe: string
    isPositive: boolean
  }
  className?: string
}

export function DashboardCard({
  title,
  value,
  description,
  icon: Icon,
  trend,
  className,
}: DashboardCardProps) {
  return (
    <Card className={cn(
        "transition-all duration-300 hover:shadow-lg hover:scale-[1.02] hover:bg-gradient-to-br from-background to-muted/50 dark:hover:from-background dark:hover:to-muted/20",
        className
      )}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground transition-colors group-hover:text-primary">{title}</CardTitle>
        {Icon && (
          <div className="rounded-lg bg-primary/10 p-2 transition-all duration-300 group-hover:bg-primary/20 group-hover:scale-110">
            <Icon className="h-4 w-4 text-primary transition-transform group-hover:scale-110" />
          </div>
        )}
      </CardHeader>
      <CardContent>
        <div className="flex items-baseline justify-between">
          <div className="text-2xl font-bold">{value}</div>
          {trend && (
            <div
              className={cn(
                "text-xs font-medium",
                trend.isPositive ? "text-green-600" : "text-red-600",
              )}
            >
              {trend.isPositive ? "+" : "-"}
              {Math.abs(trend.value)}%
              <span className="text-muted-foreground"> vs {trend.timeframe}</span>
            </div>
          )}
        </div>
        {description && (
          <p className="mt-1 text-xs text-muted-foreground">{description}</p>
        )}
      </CardContent>
    </Card>
  )
}