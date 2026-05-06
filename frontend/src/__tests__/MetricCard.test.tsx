import { render, screen } from "@testing-library/react"
import MetricCard from "../components/dashboard/MetricCard"

test("renders label and value", () => {
  render(<MetricCard label="Revenue" value="$12,400" />)
  expect(screen.getByText("Revenue")).toBeInTheDocument()
  expect(screen.getByText("$12,400")).toBeInTheDocument()
})

test("renders trend up indicator when trend is up", () => {
  render(<MetricCard label="Sales" value="100" trend="up" />)
  expect(screen.getByTestId("trend-up")).toBeInTheDocument()
})

test("renders trend down indicator when trend is down", () => {
  render(<MetricCard label="Churn" value="5" trend="down" />)
  expect(screen.getByTestId("trend-down")).toBeInTheDocument()
})
