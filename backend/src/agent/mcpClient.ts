import { Client } from "@modelcontextprotocol/sdk/client/index.js"
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js"
import Anthropic from "@anthropic-ai/sdk"
import { MCPConfig } from "../types"

export type MCPTool = {
  name: string
  description: string
  inputSchema: { type: "object"; properties: Record<string, unknown>; required?: string[] }
}

export function toClaudeTool(mcpTool: MCPTool): Anthropic.Tool {
  return {
    name: mcpTool.name,
    description: mcpTool.description,
    input_schema: mcpTool.inputSchema as Anthropic.Tool["input_schema"]
  }
}

export function buildMCPTools(mcpTools: MCPTool[]): Anthropic.Tool[] {
  return mcpTools.map(toClaudeTool)
}

export async function createMCPClient(config: MCPConfig): Promise<Client> {
  const headers: Record<string, string> =
    config.auth.type === "bearer" && config.auth.token
      ? { Authorization: `Bearer ${config.auth.token}` }
      : {}

  const transport = new SSEClientTransport(new URL(config.url), {
    requestInit: { headers }
  })

  const client = new Client(
    { name: "dynamic-dashboard", version: "1.0.0" },
    { capabilities: {} }
  )

  await client.connect(transport)
  return client
}

export async function listMCPTools(client: Client): Promise<MCPTool[]> {
  const { tools } = await client.listTools()
  return tools.map(t => ({
    name: t.name,
    description: t.description ?? "",
    inputSchema: (t.inputSchema ?? { type: "object", properties: {} }) as MCPTool["inputSchema"]
  }))
}

export async function callMCPTool(
  client: Client,
  name: string,
  args: Record<string, unknown>
): Promise<string> {
  const result = await client.callTool({ name, arguments: args })
  return JSON.stringify(result.content)
}
