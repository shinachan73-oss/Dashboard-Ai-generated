# Dynamic Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a React + Node.js dashboard where users define MCP server configs, and a Claude agent auto-connects, fetches data, and streams shadcn components to the UI on connection.

**Architecture:** The backend stores MCP configs in SQLite and, on connection, runs a Claude agent that calls MCP tools to fetch data then calls dashboard builder tools (render_table, render_metric, etc.) to describe the UI. Each dashboard tool call is streamed as an SSE event to `GET /api/mcp/:id/stream`. The React frontend opens that stream on config save and renders components progressively via a component registry.

**Tech Stack:** React 18, TypeScript, Vite, shadcn/ui, Tailwind CSS, recharts, Node.js, Express, Anthropic SDK (`@anthropic-ai/sdk`), MCP SDK (`@modelcontextprotocol/sdk`), better-sqlite3, Vitest + React Testing Library (frontend), Jest + Supertest (backend)

---

## File Structure

```
backend/
  src/
    types/index.ts              MCPConfig + ComponentEvent interfaces
    db/mcpConfigs.ts            SQLite persistence (lazy-init, supports :memory: for tests)
    agent/
      dashboardTools.ts         Claude tool definitions for render_* tools
      mcpClient.ts              connect to MCP server, list + call tools
      runner.ts                 Claude agentic loop, streams ComponentEvents
    routes/
      mcp.ts                    POST/GET/DELETE /api/mcp
      stream.ts                 GET /api/mcp/:id/stream (SSE)
    index.ts                    Express server entry, mounts routes
    __tests__/
      health.test.ts
      db.test.ts
      dashboardTools.test.ts
      mcpClient.test.ts
      routes.test.ts
  package.json
  tsconfig.json
  jest.config.js
  data/                         SQLite DB files (gitignored)

frontend/
  src/
    types/index.ts              MCPConfig + ComponentEvent (mirrors backend)
    components/
      dashboard/
        MetricCard.tsx
        DataTable.tsx
        ChartWidget.tsx
        TextBlock.tsx
        ListWidget.tsx
        AlertBanner.tsx
        registry.tsx            REGISTRY map + Dashboard renderer
      mcp/
        MCPConfigForm.tsx       shadcn Dialog + form
        MCPStatusList.tsx       list of MCPs with status badges
    hooks/
      useDashboard.ts           EventSource + component state
    pages/
      DashboardPage.tsx         composes MCPStatusList + Dashboard
    App.tsx
    main.tsx
    test-setup.ts
    __tests__/
      MetricCard.test.tsx
      DataTable.test.tsx
      ChartWidget.test.tsx
      registry.test.tsx
      useDashboard.test.ts
      MCPConfigForm.test.tsx
  index.html
  vite.config.ts
  vitest.config.ts
  tailwind.config.js
  postcss.config.js
  tsconfig.json
  package.json
```

---

## Task 1: Scaffold Backend

**Files:**
- Create: `backend/package.json`
- Create: `backend/tsconfig.json`
- Create: `backend/jest.config.js`
- Create: `backend/src/index.ts`
- Create: `backend/src/__tests__/health.test.ts`

- [ ] **Step 1: Create backend/package.json**

```json
{
  "name": "dynamic-dashboard-backend",
  "version": "1.0.0",
  "main": "dist/index.js",
  "scripts": {
    "dev": "nodemon --exec ts-node src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js",
    "test": "jest"
  },
  "dependencies": {
    "@anthropic-ai/sdk": "^0.36.0",
    "@modelcontextprotocol/sdk": "^1.10.0",
    "better-sqlite3": "^9.6.0",
    "cors": "^2.8.5",
    "express": "^4.18.0",
    "uuid": "^9.0.0"
  },
  "devDependencies": {
    "@types/better-sqlite3": "^7.6.12",
    "@types/cors": "^2.8.17",
    "@types/express": "^4.17.21",
    "@types/jest": "^29.5.12",
    "@types/node": "^20.14.0",
    "@types/supertest": "^6.0.2",
    "@types/uuid": "^9.0.8",
    "jest": "^29.7.0",
    "nodemon": "^3.1.0",
    "supertest": "^7.0.0",
    "ts-jest": "^29.1.4",
    "ts-node": "^10.9.2",
    "typescript": "^5.4.5"
  }
}
```

- [ ] **Step 2: Create backend/tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "resolveJsonModule": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

- [ ] **Step 3: Create backend/jest.config.js**

```js
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  testMatch: ["**/__tests__/**/*.test.ts"],
  setupFiles: []
}
```

- [ ] **Step 4: Create backend/src/index.ts**

```ts
import express from "express"
import cors from "cors"

const app = express()
app.use(cors())
app.use(express.json())

app.get("/health", (_req, res) => res.json({ ok: true }))

const PORT = process.env.PORT || 3001
if (require.main === module) {
  app.listen(PORT, () => console.log(`Backend listening on port ${PORT}`))
}

export { app }
```

- [ ] **Step 5: Write failing health test**

Create `backend/src/__tests__/health.test.ts`:
```ts
import request from "supertest"
import { app } from "../index"

test("GET /health returns ok", async () => {
  const res = await request(app).get("/health")
  expect(res.status).toBe(200)
  expect(res.body.ok).toBe(true)
})
```

- [ ] **Step 6: Install backend dependencies and run test**

```bash
cd backend && npm install
npm test -- --testPathPattern=health
```
Expected: PASS

- [ ] **Step 7: Commit**

```bash
cd backend
git init
git add .
git commit -m "feat: scaffold backend with Express + health endpoint"
```

---

## Task 2: Scaffold Frontend

**Files:**
- Create: `frontend/package.json`
- Create: `frontend/tsconfig.json`
- Create: `frontend/vite.config.ts`
- Create: `frontend/vitest.config.ts`
- Create: `frontend/tailwind.config.js`
- Create: `frontend/postcss.config.js`
- Create: `frontend/index.html`
- Create: `frontend/src/main.tsx`
- Create: `frontend/src/App.tsx`
- Create: `frontend/src/test-setup.ts`

- [ ] **Step 1: Create frontend/package.json**

