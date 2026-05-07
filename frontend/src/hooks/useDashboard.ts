import { useState, useEffect, useRef, useCallback } from "react"
import { ComponentEvent, StreamStatus } from "../types"

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3001"

const dashboardCache: Record<string, ComponentEvent[]> = {}

export function useDashboard(mcpId: string | null) {
  const [components, setComponents] = useState<ComponentEvent[]>(mcpId ? (dashboardCache[mcpId] || []) : [])
  const [status, setStatus] = useState<StreamStatus>(mcpId && dashboardCache[mcpId] ? "done" : "idle")
  const [isSyncing, setIsSyncing] = useState(false)
  const esRef = useRef<EventSource | null>(null)

  const startStream = useCallback((id: string) => {
    if (esRef.current) esRef.current.close()

    setComponents([])
    setStatus("streaming")

    const es = new EventSource(`${API_BASE}/api/mcp/${id}/stream`)
    esRef.current = es

    es.addEventListener("component", (e: MessageEvent) => {
      const event = JSON.parse(e.data) as ComponentEvent
      setComponents(prev => {
        const next = [...prev, event]
        dashboardCache[id] = next
        return next
      })
    })

    es.addEventListener("done", () => {
      setStatus("done")
      es.close()
    })

    es.addEventListener("error", () => {
      setStatus("error")
      es.close()
    })
  }, [])

  useEffect(() => {
    if (!mcpId) {
      setComponents([])
      setStatus("idle")
      return
    }

    if (dashboardCache[mcpId]) {
      setComponents(dashboardCache[mcpId])
      setStatus("done")
    } else {
      startStream(mcpId)
    }

    return () => {
      if (esRef.current) esRef.current.close()
    }
  }, [mcpId, startStream])

  const refresh = useCallback(() => {
    if (mcpId) {
      delete dashboardCache[mcpId]
      startStream(mcpId)
    }
  }, [mcpId, startStream])

  const sync = useCallback(async () => {
    if (!mcpId || components.length === 0) return

    setIsSyncing(true)
    try {
      const res = await fetch(`${API_BASE}/api/mcp/${mcpId}/sync`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ components })
      })
      
      if (!res.ok) throw new Error("Sync failed")
      
      const updatedComponents = await res.json()
      setComponents(updatedComponents)
      dashboardCache[mcpId] = updatedComponents
    } catch (e) {
      console.error("Sync error:", e)
    } finally {
      setIsSyncing(false)
    }
  }, [mcpId, components])

  return { components, status, isSyncing, refresh, sync }
}
