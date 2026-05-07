import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js"
import express from "express"
import { z } from "zod"

const PORT = parseInt(process.env.PORT ?? "9002")
const app = express()

const createServer = () => {
  const server = new McpServer({ name: "finance", version: "1.0.0" })
  
  server.tool("get_stock_price", "Get the current stock price", {
    symbol: z.string().describe("Stock symbol (e.g., AAPL)"),
  }, async ({ symbol }) => {
    const price = 150 + Math.random() * 50
    return {
      content: [{ type: "text", text: `The current price of ${symbol.toUpperCase()} is $${price.toFixed(2)}` }]
    }
  })

  server.tool("get_crypto_price", "Get the current crypto price", {
    symbol: z.string().describe("Crypto symbol (e.g., BTC)"),
  }, async ({ symbol }) => {
    const price = 40000 + Math.random() * 20000
    return {
      content: [{ type: "text", text: `The current price of ${symbol.toUpperCase()} is $${price.toFixed(2)}` }]
    }
  })
  
  return server
}

const transports = new Map<string, { server: McpServer; transport: SSEServerTransport }>()

app.get("/sse", async (req, res) => {
  const server = createServer()
  const transport = new SSEServerTransport("/message", res)
  transports.set(transport.sessionId, { server, transport })
  res.on("close", () => transports.delete(transport.sessionId))
  await server.connect(transport)
})

app.post("/message", async (req, res) => {
  const sessionId = req.query.sessionId as string
  const entry = transports.get(sessionId)
  if (!entry) {
    console.error(`Session not found: ${sessionId}`)
    res.status(404).send("Session not found")
    return
  }
  try {
    await entry.transport.handlePostMessage(req, res)
  } catch (err) {
    console.error(`POST error for session ${sessionId}:`, err)
    res.status(500).send("Internal server error")
  }
})

app.listen(PORT, () => {
  console.log(`Finance MCP server running at http://localhost:${PORT}/sse`)
  console.log(`Tools: get_stock_price, get_crypto_price`)
})