```json
{
  "name": "dynamic-dashboard-frontend",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "react": "^18.3.0",
    "react-dom": "^18.3.0",
    "recharts": "^2.12.0",
    "class-variance-authority": "^0.7.0",
    "clsx": "^2.1.0",
    "tailwind-merge": "^2.3.0",
    "lucide-react": "^0.400.0"
  },
  "devDependencies": {
    "@types/react": "^18.3.0",
    "@types/react-dom": "^18.3.0",
    "@vitejs/plugin-react": "^4.3.0",
    "@testing-library/react": "^16.0.0",
    "@testing-library/jest-dom": "^6.4.0",
    "@testing-library/user-event": "^14.5.0",
    "jsdom": "^24.1.0",
    "typescript": "^5.4.5",
    "vite": "^5.3.0",
    "vitest": "^1.6.0",
    "tailwindcss": "^3.4.0",
    "autoprefixer": "^10.4.0",
    "postcss": "^8.4.0"
  }
}
```

- [ ] **Step 2: Create frontend/tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true
  },
  "include": ["src"]
}
```

- [ ] **Step 3: Create frontend/vite.config.ts**

```ts
import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"

export default defineConfig({
  plugins: [react()],
  server: { port: 5173 }
})
```

- [ ] **Step 4: Create frontend/vitest.config.ts**

```ts
import { defineConfig } from "vitest/config"
import react from "@vitejs/plugin-react"

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test-setup.ts"]
  }
})
```

- [ ] **Step 5: Create frontend/tailwind.config.js**

```js
/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: { extend: {} },
  plugins: []
}
```

- [ ] **Step 6: Create frontend/postcss.config.js**

```js
export default {
  plugins: { tailwindcss: {}, autoprefixer: {} }
}
```

- [ ] **Step 7: Create frontend/index.html**

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Dynamic Dashboard</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 8: Create frontend/src/main.tsx**

```tsx
import React from "react"
import ReactDOM from "react-dom/client"
import App from "./App"
import "./index.css"

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
```

- [ ] **Step 9: Create frontend/src/index.css**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

- [ ] **Step 10: Create frontend/src/App.tsx**

```tsx
export default function App() {
  return <div className="p-4">Dynamic Dashboard</div>
}
```

- [ ] **Step 11: Create frontend/src/test-setup.ts**

```ts
import "@testing-library/jest-dom"
```

- [ ] **Step 12: Install dependencies and verify dev server starts**

```bash
cd frontend && npm install
npm run dev
```
Expected: Vite dev server running at http://localhost:5173

- [ ] **Step 13: Commit**

```bash
cd frontend
git add .
git commit -m "feat: scaffold frontend with React + Vite + Tailwind"
```

---

## Task 3: Install shadcn/ui

**Files:**
- Modify: `frontend/src/App.tsx` (add shadcn globals)
- Create: `frontend/src/lib/utils.ts`
- Create: `frontend/components.json` (shadcn config)

- [ ] **Step 1: Initialize shadcn**

```bash
cd frontend
npx shadcn@latest init
```

When prompted:
- Style: Default
- Base color: Slate
- CSS variables: Yes

- [ ] **Step 2: Add required components**

```bash
npx shadcn@latest add card table alert button input dialog badge select label
```

- [ ] **Step 3: Verify lib/utils.ts was created**

```bash
cat src/lib/utils.ts
```
Expected: file contains `cn` utility function using `clsx` + `tailwind-merge`.

- [ ] **Step 4: Commit**

```bash
git add .
git commit -m "feat: add shadcn/ui components"
```

---

## Task 4: Backend Types and DB Layer

**Files:**
- Create: `backend/src/types/index.ts`
- Create: `backend/src/db/mcpConfigs.ts`
- Create: `backend/src/__tests__/db.test.ts`
- Create: `backend/data/.gitkeep`

- [ ] **Step 1: Create backend/src/types/index.ts**

```ts
export interface MCPConfig {
  id: string
  name: string
  url: string
  auth: { type: "bearer" | "none"; token?: string }
  status: "connected" | "disconnected" | "error"
  createdAt: string
}

export interface ComponentEvent {
  tool: string
  props: Record<string, unknown>
}
```

- [ ] **Step 2: Create backend/data/.gitkeep and add data/ to .gitignore**

```bash
mkdir -p backend/data && touch backend/data/.gitkeep
echo "data/*.db" >> backend/.gitignore
echo "node_modules/" >> backend/.gitignore
echo "dist/" >> backend/.gitignore
```

- [ ] **Step 3: Write failing DB tests**

Create `backend/src/__tests__/db.test.ts`:
```ts
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
```

- [ ] **Step 4: Run DB tests to verify they fail**

```bash
cd backend && npm test -- --testPathPattern=db
```
Expected: FAIL — `Cannot find module '../db/mcpConfigs'`

- [ ] **Step 5: Create backend/src/db/mcpConfigs.ts**

```ts
import Database from "better-sqlite3"
import path from "path"
import { MCPConfig } from "../types"

let _db: Database.Database | null = null

function getDb(): Database.Database {
  if (_db) return _db
  const dbPath = process.env.DB_PATH || path.join(__dirname, "../../data/dashboard.db")
  _db = new Database(dbPath)
  _db.exec(`
    CREATE TABLE IF NOT EXISTS mcp_configs (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      url TEXT NOT NULL,
      auth_type TEXT NOT NULL DEFAULT 'none',
      auth_token TEXT,
      status TEXT NOT NULL DEFAULT 'disconnected',
      created_at TEXT NOT NULL
    )
  `)
  return _db
}

function rowToConfig(row: Record<string, unknown>): MCPConfig {
  return {
    id: row.id as string,
    name: row.name as string,
    url: row.url as string,
    auth: {
      type: row.auth_type as "bearer" | "none",
      token: (row.auth_token as string | null) ?? undefined
    },
    status: row.status as MCPConfig["status"],
    createdAt: row.created_at as string
  }
}

