import { Router } from "express"
import { v4 as uuidv4 } from "uuid"
import { saveConfig, listConfigs, getConfig, deleteConfig, updateStatus } from "../db/mcpConfigs"
import { MCPConfig, ComponentEvent, ChatMessage } from "../types"
import { createMCPClient, callMCPTool } from "../agent/mcpClient"
import { runChatAgent } from "../agent/runner"
import OpenAI from "openai"

const router = Router()

const openai = new OpenAI({
  baseURL: process.env.OPENAI_BASE_URL,
  apiKey: process.env.OPENAI_API_KEY || "dummy",
})

router.post("/", (req, res) => {
  const { name, url, auth } = req.body as Pick<MCPConfig, "name" | "url" | "auth">

  if (!name || !url || !auth) {
    res.status(400).json({ error: "name, url, and auth are required" })
    return
  }

  const config: MCPConfig = {
    id: uuidv4(),
    name,
    url,
    auth,
    status: "disconnected",
    createdAt: new Date().toISOString()
  }

  saveConfig(config)
  res.status(201).json(config)
})

router.get("/", (_req, res) => {
  res.json(listConfigs())
})

router.delete("/:id", (req, res) => {
  const config = getConfig(req.params.id)
  if (!config) {
    res.status(404).json({ error: "Not found" })
    return
  }
  deleteConfig(req.params.id)
  res.status(204).send()
})

// SUPER TURBO SYNC: Batch update all components in a single AI round-trip
router.post("/:id/sync", async (req, res) => {
  const config = getConfig(req.params.id)
  if (!config) {
    res.status(404).json({ error: "Not found" })
    return
  }

  const { components } = req.body as { components: ComponentEvent[] }
  if (!components || !Array.isArray(components)) {
    res.status(400).json({ error: "components array is required" })
    return
  }

  let mcpClient: any = null
  try {
    updateStatus(config.id, "connected")
    mcpClient = await createMCPClient(config)
    
    // 1. Fetch all data in parallel (Direct & Fast)
    const dataResults = await Promise.all(components.map(async (comp, index) => {
      if (!comp.dataContext) return null
      try {
        const result = await callMCPTool(mcpClient, comp.dataContext.toolName, comp.dataContext.arguments)
        return { index, toolName: comp.dataContext.toolName, result }
      } catch (e) {
        return null
      }
    }))

    const validResults = dataResults.filter(r => r !== null)
    if (validResults.length === 0) {
      res.json(components)
      return
    }

    // 2. Batch mapping in a SINGLE OpenAI call (Extremely fast)
    const response = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || "gpt-4o",
      messages: [
        { 
          role: "system", 
          content: "You are a batch data mapper. You will receive a list of components and their corresponding fresh tool results. Update the 'props' of each component with the new data. Keep layout/titles identical. Return the FULL updated components array as JSON." 
        },
        { 
          role: "user", 
          content: JSON.stringify({
            components,
            newData: validResults
          }) 
        }
      ],
      response_format: { type: "json_object" }
    })

    const resultBody = JSON.parse(response.choices[0].message.content || "{}")
    const updatedComponents = resultBody.components || resultBody.updatedComponents || resultBody

    res.json(Array.isArray(updatedComponents) ? updatedComponents : components)
  } catch (error) {
    console.error("Super Turbo Sync Error:", error)
    res.status(500).json({ error: "Sync failed" })
  } finally {
    if (mcpClient) await mcpClient.close()
  }
})

router.post("/:id/chat", async (req, res) => {
  const config = getConfig(req.params.id)
  if (!config) {
    res.status(404).json({ error: "Not found" })
    return
  }

  const { messages, dashboardContext } = req.body as { messages: ChatMessage[], dashboardContext: string }
  
  try {
    updateStatus(config.id, "connected")
    const response = await runChatAgent(config, messages, dashboardContext)
    res.json({ content: response })
  } catch (error: any) {
    console.error("Chat Error:", error)
    res.status(500).json({ error: error.message || "Chat failed" })
  }
})

export default router
