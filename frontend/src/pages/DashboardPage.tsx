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
