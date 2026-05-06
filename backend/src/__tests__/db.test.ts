process.env.DB_PATH = ":memory:"

import { saveConfig, listConfigs, getConfig, updateStatus, deleteConfig } from "../db/mcpConfigs"
import { MCPConfig } from "../types"

const mockConfig: MCPConfig = {
  id: "test-id-1",
  name: "Test MCP",
  url: "http://localhost:9000/sse",
  auth: { type: "none" },
  status: "disconnected",
  createdAt: new Date().toISOString()
}

test("saveConfig then getConfig returns matching record", () => {
  saveConfig(mockConfig)
  const result = getConfig("test-id-1")
  expect(result).toMatchObject({ id: "test-id-1", name: "Test MCP", url: "http://localhost:9000/sse" })
})

test("listConfigs includes saved config", () => {
  saveConfig(mockConfig)
  const list = listConfigs()
  expect(list.some(c => c.id === "test-id-1")).toBe(true)
})

test("updateStatus changes the status field", () => {
  saveConfig(mockConfig)
  updateStatus("test-id-1", "connected")
  expect(getConfig("test-id-1")?.status).toBe("connected")
})

test("deleteConfig removes the record", () => {
  saveConfig(mockConfig)
  deleteConfig("test-id-1")
  expect(getConfig("test-id-1")).toBeNull()
})

test("getConfig returns null for unknown id", () => {
  expect(getConfig("nonexistent")).toBeNull()
})
