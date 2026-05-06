process.env.DB_PATH = ":memory:"

import request from "supertest"
import express from "express"
import cors from "cors"
import mcpRouter from "../routes/mcp"

const app = express()
app.use(cors())
app.use(express.json())
app.use("/api/mcp", mcpRouter)

test("POST /api/mcp creates a config and returns id", async () => {
  const res = await request(app).post("/api/mcp").send({
    name: "Test MCP",
    url: "http://localhost:9000/sse",
    auth: { type: "none" }
  })
  expect(res.status).toBe(201)
  expect(res.body.id).toBeTruthy()
  expect(res.body.name).toBe("Test MCP")
  expect(res.body.status).toBe("disconnected")
})

test("GET /api/mcp returns list of configs", async () => {
  await request(app).post("/api/mcp").send({
    name: "List MCP",
    url: "http://localhost:9001/sse",
    auth: { type: "none" }
  })
  const res = await request(app).get("/api/mcp")
  expect(res.status).toBe(200)
  expect(Array.isArray(res.body)).toBe(true)
  expect(res.body.some((c: any) => c.name === "List MCP")).toBe(true)
})

test("DELETE /api/mcp/:id removes the config", async () => {
  const create = await request(app).post("/api/mcp").send({
    name: "Delete MCP",
    url: "http://localhost:9002/sse",
    auth: { type: "none" }
  })
  const { id } = create.body
  const del = await request(app).delete(`/api/mcp/${id}`)
  expect(del.status).toBe(204)
  const list = await request(app).get("/api/mcp")
  expect(list.body.some((c: any) => c.id === id)).toBe(false)
})

test("DELETE /api/mcp/:id returns 404 for unknown id", async () => {
  const res = await request(app).delete("/api/mcp/nonexistent-id")
  expect(res.status).toBe(404)
})
