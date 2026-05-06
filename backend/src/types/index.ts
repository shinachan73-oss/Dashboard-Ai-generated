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
