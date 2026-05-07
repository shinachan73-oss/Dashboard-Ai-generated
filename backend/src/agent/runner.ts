import Anthropic from "@anthropic-ai/sdk"
import { Client } from "@modelcontextprotocol/sdk/client/index.js"
import OpenAI from "openai"
import { MCPConfig, ComponentEvent, ChatMessage } from "../types"
import { DASHBOARD_TOOLS, isDashboardTool } from "./dashboardTools"
import { createMCPClient, listMCPTools, callMCPTool, buildMCPTools } from "./mcpClient"

const USE_OPENAI = process.env.USE_OPENAI === "true"
const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-4o"
const OPENAI_BASE_URL = process.env.OPENAI_BASE_URL
const openai = new OpenAI({
  baseURL: OPENAI_BASE_URL,
  apiKey: process.env.OPENAI_API_KEY || "dummy",
})

const ANTHROPIC_MODEL = "claude-sonnet-4-6"
const anthropic = new Anthropic()

// ── OpenAI helpers ───────────────────────────────────────────────────────────

function toOpenAITools(tools: Anthropic.Tool[]): OpenAI.Chat.Completions.ChatCompletionTool[] {
  return tools.map(t => ({
    type: "function",
    function: {
      name: t.name,
      description: t.description,
      parameters: t.input_schema as Record<string, unknown>
    }
  }))
}

// ── Agent loops ──────────────────────────────────────────────────────────────

async function runWithAnthropic(
  config: MCPConfig,
  mcpClient: Client,
  allTools: Anthropic.Tool[],
  onComponent: (event: ComponentEvent) => void,
  system: string
): Promise<void> {
  const messages: Anthropic.MessageParam[] = [
    { role: "user", content: "Build a dashboard from the available data." }
  ]

  let lastMCPCall: { toolName: string, arguments: Record<string, unknown> } | undefined

  while (true) {
    const response = await anthropic.messages.create({
      model: ANTHROPIC_MODEL,
      max_tokens: 4096,
      system,
      messages,
      tools: allTools
    })

    messages.push({ role: "assistant", content: response.content })
    if (response.stop_reason === "end_turn") break

    const toolResults: Anthropic.ToolResultBlockParam[] = []
    for (const block of response.content) {
      if (block.type !== "tool_use") continue
      if (isDashboardTool(block.name)) {
        onComponent({ tool: block.name, props: block.input as Record<string, unknown>, dataContext: lastMCPCall })
        toolResults.push({ type: "tool_result", tool_use_id: block.id, content: "Rendered successfully." })
      } else {
        lastMCPCall = { toolName: block.name, arguments: block.input as Record<string, unknown> }
        const result = await callMCPTool(mcpClient, block.name, block.input as Record<string, unknown>)
        toolResults.push({ type: "tool_result", tool_use_id: block.id, content: result })
      }
    }
    if (toolResults.length > 0) messages.push({ role: "user", content: toolResults })
  }
}

async function runWithOpenAI(
  config: MCPConfig,
  mcpClient: Client,
  allTools: Anthropic.Tool[] | OpenAI.Chat.Completions.ChatCompletionTool[],
  onComponent: (event: ComponentEvent) => void,
  system: string
): Promise<void> {
  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    { role: "system", content: system },
    { role: "user", content: "Build a dashboard from the available data." }
  ]
  const openAITools = Array.isArray(allTools) && allTools.length > 0 && "type" in allTools[0] 
    ? allTools as OpenAI.Chat.Completions.ChatCompletionTool[]
    : toOpenAITools(allTools as Anthropic.Tool[])

  let lastMCPCall: { toolName: string, arguments: Record<string, unknown> } | undefined

  while (true) {
    const response = await openai.chat.completions.create({
      model: OPENAI_MODEL,
      messages,
      tools: openAITools.length > 0 ? openAITools : undefined,
    })

    const choice = response.choices[0]
    const message = choice.message
    messages.push(message)

    if (choice.finish_reason === "stop" || choice.finish_reason === "length") break
    if (!message.tool_calls || message.tool_calls.length === 0) break

    for (const toolCall of message.tool_calls) {
      if (toolCall.type !== "function") continue
      
      const toolName = toolCall.function.name
      let args: Record<string, unknown> = {}
      try {
        args = JSON.parse(toolCall.function.arguments)
      } catch (e) {
        console.error("Failed to parse tool arguments", e)
      }

      let resultContent: string
      if (isDashboardTool(toolName)) {
        onComponent({ 
          tool: toolName, 
          props: args,
          dataContext: lastMCPCall 
        })
        resultContent = "Rendered successfully."
      } else {
        try {
          lastMCPCall = { toolName, arguments: args }
          resultContent = await callMCPTool(mcpClient, toolName, args)
        } catch (e: any) {
          resultContent = `Error calling tool: ${e.message}`
        }
      }

      messages.push({
        role: "tool",
        tool_call_id: toolCall.id,
        content: resultContent
      })
    }
  }
}

