import Anthropic from "@anthropic-ai/sdk"
import {
  BedrockRuntimeClient,
  ConverseCommand,
  type Message as BedrockMessage,
  type ContentBlock as BedrockContentBlock
} from "@aws-sdk/client-bedrock-runtime"
import { Client } from "@modelcontextprotocol/sdk/client/index.js"
import OpenAI from "openai"
import { MCPConfig, ComponentEvent } from "../types"
import { DASHBOARD_TOOLS, isDashboardTool } from "./dashboardTools"
import { createMCPClient, listMCPTools, callMCPTool, buildMCPTools } from "./mcpClient"

const USE_OPENAI = process.env.USE_OPENAI === "true"
const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-4o"
const OPENAI_BASE_URL = process.env.OPENAI_BASE_URL
const openai = new OpenAI({
  baseURL: OPENAI_BASE_URL,
  apiKey: process.env.OPENAI_API_KEY || "dummy",
})

const USE_BEDROCK = process.env.USE_BEDROCK === "true"
const BEDROCK_REGION = process.env.AWS_REGION || "us-east-1"
const BEDROCK_MODEL = process.env.BEDROCK_MODEL_ID || "us.anthropic.claude-sonnet-4-6-20251101-v1:0"
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

// ── Bedrock helpers ──────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toBedrockTools(tools: Anthropic.Tool[]): any[] {
  return tools.map(t => ({
    toolSpec: {
      name: t.name,
      description: t.description,
      inputSchema: { json: t.input_schema }
    }
  }))
}

type AnthropicMessage = { role: "user" | "assistant"; content: Anthropic.ContentBlockParam[] | string }

function toBedrockMessages(messages: AnthropicMessage[]): BedrockMessage[] {
  return messages.map(m => {
    const content = typeof m.content === "string"
      ? [{ text: m.content } as BedrockContentBlock]
      : (m.content as Anthropic.ContentBlockParam[]).map((b): BedrockContentBlock => {
          if ("type" in b && b.type === "tool_use") {
            const tu = b as Anthropic.ToolUseBlockParam
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            return { toolUse: { toolUseId: tu.id, name: tu.name, input: tu.input as any } }
          }
          if ("type" in b && b.type === "tool_result") {
            const tr = b as Anthropic.ToolResultBlockParam
            return {
              toolResult: {
                toolUseId: tr.tool_use_id,
                content: [{ text: typeof tr.content === "string" ? tr.content : JSON.stringify(tr.content) }]
              }
            }
          }
          if ("type" in b && b.type === "text") {
            return { text: (b as Anthropic.TextBlockParam).text }
          }
          return { text: JSON.stringify(b) }
        })
    return { role: m.role, content } as BedrockMessage
  })
}

function fromBedrockContent(content: BedrockContentBlock[]): Anthropic.ContentBlock[] {
  return content.map(b => {
    if (b.toolUse) {
      return {
        type: "tool_use" as const,
        id: b.toolUse.toolUseId ?? "",
        name: b.toolUse.name ?? "",
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        input: (b.toolUse.input ?? {}) as any
      }
    }
    return { type: "text" as const, text: b.text ?? "" }
  }) as Anthropic.ContentBlock[]
}

// ── Agent loops ──────────────────────────────────────────────────────────────

async function runWithAnthropic(
  config: MCPConfig,
  mcpClient: Client,
  allTools: Anthropic.Tool[],
  onComponent: (event: ComponentEvent) => void
): Promise<void> {
  const messages: Anthropic.MessageParam[] = [
    { role: "user", content: "Build a dashboard from the available data." }
  ]
  const system = `You are connected to "${config.name}". Fetch and summarize the available data and render it as a dashboard using the render_* tools. Call render tools as you gather data — do not wait until the end.`

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
        onComponent({ tool: block.name, props: block.input as Record<string, unknown> })
        toolResults.push({ type: "tool_result", tool_use_id: block.id, content: "Rendered successfully." })
      } else {
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
  allTools: Anthropic.Tool[],
  onComponent: (event: ComponentEvent) => void
): Promise<void> {
  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    { role: "system", content: `You are connected to "${config.name}". Fetch and summarize the available data and render it as a dashboard using the render_* tools. Call render tools as you gather data — do not wait until the end.` },
    { role: "user", content: "Build a dashboard from the available data." }
  ]
  const openAITools = toOpenAITools(allTools)

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
        onComponent({ tool: toolName, props: args })
        resultContent = "Rendered successfully."
      } else {
        try {
          resultContent = await callMCPTool(mcpClient, toolName, args)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

async function runWithBedrock(
  config: MCPConfig,
  mcpClient: Client,
  allTools: Anthropic.Tool[],
  onComponent: (event: ComponentEvent) => void
): Promise<void> {
  const bedrock = new BedrockRuntimeClient({ region: BEDROCK_REGION })
  const messages: AnthropicMessage[] = [
    { role: "user", content: "Build a dashboard from the available data." }
  ]
  const system = `You are connected to "${config.name}". Fetch and summarize the available data and render it as a dashboard using the render_* tools. Call render tools as you gather data — do not wait until the end.`

  while (true) {
    const response = await bedrock.send(new ConverseCommand({
      modelId: BEDROCK_MODEL,
      system: [{ text: system }],
      messages: toBedrockMessages(messages),
      toolConfig: { tools: toBedrockTools(allTools) },
      inferenceConfig: { maxTokens: 4096 }
    }))

    const assistantContent = fromBedrockContent(response.output?.message?.content ?? [])
    messages.push({ role: "assistant", content: assistantContent as Anthropic.ContentBlockParam[] })

    if (response.stopReason === "end_turn") break

    const toolResults: Anthropic.ToolResultBlockParam[] = []
    for (const block of assistantContent) {
      if (block.type !== "tool_use") continue
      if (isDashboardTool(block.name)) {
        onComponent({ tool: block.name, props: block.input as Record<string, unknown> })
        toolResults.push({ type: "tool_result", tool_use_id: block.id, content: "Rendered successfully." })
      } else {
        const result = await callMCPTool(mcpClient, block.name, block.input as Record<string, unknown>)
        toolResults.push({ type: "tool_result", tool_use_id: block.id, content: result })
      }
    }
    if (toolResults.length > 0) messages.push({ role: "user", content: toolResults })
  }
}

// ── Public API ───────────────────────────────────────────────────────────────

export async function runDashboardAgent(
  config: MCPConfig,
  onComponent: (event: ComponentEvent) => void
): Promise<void> {
  let mcpClient: Client | null = null
  try {
    mcpClient = await createMCPClient(config)
    const mcpToolDefs = await listMCPTools(mcpClient)
    const allTools = [...buildMCPTools(mcpToolDefs), ...DASHBOARD_TOOLS]

    if (USE_OPENAI) {
      await runWithOpenAI(config, mcpClient, allTools, onComponent)
    } else if (USE_BEDROCK) {
      await runWithBedrock(config, mcpClient, allTools, onComponent)
    } else {
      await runWithAnthropic(config, mcpClient, allTools, onComponent)
    }
  } finally {
    if (mcpClient) await mcpClient.close()
  }
}
