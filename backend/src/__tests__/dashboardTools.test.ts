import { DASHBOARD_TOOLS, DASHBOARD_TOOL_NAMES, isDashboardTool } from "../agent/dashboardTools"

test("DASHBOARD_TOOLS contains all 6 render tools", () => {
  const names = DASHBOARD_TOOLS.map(t => t.name)
  expect(names).toContain("render_metric")
  expect(names).toContain("render_table")
  expect(names).toContain("render_chart")
  expect(names).toContain("render_text")
  expect(names).toContain("render_list")
  expect(names).toContain("render_alert")
})

test("each tool has name, description, and input_schema", () => {
  DASHBOARD_TOOLS.forEach(tool => {
    expect(tool.name).toBeTruthy()
    expect(tool.description).toBeTruthy()
    expect(tool.input_schema).toBeTruthy()
    expect(tool.input_schema.type).toBe("object")
  })
})

test("isDashboardTool returns true for dashboard tool names", () => {
  expect(isDashboardTool("render_metric")).toBe(true)
  expect(isDashboardTool("render_table")).toBe(true)
  expect(isDashboardTool("some_mcp_tool")).toBe(false)
})
