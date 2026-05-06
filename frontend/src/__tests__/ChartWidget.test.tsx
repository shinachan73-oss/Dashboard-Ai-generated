import { render, screen } from "@testing-library/react"
import ChartWidget from "../components/dashboard/ChartWidget"

test("renders chart title", () => {
  render(
    <ChartWidget
      title="Monthly Revenue"
      chart_type="bar"
      data={[{ month: "Jan", revenue: 1000 }]}
      x_key="month"
      y_key="revenue"
    />
  )
  expect(screen.getByText("Monthly Revenue")).toBeInTheDocument()
})
