import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { CheckCircle, Clock, Package, Truck } from "lucide-react"

interface StatsCardsProps {
  stats: {
    totalPackages: number
    inTransit: number
    delivered: number
    pending: number
  }
}

export function StatsCards({ stats }: StatsCardsProps) {
  const cards = [
    {
      title: "Total Packages",
      value: stats.totalPackages,
      icon: Package,
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      title: "In Transit",
      value: stats.inTransit,
      icon: Truck,
      color: "text-secondary",
      bgColor: "bg-secondary/10",
    },
    {
      title: "Delivered",
      value: stats.delivered,
      icon: CheckCircle,
      color: "text-green-600",
      bgColor: "bg-green-100",
    },
    {
      title: "Pending",
      value: stats.pending,
      icon: Clock,
      color: "text-orange-600",
      bgColor: "bg-orange-100",
    },
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {cards.map((card, index) => {
        const Icon = card.icon
        return (
          <Card 
            key={card.title} 
            className="border-0 shadow-sm hover-elevate animate-slide-up-fade"
            style={{ animationDelay: `${index * 100}ms` }}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{card.title}</CardTitle>
              <div className={`p-2 rounded-lg ${card.bgColor} transition-transform duration-200 hover:scale-110`}>
                <Icon className={`h-4 w-4 ${card.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{card.value}</div>
              <div className="mt-2 h-1 w-full bg-muted rounded-full overflow-hidden">
                <div 
                  className={`h-full ${card.bgColor} progress-bar`}
                  style={{ 
                    width: `${(card.value / stats.totalPackages) * 100}%`,
                    transition: 'width 1s ease-in-out' 
                  }}
                ></div>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
