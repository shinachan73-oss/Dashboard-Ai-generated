# Dynamic Dashboard — Design Spec
**Date:** 2026-05-06

## Overview

A React dashboard that renders data dynamically from multiple MCP servers. Users define MCP connections in the frontend; configs are saved to the backend. On connection, a system prompt triggers the Claude agent to fetch data from the MCP and render it as dashboard components using a component registry pattern. Components stream progressively to the UI via SSE.

---

## Architecture

```
FRONTEND (React + shadcn + Vite)
  ├─ MCP Config UI  →  POST /api/mcp  (save config to backend)
  └─ Dashboard UI   →  SSE listener, renders components as they arrive

BACKEND (Node.js + Anthropic SDK)
  ├─ MCP Config Store  (persists MCP server configs to DB/file)
  ├─ MCP Connection Manager
  │    └─ On config saved → connect to MCP → fire default system prompt
  └─ Claude Agent
       ├─ MCP tools       (dynamically loaded from connected MCP)
       ├─ Dashboard tools (render_table, render_metric, render_chart…)
       └─ Streams component events → SSE → frontend
```

### Trigger Chain

1. User fills MCP config form in frontend
2. `POST /api/mcp` saves config, returns `{ id }` to frontend
3. Frontend immediately opens `EventSource` to `GET /api/mcp/:id/stream`
4. Backend connects to the MCP server and fires default system prompt to Claude agent: *"You are connected to {name}. Fetch and summarize the available data and render it as a dashboard."*
5. Agent calls MCP tools to retrieve data
6. Agent calls dashboard builder tools to specify rendering
7. Each dashboard tool call is streamed as an SSE event on the `/api/mcp/:id/stream` connection
8. React appends each component to the dashboard and renders it immediately

---

## MCP Config

Stored in the backend. Collected from the frontend config form.

```ts
interface MCPConfig {
  id: string           // uuid, generated on save
  name: string         // display name
  url: string          // MCP server SSE endpoint
  auth: {
    type: "bearer" | "none"
    token?: string
  }
  status: "connected" | "disconnected" | "error"
}
```

**API:**
- `POST /api/mcp` — save config, returns `{ id }` immediately; connection + agent run happen async
- `GET /api/mcp` — list saved configs with connection status
- `DELETE /api/mcp/:id` — remove config and disconnect
- `GET /api/mcp/:id/stream` — SSE stream for a specific MCP's dashboard components

---

## Dashboard Builder Tools

Claude is constrained to these tools for rendering. It cannot produce arbitrary output. If MCP data does not fit a specific tool, the agent falls back to `render_text`.

| Tool | shadcn base | Schema |
|------|-------------|--------|
| `render_metric` | `Card` | `{ label: string, value: string, trend?: "up" \| "down" }` |
| `render_table` | `Table` | `{ title?: string, columns: string[], rows: Record<string, any>[] }` |
| `render_chart` | `Card` + recharts | `{ title?: string, chart_type: "bar" \| "line" \| "pie", data: object[], x_key: string, y_key: string }` |
| `render_text` | `Card` + typography | `{ title?: string, content: string }` |
| `render_list` | `Card` + list | `{ title?: string, items: string[] }` |
| `render_alert` | `Alert` | `{ message: string, severity: "info" \| "warning" \| "error" }` |

---

## SSE Streaming Protocol

Backend streams newline-delimited JSON events:

```
event: component
data: { "tool": "render_metric", "props": { "label": "Revenue", "value": "$12,400", "trend": "up" } }

event: component
data: { "tool": "render_table", "props": { "columns": ["Name","Sales"], "rows": [...] } }

event: done
data: {}
```

Frontend consumes via `EventSource`. On each `component` event, append to local state; React re-renders the dashboard incrementally.

---

## React Component Registry

```tsx
// src/components/dashboard/registry.tsx
const REGISTRY: Record<string, React.ComponentType<any>> = {
  render_metric: MetricCard,
  render_table:  DataTable,
  render_chart:  ChartWidget,
  render_text:   TextBlock,
  render_list:   ListWidget,
  render_alert:  AlertBanner,
}

// Dynamic renderer
function Dashboard({ components }: { components: ComponentEvent[] }) {
  return (
    <div className="grid gap-4">
      {components.map(({ tool, props }, i) => {
        const Component = REGISTRY[tool]
        return Component ? <Component key={i} {...props} /> : null
      })}
    </div>
  )
}
```

---

## Project Structure

```
frontend/
  src/
    components/
      dashboard/
        registry.tsx        component registry + Dashboard renderer
        MetricCard.tsx      shadcn Card wrapper
        DataTable.tsx       shadcn Table wrapper
        ChartWidget.tsx     Card + recharts
        TextBlock.tsx       Card + typography
        ListWidget.tsx      Card + list
        AlertBanner.tsx     shadcn Alert wrapper
      mcp/
        MCPConfigForm.tsx   shadcn Dialog + Input + Button
        MCPStatusList.tsx   list of connected MCPs with status badges
    hooks/
      useDashboard.ts       SSE connection, component state management
    pages/
      Dashboard.tsx         main page — MCPStatusList + Dashboard
  index.html
  vite.config.ts

backend/
  src/
    routes/
      mcp.ts                POST/GET/DELETE /api/mcp
      dashboard.ts          GET /api/mcp/:id/stream (per-MCP SSE endpoint)
    agent/
      index.ts              Claude agent setup with MCP + dashboard tools
      dashboardTools.ts     dashboard tool definitions
      mcpTools.ts           dynamic MCP tool loader
    db/
      mcpConfigs.ts         config persistence (JSON file or SQLite)
    index.ts                Express server entry
  package.json
```

---

## Error Handling

- **MCP connection failure:** save config with `status: "error"`, return error message to frontend, show `render_alert` with severity `"error"`
- **Agent tool call failure:** stream a `render_alert` event before `done`
- **SSE disconnection:** frontend reconnects with `EventSource` auto-retry; backend replays last dashboard state on reconnect
- **Unknown tool in registry:** `Dashboard` silently skips unknown component types (no crash)

---

## Testing

- **Unit:** each dashboard component (MetricCard, DataTable, etc.) tested in isolation with mock props
- **Integration:** agent → dashboard tool call → SSE event → component render, using a mock MCP server
- **E2E:** user adds MCP config → dashboard populates with components
