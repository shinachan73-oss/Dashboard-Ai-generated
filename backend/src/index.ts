import express from "express"
import cors from "cors"

const app = express()
app.use(cors()) // TODO: restrict CORS origins before adding auth
app.use(express.json())

app.get("/health", (_req, res) => res.json({ ok: true }))

const PORT = process.env.PORT || 3001
if (require.main === module) {
  app.listen(PORT, () => console.log(`Backend listening on port ${PORT}`))
}

export { app }
