import { isDashboardTool } from "../agent/dashboardTools"
import { ComponentEvent } from "../types"

test("processAgentResponse extracts dashboard tool calls", () => {
  const content: any[] = [
    { type: "text", text: "Building dashboard..." },
    {
      type: "tool_use",
      id: "tool_1",
      name: "render_metric",
      input: { label: "Revenue", value: "$12,400" }
    },
    {
      type: "tool_use",
      id: "tool_2",
      name: "get_sales_data",
      input: { period: "monthly" }
    }
  ]

  const dashboardEvents: ComponentEvent[] = []
  const mcpCalls: Array<{ id: string; name: string; input: unknown }> = []

  for (const block of content) {
    if (block.type !== "tool_use") continue
    if (isDashboardTool(block.name)) {
      dashboardEvents.push({ tool: block.name, props: block.input })
    } else {
      mcpCalls.push({ id: block.id, name: block.name, input: block.input })
    }
  }

  expect(dashboardEvents).toHaveLength(1)
  expect(dashboardEvents[0].tool).toBe("render_metric")
  expect(dashboardEvents[0].props).toEqual({ label: "Revenue", value: "$12,400" })
  expect(mcpCalls).toHaveLength(1)
  expect(mcpCalls[0].name).toBe("get_sales_data")
})
