import express from "express"
import cors from "cors"
import mcpRouter from "./routes/mcp"
import streamRouter from "./routes/stream"

const app = express()
// TODO: restrict CORS origins before adding auth
app.use(cors())
app.use(express.json())

app.get("/health", (_req, res) => res.json({ ok: true }))
app.use("/api/mcp", mcpRouter)
app.use("/api/mcp", streamRouter)

const PORT = process.env.PORT || 3001
if (require.main === module) {
  app.listen(PORT, () => console.log(`Backend listening on port ${PORT}`))
}

export { app }
