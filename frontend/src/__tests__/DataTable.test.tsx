import { render, screen } from "@testing-library/react"
import DataTable from "../components/dashboard/DataTable"

test("renders column headers", () => {
  render(
    <DataTable
      columns={["Name", "Sales"]}
      rows={[{ Name: "Alice", Sales: 100 }]}
    />
  )
  expect(screen.getByText("Name")).toBeInTheDocument()
  expect(screen.getByText("Sales")).toBeInTheDocument()
})

test("renders row data", () => {
  render(
    <DataTable
      columns={["Name", "Sales"]}
      rows={[{ Name: "Alice", Sales: 100 }, { Name: "Bob", Sales: 200 }]}
    />
  )
  expect(screen.getByText("Alice")).toBeInTheDocument()
  expect(screen.getByText("Bob")).toBeInTheDocument()
})

test("renders optional title", () => {
  render(<DataTable title="Sales Report" columns={["A"]} rows={[]} />)
  expect(screen.getByText("Sales Report")).toBeInTheDocument()
})
