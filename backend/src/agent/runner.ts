import Anthropic from "@anthropic-ai/sdk"
import { Client } from "@modelcontextprotocol/sdk/client/index.js"
import { MCPConfig, ComponentEvent } from "../types"
import { DASHBOARD_TOOLS, isDashboardTool } from "./dashboardTools"
import { createMCPClient, listMCPTools, callMCPTool, buildMCPTools } from "./mcpClient"

const anthropic = new Anthropic()

export async function runDashboardAgent(
  config: MCPConfig,
  onComponent: (event: ComponentEvent) => void
): Promise<void> {
  let mcpClient: Client | null = null

  try {
    mcpClient = await createMCPClient(config)
    const mcpToolDefs = await listMCPTools(mcpClient)
    const allTools = [...buildMCPTools(mcpToolDefs), ...DASHBOARD_TOOLS]

    const messages: Anthropic.MessageParam[] = [
      { role: "user", content: "Build a dashboard from the available data." }
    ]

    const systemPrompt = `You are connected to "${config.name}". Fetch and summarize the available data and render it as a dashboard using the render_* tools. Call render tools as you gather data — do not wait until the end.`

    while (true) {
      const response = await anthropic.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 4096,
        system: systemPrompt,
        messages,
        tools: allTools
      })

      messages.push({ role: "assistant", content: response.content })

      if (response.stop_reason === "end_turn") break

      const toolResults: Anthropic.ToolResultBlockParam[] = []

      for (const block of response.content) {
        if (block.type !== "tool_use") continue

        if (isDashboardTool(block.name)) {
          onComponent({ tool: block.name, props: block.input as Record<string, unknown> })
          toolResults.push({ type: "tool_result", tool_use_id: block.id, content: "Rendered successfully." })
        } else {
          const result = await callMCPTool(mcpClient, block.name, block.input as Record<string, unknown>)
          toolResults.push({ type: "tool_result", tool_use_id: block.id, content: result })
        }
      }

      if (toolResults.length > 0) {
        messages.push({ role: "user", content: toolResults })
      }
    }
  } finally {
    if (mcpClient) await mcpClient.close()
  }
}
