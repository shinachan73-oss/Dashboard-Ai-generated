import { useState, useEffect, useCallback } from "react"
import { MCPConfig } from "../types"
import MCPConfigForm from "../components/mcp/MCPConfigForm"
import MCPStatusList from "../components/mcp/MCPStatusList"
import Dashboard from "../components/dashboard/registry"
import { useDashboard } from "../hooks/useDashboard"
import { Button } from "../components/ui/button"
import { RefreshCw } from "lucide-react"

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3001"

export default function DashboardPage() {
  const [configs, setConfigs] = useState<MCPConfig[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const { components, status, refresh } = useDashboard(selectedId)

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
  
  const handleDelete = async (id: string) => {
    await fetch(`${API_BASE}/api/mcp/${id}`, { method: "DELETE" })
    setConfigs(prev => prev.filter(c => c.id !== id))
    if (selectedId === id) setSelectedId(null)
  }

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <aside className="w-64 border-r p-4 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">MCP Servers</h2>
          <MCPConfigForm onSave={handleSave} />
        </div>
        <MCPStatusList configs={configs} selectedId={selectedId} onSelect={setSelectedId} onDelete={handleDelete} />
      </aside>

      {/* Main */}
      <main className="flex-1 p-6 overflow-auto">
        {!selectedId ? (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            Select an MCP server to view its dashboard
          </div>
        ) : (
          <div className="flex flex-col h-full gap-4">
            <div className="flex items-center justify-between border-b pb-4">
              <div>
                <h1 className="text-2xl font-bold tracking-tight">
                  {configs.find(c => c.id === selectedId)?.name}
                </h1>
                <p className="text-sm text-muted-foreground">Generated AI Insights</p>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                className="gap-2"
                onClick={refresh}
                disabled={status === "streaming"}
              >
                <RefreshCw className={`h-4 w-4 ${status === "streaming" ? "animate-spin" : ""}`} />
                {status === "streaming" ? "Generating..." : "Refresh Insight"}
              </Button>
            </div>

            <div className="flex-1">
              {status === "streaming" && components.length === 0 && (
                <div className="flex flex-col items-center justify-center h-64 gap-2">
                  <RefreshCw className="h-8 w-8 animate-spin text-primary" />
                  <p className="text-sm text-muted-foreground">Regenerating dashboard with AI...</p>
                </div>
              )}
              <Dashboard components={components} />
              {status === "error" && (
                <p className="text-sm text-destructive mt-4 font-medium">Failed to load dashboard. Check MCP connection.</p>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
