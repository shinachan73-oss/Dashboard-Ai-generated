import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { TrendingUp, TrendingDown } from "lucide-react"

interface MetricCardProps {
  label: string
  value: string
  trend?: "up" | "down"
}

export default function MetricCard({ label, value, trend }: MetricCardProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-2">
          <span className="text-2xl font-bold">{value}</span>
          {trend === "up" && (
            <TrendingUp data-testid="trend-up" className="h-4 w-4 text-green-500" />
          )}
          {trend === "down" && (
            <TrendingDown data-testid="trend-down" className="h-4 w-4 text-red-500" />
          )}
        </div>
      </CardContent>
    </Card>
  )
}
