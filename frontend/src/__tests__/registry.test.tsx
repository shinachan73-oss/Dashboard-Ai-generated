import { render, screen } from "@testing-library/react"
import Dashboard from "../components/dashboard/registry"
import { ComponentEvent } from "../types"

test("renders a metric component from a component event", () => {
  const events: ComponentEvent[] = [
    { tool: "render_metric", props: { label: "Revenue", value: "$100" } }
  ]
  render(<Dashboard components={events} />)
  expect(screen.getByText("Revenue")).toBeInTheDocument()
  expect(screen.getByText("$100")).toBeInTheDocument()
})

test("renders multiple components in order", () => {
  const events: ComponentEvent[] = [
    { tool: "render_text", props: { content: "Summary text here" } },
    { tool: "render_alert", props: { message: "Watch out!", severity: "warning" } }
  ]
  render(<Dashboard components={events} />)
  expect(screen.getByText("Summary text here")).toBeInTheDocument()
  expect(screen.getByText("Watch out!")).toBeInTheDocument()
})

test("silently skips unknown tool names", () => {
  const events: ComponentEvent[] = [
    { tool: "render_metric", props: { label: "OK", value: "1" } },
    { tool: "unknown_tool", props: { foo: "bar" } }
  ]
  expect(() => render(<Dashboard components={events} />)).not.toThrow()
  expect(screen.getByText("OK")).toBeInTheDocument()
})