// ── Public API ───────────────────────────────────────────────────────────────

export async function runDashboardAgent(
  config: MCPConfig,
  onComponent: (event: ComponentEvent) => void,
  isSync: boolean = false
): Promise<void> {
  let mcpClient: Client | null = null
  try {
    mcpClient = await createMCPClient(config)
    const mcpToolDefs = await listMCPTools(mcpClient)
    const allTools = [...buildMCPTools(mcpToolDefs), ...DASHBOARD_TOOLS]

    const baseSystem = `You are connected to "${config.name}". Fetch and summarize the available data and render it as a dashboard using the render_* tools. Call render tools as you gather data — do not wait until the end.`
    const syncSystem = `STRICT MODE: You are updating ONLY THE DATA inside the current dashboard for "${config.name}". 
1. Fetch FRESH data from the tools.
2. For EVERY component you previously rendered, call the EXACT same render_* tool again.
3. Keep the TITLES and LABELS identical to the previous run.
4. ONLY update the 'value', 'data', or 'content' fields.
5. DO NOT add new cards or charts. DO NOT change the order.`
    
    const system = isSync ? syncSystem : baseSystem

    if (USE_OPENAI) {
      await runWithOpenAI(config, mcpClient, allTools, onComponent, system)
    } else {
      await runWithAnthropic(config, mcpClient, allTools, onComponent, system)
    }
  } finally {
    if (mcpClient) await mcpClient.close()
  }
}

export async function runChatAgent(
  config: MCPConfig,
  chatHistory: ChatMessage[],
  dashboardContext: string
): Promise<string> {
  let mcpClient: Client | null = null
  try {
    mcpClient = await createMCPClient(config)
    const mcpToolDefs = await listMCPTools(mcpClient)
    const mcpTools = buildMCPTools(mcpToolDefs)

    const system = `You are an AI assistant for a dynamic dashboard connected to "${config.name}". 
The current dashboard shows:
${dashboardContext}

Answer the user's questions about this data. You can also call tools to fetch more information if needed. Keep your responses concise and helpful.`

    if (USE_OPENAI) {
      const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
        { role: "system", content: system },
        ...chatHistory.map(m => ({ role: m.role as "user" | "assistant", content: m.content }))
      ]

      while (true) {
        const response = await openai.chat.completions.create({
          model: OPENAI_MODEL,
          messages,
          tools: toOpenAITools(mcpTools),
        })

        const message = response.choices[0].message
        messages.push(message)

        if (response.choices[0].finish_reason === "stop") {
          const cleanContent = (message.content || "").replace(/<think>[\s\S]*?<\/think>/g, "").trim()
          return cleanContent || "I'm sorry, I couldn't generate a response."
        }

        if (message.tool_calls) {
          for (const toolCall of message.tool_calls) {
            if (toolCall.type === "function") {
              const result = await callMCPTool(mcpClient, toolCall.function.name, JSON.parse(toolCall.function.arguments))
              messages.push({ role: "tool", tool_call_id: toolCall.id, content: result })
            }
          }
        }
      }
    } else {
      // Fallback for Anthropic (Omitted for brevity, but similar logic applies)
      return "Chat is currently only supported in OpenAI mode."
    }
  } finally {
    if (mcpClient) await mcpClient.close()
  }
}