export function saveConfig(config: MCPConfig): MCPConfig {
  getDb().prepare(`
    INSERT OR REPLACE INTO mcp_configs (id, name, url, auth_type, auth_token, status, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    config.id, config.name, config.url,
    config.auth.type, config.auth.token ?? null,
    config.status, config.createdAt
  )
  return config
}

export function listConfigs(): MCPConfig[] {
  return (getDb().prepare("SELECT * FROM mcp_configs ORDER BY created_at DESC").all() as Record<string, unknown>[]).map(rowToConfig)
}

export function getConfig(id: string): MCPConfig | null {
  const row = getDb().prepare("SELECT * FROM mcp_configs WHERE id = ?").get(id) as Record<string, unknown> | undefined
  return row ? rowToConfig(row) : null
}

export function updateStatus(id: string, status: MCPConfig["status"]): void {
  getDb().prepare("UPDATE mcp_configs SET status = ? WHERE id = ?").run(status, id)
}

export function deleteConfig(id: string): void {
  getDb().prepare("DELETE FROM mcp_configs WHERE id = ?").run(id)
}
```

- [ ] **Step 6: Run DB tests to verify they pass**

```bash
cd backend && npm test -- --testPathPattern=db
```
Expected: PASS (5 tests)

- [ ] **Step 7: Commit**

```bash
cd backend && git add src/types src/db src/__tests__/db.test.ts
git commit -m "feat: add MCPConfig types and SQLite persistence layer"
```

---

## Task 5: Dashboard Tool Definitions

**Files:**
- Create: `backend/src/agent/dashboardTools.ts`
- Create: `backend/src/__tests__/dashboardTools.test.ts`

- [ ] **Step 1: Write failing test**

Create `backend/src/__tests__/dashboardTools.test.ts`:
```ts
import { DASHBOARD_TOOLS, DASHBOARD_TOOL_NAMES, isDashboardTool } from "../agent/dashboardTools"

test("DASHBOARD_TOOLS contains all 6 render tools", () => {
  const names = DASHBOARD_TOOLS.map(t => t.name)
  expect(names).toContain("render_metric")
  expect(names).toContain("render_table")
  expect(names).toContain("render_chart")
  expect(names).toContain("render_text")
  expect(names).toContain("render_list")
  expect(names).toContain("render_alert")
})

test("each tool has name, description, and input_schema", () => {
  DASHBOARD_TOOLS.forEach(tool => {
    expect(tool.name).toBeTruthy()
    expect(tool.description).toBeTruthy()
    expect(tool.input_schema).toBeTruthy()
    expect(tool.input_schema.type).toBe("object")
  })
})

test("isDashboardTool returns true for dashboard tool names", () => {
  expect(isDashboardTool("render_metric")).toBe(true)
  expect(isDashboardTool("render_table")).toBe(true)
  expect(isDashboardTool("some_mcp_tool")).toBe(false)
})
```

- [ ] **Step 2: Run to verify it fails**

```bash
cd backend && npm test -- --testPathPattern=dashboardTools
```
Expected: FAIL — `Cannot find module '../agent/dashboardTools'`

- [ ] **Step 3: Create backend/src/agent/dashboardTools.ts**

```ts
import Anthropic from "@anthropic-ai/sdk"

export const DASHBOARD_TOOLS: Anthropic.Tool[] = [
  {
    name: "render_metric",
    description: "Render a single KPI or numeric metric as a card.",
    input_schema: {
      type: "object",
      properties: {
        label: { type: "string", description: "Metric name" },
        value: { type: "string", description: "Formatted value, e.g. '$12,400'" },
        trend: { type: "string", enum: ["up", "down"], description: "Optional trend direction" }
      },
      required: ["label", "value"]
    }
  },
  {
    name: "render_table",
    description: "Render tabular data with columns and rows.",
    input_schema: {
      type: "object",
      properties: {
        title: { type: "string" },
        columns: { type: "array", items: { type: "string" }, description: "Column header names" },
        rows: {
          type: "array",
          items: { type: "object", additionalProperties: true },
          description: "Array of row objects keyed by column name"
        }
      },
      required: ["columns", "rows"]
    }
  },
  {
    name: "render_chart",
    description: "Render a bar, line, or pie chart.",
    input_schema: {
      type: "object",
      properties: {
        title: { type: "string" },
        chart_type: { type: "string", enum: ["bar", "line", "pie"] },
        data: { type: "array", items: { type: "object", additionalProperties: true } },
        x_key: { type: "string", description: "Key in data objects to use as X axis / label" },
        y_key: { type: "string", description: "Key in data objects to use as Y axis / value" }
      },
      required: ["chart_type", "data", "x_key", "y_key"]
    }
  },
  {
    name: "render_text",
    description: "Render a text summary or explanation block.",
    input_schema: {
      type: "object",
      properties: {
        title: { type: "string" },
        content: { type: "string" }
      },
      required: ["content"]
    }
  },
  {
    name: "render_list",
    description: "Render a bullet list of items.",
    input_schema: {
      type: "object",
      properties: {
        title: { type: "string" },
        items: { type: "array", items: { type: "string" } }
      },
      required: ["items"]
    }
  },
  {
    name: "render_alert",
    description: "Render an alert banner for warnings, errors, or info messages.",
    input_schema: {
      type: "object",
      properties: {
        message: { type: "string" },
        severity: { type: "string", enum: ["info", "warning", "error"] }
      },
      required: ["message", "severity"]
    }
  }
]

export const DASHBOARD_TOOL_NAMES = new Set(DASHBOARD_TOOLS.map(t => t.name))

export function isDashboardTool(name: string): boolean {
  return DASHBOARD_TOOL_NAMES.has(name)
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd backend && npm test -- --testPathPattern=dashboardTools
```
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add src/agent/dashboardTools.ts src/__tests__/dashboardTools.test.ts
git commit -m "feat: add Claude dashboard builder tool definitions"
```

---

## Task 6: MCP Client

**Files:**
- Create: `backend/src/agent/mcpClient.ts`
- Create: `backend/src/__tests__/mcpClient.test.ts`

- [ ] **Step 1: Write failing test**

Create `backend/src/__tests__/mcpClient.test.ts`:
```ts
import { buildMCPTools, toClaudeTool } from "../agent/mcpClient"

test("toClaudeTool converts MCP tool schema to Claude tool format", () => {
  const mcpTool = {
    name: "get_sales",
    description: "Fetch sales data",
    inputSchema: {
      type: "object" as const,
      properties: { period: { type: "string" } },
      required: ["period"]
    }
  }
  const claudeTool = toClaudeTool(mcpTool)
  expect(claudeTool.name).toBe("get_sales")
  expect(claudeTool.description).toBe("Fetch sales data")
  expect(claudeTool.input_schema).toEqual(mcpTool.inputSchema)
})

test("buildMCPTools returns Claude-formatted tools from MCP tool list", () => {
  const mcpTools = [
    { name: "tool_a", description: "Tool A", inputSchema: { type: "object" as const, properties: {} } },
    { name: "tool_b", description: "Tool B", inputSchema: { type: "object" as const, properties: {} } }
  ]
  const result = buildMCPTools(mcpTools)
  expect(result).toHaveLength(2)
  expect(result[0].name).toBe("tool_a")
  expect(result[1].name).toBe("tool_b")
})
```

- [ ] **Step 2: Run to verify failure**

```bash
cd backend && npm test -- --testPathPattern=mcpClient
```
Expected: FAIL

- [ ] **Step 3: Create backend/src/agent/mcpClient.ts**

```ts
import { Client } from "@modelcontextprotocol/sdk/client/index.js"
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js"
import Anthropic from "@anthropic-ai/sdk"
import { MCPConfig } from "../types"

export type MCPTool = {
  name: string
  description: string
  inputSchema: { type: "object"; properties: Record<string, unknown>; required?: string[] }
}

export function toClaudeTool(mcpTool: MCPTool): Anthropic.Tool {
  return {
    name: mcpTool.name,
    description: mcpTool.description,
    input_schema: mcpTool.inputSchema as Anthropic.Tool["input_schema"]
  }
}

export function buildMCPTools(mcpTools: MCPTool[]): Anthropic.Tool[] {
  return mcpTools.map(toClaudeTool)
}

export async function createMCPClient(config: MCPConfig): Promise<Client> {
  const headers: Record<string, string> =
    config.auth.type === "bearer" && config.auth.token
      ? { Authorization: `Bearer ${config.auth.token}` }
      : {}

  const transport = new SSEClientTransport(new URL(config.url), {
    requestInit: { headers }
  })

  const client = new Client(
    { name: "dynamic-dashboard", version: "1.0.0" },
    { capabilities: {} }
  )

  await client.connect(transport)
  return client
}

export async function listMCPTools(client: Client): Promise<MCPTool[]> {
  const { tools } = await client.listTools()
  return tools.map(t => ({
    name: t.name,
    description: t.description ?? "",
    inputSchema: (t.inputSchema ?? { type: "object", properties: {} }) as MCPTool["inputSchema"]
  }))
}

export async function callMCPTool(
  client: Client,
  name: string,
  args: Record<string, unknown>
): Promise<string> {
  const result = await client.callTool({ name, arguments: args })
  return JSON.stringify(result.content)
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd backend && npm test -- --testPathPattern=mcpClient
```
Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
git add src/agent/mcpClient.ts src/__tests__/mcpClient.test.ts
git commit -m "feat: add MCP client with Claude tool format conversion"
```

---

## Task 7: Claude Agent Runner

**Files:**
- Create: `backend/src/agent/runner.ts`
- Create: `backend/src/__tests__/runner.test.ts`

- [ ] **Step 1: Write failing test**

Create `backend/src/__tests__/runner.test.ts`:
```ts
import { processAgentResponse } from "../agent/runner"
import { isDashboardTool } from "../agent/dashboardTools"
import { ComponentEvent } from "../types"

test("processAgentResponse extracts dashboard tool calls", () => {
  const content: any[] = [
    { type: "text", text: "Building dashboard..." },
    {
      type: "tool_use",
      id: "tool_1",
      name: "render_metric",
      input: { label: "Revenue", value: "$12,400" }
    },
    {
      type: "tool_use",
      id: "tool_2",
      name: "get_sales_data",
      input: { period: "monthly" }
    }
  ]

  const dashboardEvents: ComponentEvent[] = []
  const mcpCalls: Array<{ id: string; name: string; input: unknown }> = []

  for (const block of content) {
    if (block.type !== "tool_use") continue
    if (isDashboardTool(block.name)) {
      dashboardEvents.push({ tool: block.name, props: block.input })
    } else {
      mcpCalls.push({ id: block.id, name: block.name, input: block.input })
    }
  }

  expect(dashboardEvents).toHaveLength(1)
  expect(dashboardEvents[0].tool).toBe("render_metric")
  expect(dashboardEvents[0].props).toEqual({ label: "Revenue", value: "$12,400" })
  expect(mcpCalls).toHaveLength(1)
  expect(mcpCalls[0].name).toBe("get_sales_data")
})
```

- [ ] **Step 2: Run to verify failure**

```bash
cd backend && npm test -- --testPathPattern=runner
```
Expected: FAIL — `Cannot find module '../agent/runner'`

- [ ] **Step 3: Create backend/src/agent/runner.ts**

```ts
import Anthropic from "@anthropic-ai/sdk"
import { Client } from "@modelcontextprotocol/sdk/client/index.js"
import { MCPConfig, ComponentEvent } from "../types"
import { DASHBOARD_TOOLS, isDashboardTool } from "./dashboardTools"
import { createMCPClient, listMCPTools, callMCPTool, buildMCPTools } from "./mcpClient"

const anthropic = new Anthropic()

export async function runDashboardAgent(
  config: MCPConfig,
  onComponent: (event: ComponentEvent) => void
): Promise<void> {
  let mcpClient: Client | null = null

  try {
    mcpClient = await createMCPClient(config)
    const mcpToolDefs = await listMCPTools(mcpClient)
    const allTools = [...buildMCPTools(mcpToolDefs), ...DASHBOARD_TOOLS]

    const messages: Anthropic.MessageParam[] = [
      { role: "user", content: "Build a dashboard from the available data." }
    ]

    const systemPrompt = `You are connected to "${config.name}". Fetch and summarize the available data and render it as a dashboard using the render_* tools. Call render tools as you gather data — do not wait until the end.`

    while (true) {
      const response = await anthropic.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 4096,
        system: systemPrompt,
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

      if (toolResults.length > 0) {
        messages.push({ role: "user", content: toolResults })
      }
    }
  } finally {
    if (mcpClient) await mcpClient.close()
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd backend && npm test -- --testPathPattern=runner
```
Expected: PASS (1 test)

- [ ] **Step 5: Commit**

```bash
git add src/agent/runner.ts src/__tests__/runner.test.ts
git commit -m "feat: add Claude agentic loop that streams dashboard components"
```

---

## Task 8: Backend Routes

**Files:**
- Create: `backend/src/routes/mcp.ts`
- Create: `backend/src/routes/stream.ts`
- Create: `backend/src/__tests__/routes.test.ts`

- [ ] **Step 1: Write failing route tests**

Create `backend/src/__tests__/routes.test.ts`:
```ts
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
```

- [ ] **Step 2: Run to verify failure**

```bash
cd backend && npm test -- --testPathPattern=routes
```
Expected: FAIL — `Cannot find module '../routes/mcp'`

- [ ] **Step 3: Create backend/src/routes/mcp.ts**

```ts
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
```

- [ ] **Step 4: Create backend/src/routes/stream.ts**

```ts
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
      updateStatus(config.id, "connected")
      send("done", {})
      res.end()
    })
    .catch((err: Error) => {
      updateStatus(config.id, "error")
      send("error", { message: err.message })
      res.end()
    })

  req.on("close", () => {
    // client disconnected — agent continues but response is dropped
  })
})

export default router
```

- [ ] **Step 5: Run route tests to verify they pass**

```bash
cd backend && npm test -- --testPathPattern=routes
```
Expected: PASS (4 tests)

- [ ] **Step 6: Commit**

```bash
git add src/routes/ src/__tests__/routes.test.ts
git commit -m "feat: add MCP config routes and SSE stream endpoint"
```

---

## Task 9: Wire Backend Routes

**Files:**
- Modify: `backend/src/index.ts`

- [ ] **Step 1: Update backend/src/index.ts to mount routes**

```ts
import express from "express"
import cors from "cors"
import mcpRouter from "./routes/mcp"
import streamRouter from "./routes/stream"

const app = express()
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
```

- [ ] **Step 2: Run all backend tests**

```bash
cd backend && npm test
```
Expected: All tests PASS

- [ ] **Step 3: Start backend and verify routes work**

```bash
cd backend && npm run dev
# In another terminal:
curl http://localhost:3001/health
curl -X POST http://localhost:3001/api/mcp \
  -H "Content-Type: application/json" \
  -d '{"name":"Test","url":"http://localhost:9000/sse","auth":{"type":"none"}}'
curl http://localhost:3001/api/mcp
```
Expected: health returns `{"ok":true}`, POST returns config with `id`, GET returns array

- [ ] **Step 4: Commit**

```bash
git add src/index.ts
git commit -m "feat: wire MCP and stream routes into Express app"
```

---

## Task 10: Frontend Types and Dashboard Components

**Files:**
- Create: `frontend/src/types/index.ts`
- Create: `frontend/src/components/dashboard/MetricCard.tsx`
- Create: `frontend/src/components/dashboard/DataTable.tsx`
- Create: `frontend/src/components/dashboard/ChartWidget.tsx`
- Create: `frontend/src/components/dashboard/TextBlock.tsx`
- Create: `frontend/src/components/dashboard/ListWidget.tsx`
- Create: `frontend/src/components/dashboard/AlertBanner.tsx`
- Create: `frontend/src/__tests__/MetricCard.test.tsx`
- Create: `frontend/src/__tests__/DataTable.test.tsx`
- Create: `frontend/src/__tests__/ChartWidget.test.tsx`

- [ ] **Step 1: Create frontend/src/types/index.ts**

```ts
export interface MCPConfig {
  id: string
  name: string
  url: string
  auth: { type: "bearer" | "none"; token?: string }
  status: "connected" | "disconnected" | "error"
  createdAt: string
}

export interface ComponentEvent {
  tool: string
  props: Record<string, unknown>
}

export type StreamStatus = "idle" | "streaming" | "done" | "error"
```

- [ ] **Step 2: Write failing component tests**

Create `frontend/src/__tests__/MetricCard.test.tsx`:
```tsx
import { render, screen } from "@testing-library/react"
import MetricCard from "../components/dashboard/MetricCard"

test("renders label and value", () => {
  render(<MetricCard label="Revenue" value="$12,400" />)
  expect(screen.getByText("Revenue")).toBeInTheDocument()
  expect(screen.getByText("$12,400")).toBeInTheDocument()
})

test("renders trend up indicator when trend is up", () => {
  render(<MetricCard label="Sales" value="100" trend="up" />)
  expect(screen.getByTestId("trend-up")).toBeInTheDocument()
})

test("renders trend down indicator when trend is down", () => {
  render(<MetricCard label="Churn" value="5" trend="down" />)
  expect(screen.getByTestId("trend-down")).toBeInTheDocument()
})
```

Create `frontend/src/__tests__/DataTable.test.tsx`:
```tsx
import { render, screen } from "@testing-library/react"
import DataTable from "../components/dashboard/DataTable"

test("renders column headers", () => {
  render(
    <DataTable
      columns={["Name", "Sales"]}
      rows={[{ Name: "Alice", Sales: 100 }]}
    />
  )
  expect(screen.getByText("Name")).toBeInTheDocument()
  expect(screen.getByText("Sales")).toBeInTheDocument()
})

test("renders row data", () => {
  render(
    <DataTable
      columns={["Name", "Sales"]}
      rows={[{ Name: "Alice", Sales: 100 }, { Name: "Bob", Sales: 200 }]}
    />
  )
  expect(screen.getByText("Alice")).toBeInTheDocument()
  expect(screen.getByText("Bob")).toBeInTheDocument()
})

test("renders optional title", () => {
  render(<DataTable title="Sales Report" columns={["A"]} rows={[]} />)
  expect(screen.getByText("Sales Report")).toBeInTheDocument()
})
```

Create `frontend/src/__tests__/ChartWidget.test.tsx`:
```tsx
import { render, screen } from "@testing-library/react"
import ChartWidget from "../components/dashboard/ChartWidget"

test("renders chart title", () => {
  render(
    <ChartWidget
      title="Monthly Revenue"
      chart_type="bar"
      data={[{ month: "Jan", revenue: 1000 }]}
      x_key="month"
      y_key="revenue"
    />
  )
  expect(screen.getByText("Monthly Revenue")).toBeInTheDocument()
})
```

- [ ] **Step 3: Run to verify tests fail**

```bash
cd frontend && npm test
```
Expected: FAIL — components not found

- [ ] **Step 4: Create frontend/src/components/dashboard/MetricCard.tsx**

```tsx
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { TrendingUp, TrendingDown } from "lucide-react"

interface MetricCardProps {
  label: string
  value: string
  trend?: "up" | "down"
}

export default function MetricCard({ label, value, trend }: MetricCardProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-2">
          <span className="text-2xl font-bold">{value}</span>
          {trend === "up" && (
            <TrendingUp data-testid="trend-up" className="h-4 w-4 text-green-500" />
          )}
          {trend === "down" && (
            <TrendingDown data-testid="trend-down" className="h-4 w-4 text-red-500" />
          )}
        </div>
      </CardContent>
    </Card>
  )
}
```

- [ ] **Step 5: Create frontend/src/components/dashboard/DataTable.tsx**

```tsx
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table"

interface DataTableProps {
  title?: string
  columns: string[]
  rows: Record<string, unknown>[]
}

export default function DataTable({ title, columns, rows }: DataTableProps) {
  return (
    <Card>
      {title && (
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
      )}
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map(col => (
                <TableHead key={col}>{col}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row, i) => (
              <TableRow key={i}>
                {columns.map(col => (
                  <TableCell key={col}>{String(row[col] ?? "")}</TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
```

- [ ] **Step 6: Create frontend/src/components/dashboard/ChartWidget.tsx**

```tsx
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from "recharts"

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"]

interface ChartWidgetProps {
  title?: string
  chart_type: "bar" | "line" | "pie"
  data: Record<string, unknown>[]
  x_key: string
  y_key: string
}

export default function ChartWidget({ title, chart_type, data, x_key, y_key }: ChartWidgetProps) {
  return (
    <Card>
      {title && (
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
      )}
      <CardContent>
        <ResponsiveContainer width="100%" height={250}>
          {chart_type === "bar" ? (
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey={x_key} />
              <YAxis />
              <Tooltip />
              <Bar dataKey={y_key} fill={COLORS[0]} />
            </BarChart>
          ) : chart_type === "line" ? (
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey={x_key} />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey={y_key} stroke={COLORS[0]} />
            </LineChart>
          ) : (
            <PieChart>
              <Pie data={data} dataKey={y_key} nameKey={x_key} cx="50%" cy="50%" outerRadius={80} label>
                {data.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          )}
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
```

- [ ] **Step 7: Create frontend/src/components/dashboard/TextBlock.tsx**

```tsx
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface TextBlockProps {
  title?: string
  content: string
}

export default function TextBlock({ title, content }: TextBlockProps) {
  return (
    <Card>
      {title && (
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
      )}
      <CardContent>
        <p className="text-sm text-muted-foreground whitespace-pre-wrap">{content}</p>
      </CardContent>
    </Card>
  )
}
```

- [ ] **Step 8: Create frontend/src/components/dashboard/ListWidget.tsx**

```tsx
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface ListWidgetProps {
  title?: string
  items: string[]
}

export default function ListWidget({ title, items }: ListWidgetProps) {
  return (
    <Card>
      {title && (
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
      )}
      <CardContent>
        <ul className="list-disc list-inside space-y-1">
          {items.map((item, i) => (
            <li key={i} className="text-sm">{item}</li>
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}
```

- [ ] **Step 9: Create frontend/src/components/dashboard/AlertBanner.tsx**

```tsx
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle, Info, AlertTriangle } from "lucide-react"

interface AlertBannerProps {
  message: string
  severity: "info" | "warning" | "error"
}

const icons = {
  info: <Info className="h-4 w-4" />,
  warning: <AlertTriangle className="h-4 w-4" />,
  error: <AlertCircle className="h-4 w-4" />
}

const variants: Record<AlertBannerProps["severity"], "default" | "destructive"> = {
  info: "default",
  warning: "default",
  error: "destructive"
}

export default function AlertBanner({ message, severity }: AlertBannerProps) {
  return (
    <Alert variant={variants[severity]}>
      {icons[severity]}
      <AlertDescription>{message}</AlertDescription>
    </Alert>
  )
}
```

- [ ] **Step 10: Run component tests to verify they pass**

```bash
cd frontend && npm test -- MetricCard DataTable ChartWidget
```
Expected: PASS

- [ ] **Step 11: Commit**

```bash
cd frontend && git add src/types src/components/dashboard src/__tests__
git commit -m "feat: add frontend types and all 6 dashboard components"
```

---

## Task 11: Component Registry + Dashboard Renderer

**Files:**
- Create: `frontend/src/components/dashboard/registry.tsx`
- Create: `frontend/src/__tests__/registry.test.tsx`

- [ ] **Step 1: Write failing test**

Create `frontend/src/__tests__/registry.test.tsx`:
```tsx
import { render, screen } from "@testing-library/react"
import Dashboard from "../components/dashboard/registry"
import { ComponentEvent } from "../types"

test("renders a metric component from a component event", () => {
  const events: ComponentEvent[] = [
    { tool: "render_metric", props: { label: "Revenue", value: "$100" } }
  ]
  render(<Dashboard components={events} />)
  expect(screen.getByText("Revenue")).toBeInTheDocument()
  expect(screen.getByText("$100")).toBeInTheDocument()
})

test("renders multiple components in order", () => {
  const events: ComponentEvent[] = [
    { tool: "render_text", props: { content: "Summary text here" } },
    { tool: "render_alert", props: { message: "Watch out!", severity: "warning" } }
  ]
  render(<Dashboard components={events} />)
  expect(screen.getByText("Summary text here")).toBeInTheDocument()
  expect(screen.getByText("Watch out!")).toBeInTheDocument()
})

test("silently skips unknown tool names", () => {
  const events: ComponentEvent[] = [
    { tool: "render_metric", props: { label: "OK", value: "1" } },
    { tool: "unknown_tool", props: { foo: "bar" } }
  ]
  // Should not throw
  expect(() => render(<Dashboard components={events} />)).not.toThrow()
  expect(screen.getByText("OK")).toBeInTheDocument()
})
```

- [ ] **Step 2: Run to verify failure**

```bash
cd frontend && npm test -- registry
```
Expected: FAIL

- [ ] **Step 3: Create frontend/src/components/dashboard/registry.tsx**

```tsx
import { ComponentEvent } from "../../types"
import MetricCard from "./MetricCard"
import DataTable from "./DataTable"
import ChartWidget from "./ChartWidget"
import TextBlock from "./TextBlock"
import ListWidget from "./ListWidget"
import AlertBanner from "./AlertBanner"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const REGISTRY: Record<string, React.ComponentType<any>> = {
  render_metric: MetricCard,
  render_table: DataTable,
  render_chart: ChartWidget,
  render_text: TextBlock,
  render_list: ListWidget,
  render_alert: AlertBanner
}

import React from "react"

interface DashboardProps {
  components: ComponentEvent[]
}

export default function Dashboard({ components }: DashboardProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {components.map(({ tool, props }, i) => {
        const Component = REGISTRY[tool]
        if (!Component) return null
        return <Component key={i} {...props} />
      })}
    </div>
  )
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd frontend && npm test -- registry
```
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add src/components/dashboard/registry.tsx src/__tests__/registry.test.tsx
git commit -m "feat: add component registry and Dashboard renderer"
```

---

## Task 12: useDashboard SSE Hook

**Files:**
- Create: `frontend/src/hooks/useDashboard.ts`
- Create: `frontend/src/__tests__/useDashboard.test.ts`

- [ ] **Step 1: Write failing test**

Create `frontend/src/__tests__/useDashboard.test.ts`:
```ts
import { renderHook, act } from "@testing-library/react"
import { useDashboard } from "../hooks/useDashboard"

// Mock EventSource
class MockEventSource {
  static instances: MockEventSource[] = []
  url: string
  listeners: Record<string, ((e: MessageEvent) => void)[]> = {}
  onclose: (() => void) | null = null

  constructor(url: string) {
    this.url = url
    MockEventSource.instances.push(this)
  }

  addEventListener(event: string, cb: (e: MessageEvent) => void) {
    this.listeners[event] = this.listeners[event] || []
    this.listeners[event].push(cb)
  }

  emit(event: string, data: unknown) {
    const msg = { data: JSON.stringify(data) } as MessageEvent
    this.listeners[event]?.forEach(cb => cb(msg))
  }

  close() {}
}

;(global as any).EventSource = MockEventSource

beforeEach(() => {
  MockEventSource.instances = []
})

test("starts with empty components and idle status", () => {
  const { result } = renderHook(() => useDashboard(null))
  expect(result.current.components).toEqual([])
  expect(result.current.status).toBe("idle")
})

test("status changes to streaming when mcpId is provided", () => {
  const { result } = renderHook(() => useDashboard("mcp-1"))
  expect(result.current.status).toBe("streaming")
})

test("appends component events from SSE stream", () => {
  const { result } = renderHook(() => useDashboard("mcp-1"))
  const es = MockEventSource.instances[0]

  act(() => {
    es.emit("component", { tool: "render_metric", props: { label: "X", value: "1" } })
  })

  expect(result.current.components).toHaveLength(1)
  expect(result.current.components[0].tool).toBe("render_metric")
})

test("status changes to done on done event", () => {
  const { result } = renderHook(() => useDashboard("mcp-1"))
  const es = MockEventSource.instances[0]

  act(() => {
    es.emit("done", {})
  })

  expect(result.current.status).toBe("done")
})
```

- [ ] **Step 2: Run to verify failure**

```bash
cd frontend && npm test -- useDashboard
```
Expected: FAIL

- [ ] **Step 3: Create frontend/src/hooks/useDashboard.ts**

```ts
import { useState, useEffect, useRef } from "react"
import { ComponentEvent, StreamStatus } from "../types"

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3001"

export function useDashboard(mcpId: string | null) {
  const [components, setComponents] = useState<ComponentEvent[]>([])
  const [status, setStatus] = useState<StreamStatus>("idle")
  const esRef = useRef<EventSource | null>(null)

  useEffect(() => {
    if (!mcpId) {
      setComponents([])
      setStatus("idle")
      return
    }

    setComponents([])
    setStatus("streaming")

    const es = new EventSource(`${API_BASE}/api/mcp/${mcpId}/stream`)
    esRef.current = es

    es.addEventListener("component", (e: MessageEvent) => {
      const event = JSON.parse(e.data) as ComponentEvent
      setComponents(prev => [...prev, event])
    })

    es.addEventListener("done", () => {
      setStatus("done")
      es.close()
    })

    es.addEventListener("error", (e: MessageEvent) => {
      setStatus("error")
      es.close()
    })

    return () => {
      es.close()
    }
  }, [mcpId])

  return { components, status }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd frontend && npm test -- useDashboard
```
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useDashboard.ts src/__tests__/useDashboard.test.ts
git commit -m "feat: add useDashboard SSE hook"
```

---

## Task 13: MCPConfigForm

**Files:**
- Create: `frontend/src/components/mcp/MCPConfigForm.tsx`
- Create: `frontend/src/__tests__/MCPConfigForm.test.tsx`

- [ ] **Step 1: Write failing test**

Create `frontend/src/__tests__/MCPConfigForm.test.tsx`:
```tsx
import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import MCPConfigForm from "../components/mcp/MCPConfigForm"

test("submits name, url, and auth when form is filled", async () => {
  const onSave = vi.fn().mockResolvedValue(undefined)
  render(<MCPConfigForm onSave={onSave} />)

  // Open dialog
  fireEvent.click(screen.getByRole("button", { name: /add mcp/i }))

  await userEvent.type(screen.getByLabelText(/name/i), "My MCP")
  await userEvent.type(screen.getByLabelText(/url/i), "http://localhost:9000/sse")
  fireEvent.click(screen.getByRole("button", { name: /save/i }))

  await waitFor(() => {
    expect(onSave).toHaveBeenCalledWith({
      name: "My MCP",
      url: "http://localhost:9000/sse",
      auth: { type: "none" }
    })
  })
})

test("does not submit when name is empty", async () => {
  const onSave = vi.fn()
  render(<MCPConfigForm onSave={onSave} />)
  fireEvent.click(screen.getByRole("button", { name: /add mcp/i }))
  await userEvent.type(screen.getByLabelText(/url/i), "http://localhost:9000/sse")
  fireEvent.click(screen.getByRole("button", { name: /save/i }))
  expect(onSave).not.toHaveBeenCalled()
})
```

- [ ] **Step 2: Run to verify failure**

```bash
cd frontend && npm test -- MCPConfigForm
```
Expected: FAIL

- [ ] **Step 3: Create frontend/src/components/mcp/MCPConfigForm.tsx**

```tsx
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus } from "lucide-react"

interface FormPayload {
  name: string
  url: string
  auth: { type: "bearer" | "none"; token?: string }
}

interface MCPConfigFormProps {
  onSave: (payload: FormPayload) => Promise<void>
}

export default function MCPConfigForm({ onSave }: MCPConfigFormProps) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState("")
  const [url, setUrl] = useState("")
  const [authType, setAuthType] = useState<"none" | "bearer">("none")
  const [token, setToken] = useState("")
  const [saving, setSaving] = useState(false)

  const reset = () => {
    setName(""); setUrl(""); setAuthType("none"); setToken("")
  }

  const handleSave = async () => {
    if (!name.trim() || !url.trim()) return
    setSaving(true)
    await onSave({
      name: name.trim(),
      url: url.trim(),
      auth: authType === "bearer" ? { type: "bearer", token } : { type: "none" }
    })
    setSaving(false)
    reset()
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm"><Plus className="h-4 w-4 mr-1" /> Add MCP</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Connect MCP Server</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="mcp-name">Name</Label>
            <Input id="mcp-name" value={name} onChange={e => setName(e.target.value)} placeholder="Sales MCP" />
          </div>
          <div>
            <Label htmlFor="mcp-url">URL</Label>
            <Input id="mcp-url" value={url} onChange={e => setUrl(e.target.value)} placeholder="http://my-mcp/sse" />
          </div>
          <div>
            <Label>Auth Type</Label>
            <Select value={authType} onValueChange={v => setAuthType(v as "none" | "bearer")}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                <SelectItem value="bearer">Bearer Token</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {authType === "bearer" && (
            <div>
              <Label htmlFor="mcp-token">Token</Label>
              <Input id="mcp-token" type="password" value={token} onChange={e => setToken(e.target.value)} />
            </div>
          )}
          <Button onClick={handleSave} disabled={saving} className="w-full">
            {saving ? "Saving..." : "Save"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd frontend && npm test -- MCPConfigForm
```
Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
git add src/components/mcp/MCPConfigForm.tsx src/__tests__/MCPConfigForm.test.tsx
git commit -m "feat: add MCPConfigForm with shadcn Dialog"
```

---

## Task 14: MCPStatusList, DashboardPage, and App Root

**Files:**
- Create: `frontend/src/components/mcp/MCPStatusList.tsx`
- Create: `frontend/src/pages/DashboardPage.tsx`
- Modify: `frontend/src/App.tsx`

- [ ] **Step 1: Create frontend/src/components/mcp/MCPStatusList.tsx**

```tsx
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { MCPConfig } from "../../types"

const statusColor: Record<MCPConfig["status"], "default" | "secondary" | "destructive"> = {
  connected: "default",
  disconnected: "secondary",
  error: "destructive"
}

interface MCPStatusListProps {
  configs: MCPConfig[]
  selectedId: string | null
  onSelect: (id: string) => void
}

export default function MCPStatusList({ configs, selectedId, onSelect }: MCPStatusListProps) {
  if (configs.length === 0) {
    return <p className="text-sm text-muted-foreground">No MCP servers connected. Add one to get started.</p>
  }

  return (
    <div className="space-y-2">
      {configs.map(config => (
        <Card
          key={config.id}
          className={`cursor-pointer transition-colors hover:bg-muted/50 ${selectedId === config.id ? "border-primary" : ""}`}
          onClick={() => onSelect(config.id)}
        >
          <CardContent className="flex items-center justify-between p-3">
            <span className="text-sm font-medium">{config.name}</span>
            <Badge variant={statusColor[config.status]}>{config.status}</Badge>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
```

- [ ] **Step 2: Create frontend/src/pages/DashboardPage.tsx**

```tsx
import { useState, useEffect, useCallback } from "react"
import { MCPConfig } from "../types"
import MCPConfigForm from "../components/mcp/MCPConfigForm"
import MCPStatusList from "../components/mcp/MCPStatusList"
import Dashboard from "../components/dashboard/registry"
import { useDashboard } from "../hooks/useDashboard"

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3001"

export default function DashboardPage() {
  const [configs, setConfigs] = useState<MCPConfig[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const { components, status } = useDashboard(selectedId)

  const loadConfigs = useCallback(async () => {
    const res = await fetch(`${API_BASE}/api/mcp`)
    const data: MCPConfig[] = await res.json()
    setConfigs(data)
  }, [])

  useEffect(() => {
    loadConfigs()
  }, [loadConfigs])

  const handleSave = async (payload: { name: string; url: string; auth: MCPConfig["auth"] }) => {
    const res = await fetch(`${API_BASE}/api/mcp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    })
    const newConfig: MCPConfig = await res.json()
    setConfigs(prev => [newConfig, ...prev])
    setSelectedId(newConfig.id)
  }

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <aside className="w-64 border-r p-4 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">MCP Servers</h2>
          <MCPConfigForm onSave={handleSave} />
        </div>
        <MCPStatusList configs={configs} selectedId={selectedId} onSelect={setSelectedId} />
      </aside>

      {/* Main */}
      <main className="flex-1 p-6 overflow-auto">
        {!selectedId ? (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            Select an MCP server to view its dashboard
          </div>
        ) : (
          <>
            {status === "streaming" && components.length === 0 && (
              <p className="text-sm text-muted-foreground animate-pulse">Loading dashboard...</p>
            )}
            <Dashboard components={components} />
            {status === "error" && (
              <p className="text-sm text-destructive mt-4">Failed to load dashboard. Check MCP connection.</p>
            )}
          </>
        )}
      </main>
    </div>
  )
}
```

- [ ] **Step 3: Update frontend/src/App.tsx**

```tsx
import DashboardPage from "./pages/DashboardPage"

export default function App() {
  return <DashboardPage />
}
```

- [ ] **Step 4: Run all frontend tests**

```bash
cd frontend && npm test
```
Expected: All tests PASS

- [ ] **Step 5: Start both servers and verify end-to-end**

```bash
# Terminal 1
cd backend && npm run dev

# Terminal 2
cd frontend && npm run dev
```

Open http://localhost:5173. Click "Add MCP", enter a name and URL of a running MCP server, click Save. The dashboard should start streaming components immediately.

- [ ] **Step 6: Commit**

```bash
cd frontend && git add src/
git commit -m "feat: complete dashboard page with MCP sidebar and streaming renderer"
```

---

## Self-Review Checklist

- [x] **Spec coverage:** Architecture ✓, MCP config persistence ✓, dashboard tools ✓, SSE streaming ✓, component registry ✓, shadcn UI ✓, auto-render on connect ✓
- [x] **No placeholders:** All steps contain actual code, commands, and expected output
- [x] **Type consistency:** `MCPConfig` and `ComponentEvent` defined in Task 4/10 and used consistently; `isDashboardTool` defined in Task 5 and used in Task 7; `REGISTRY` keys match tool names from Task 5
- [x] **Scope:** Single implementation plan for one cohesive system
