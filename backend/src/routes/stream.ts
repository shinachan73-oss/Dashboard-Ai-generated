import { Router } from "express"
import { getConfig, updateStatus } from "../db/mcpConfigs"
import { runDashboardAgent } from "../agent/runner"
import { ComponentEvent } from "../types"

const router = Router()

router.get("/:id/stream", (req, res) => {
  const config = getConfig(req.params.id)
  if (!config) {
    res.status(404).json({ error: "Not found" })
    return
  }

  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
    "Access-Control-Allow-Origin": "*"
  })

  const send = (event: string, data: unknown) => {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
  }

  updateStatus(config.id, "connected")

  runDashboardAgent(config, (event: ComponentEvent) => {
    send("component", event)
  })
    .then(() => {
      send("done", {})
      res.end()
    })
    .catch((err: Error) => {
      console.error("Agent Error:", err)
      updateStatus(config.id, "error")
      send("error", { message: err.message })
      res.end()
    })

  req.on("close", () => {})
})

router.get("/:id/sync", (req, res) => {
  const config = getConfig(req.params.id)
  if (!config) {
    res.status(404).json({ error: "Not found" })
    return
  }

  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
    "Access-Control-Allow-Origin": "*"
  })

  const send = (event: string, data: unknown) => {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
  }

  // isSync = true
  runDashboardAgent(config, (event: ComponentEvent) => {
    send("component", event)
  }, true)
    .then(() => {
      send("done", {})
      res.end()
    })
    .catch((err: Error) => {
      console.error("Sync Error:", err)
      send("error", { message: err.message })
      res.end()
    })

  req.on("close", () => {})
})

export default router
