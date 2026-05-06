import { Router } from "express"
import { v4 as uuidv4 } from "uuid"
import { saveConfig, listConfigs, getConfig, deleteConfig } from "../db/mcpConfigs"
import { MCPConfig } from "../types"

const router = Router()

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

export default router
