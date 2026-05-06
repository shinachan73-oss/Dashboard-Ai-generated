import React from "react"
import { ComponentEvent } from "../../types"
import MetricCard from "./MetricCard"
import DataTable from "./DataTable"
import ChartWidget from "./ChartWidget"
import TextBlock from "./TextBlock"
import ListWidget from "./ListWidget"
import AlertBanner from "./AlertBanner"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const REGISTRY: Record<string, React.ComponentType<any>> = {
  render_metric: MetricCard,
  render_table: DataTable,
  render_chart: ChartWidget,
  render_text: TextBlock,
  render_list: ListWidget,
  render_alert: AlertBanner
}

interface DashboardProps {
  components: ComponentEvent[]
}

export default function Dashboard({ components }: DashboardProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {components.map(({ tool, props }, i) => {
        const Component = REGISTRY[tool]
        if (!Component) return null
        return <Component key={i} {...props} />
      })}
    </div>
  )
}
