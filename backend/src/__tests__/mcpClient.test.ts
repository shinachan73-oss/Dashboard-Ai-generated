import { buildMCPTools, toClaudeTool } from "../agent/mcpClient"

test("toClaudeTool converts MCP tool schema to Claude tool format", () => {
  const mcpTool = {
    name: "get_sales",
    description: "Fetch sales data",
    inputSchema: {
      type: "object" as const,
      properties: { period: { type: "string" } },
      required: ["period"]
    }
  }
  const claudeTool = toClaudeTool(mcpTool)
  expect(claudeTool.name).toBe("get_sales")
  expect(claudeTool.description).toBe("Fetch sales data")
  expect(claudeTool.input_schema).toEqual(mcpTool.inputSchema)
})

test("buildMCPTools returns Claude-formatted tools from MCP tool list", () => {
  const mcpTools = [
    { name: "tool_a", description: "Tool A", inputSchema: { type: "object" as const, properties: {} } },
    { name: "tool_b", description: "Tool B", inputSchema: { type: "object" as const, properties: {} } }
  ]
  const result = buildMCPTools(mcpTools)
  expect(result).toHaveLength(2)
  expect(result[0].name).toBe("tool_a")
  expect(result[1].name).toBe("tool_b")
})
