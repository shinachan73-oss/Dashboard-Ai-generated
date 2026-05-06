import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from "recharts"

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"]

interface ChartWidgetProps {
  title?: string
  chart_type: "bar" | "line" | "pie"
  data: Record<string, unknown>[]
  x_key: string
  y_key: string
}

export default function ChartWidget({ title, chart_type, data, x_key, y_key }: ChartWidgetProps) {
  return (
    <Card>
      {title && (
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
      )}
      <CardContent>
        <ResponsiveContainer width="100%" height={250}>
          {chart_type === "bar" ? (
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey={x_key} />
              <YAxis />
              <Tooltip />
              <Bar dataKey={y_key} fill={COLORS[0]} />
            </BarChart>
          ) : chart_type === "line" ? (
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey={x_key} />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey={y_key} stroke={COLORS[0]} />
            </LineChart>
          ) : (
            <PieChart>
              <Pie data={data} dataKey={y_key} nameKey={x_key} cx="50%" cy="50%" outerRadius={80} label>
                {data.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          )}
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
