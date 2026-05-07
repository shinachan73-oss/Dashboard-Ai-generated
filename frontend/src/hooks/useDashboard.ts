import { useState, useEffect, useRef, useCallback } from "react"
import { ComponentEvent, StreamStatus } from "../types"

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3001"

// Persistent cache outside the hook to survive between mcpId changes
const dashboardCache: Record<string, ComponentEvent[]> = {}

export function useDashboard(mcpId: string | null) {
  const [components, setComponents] = useState<ComponentEvent[]>(mcpId ? (dashboardCache[mcpId] || []) : [])
  const [status, setStatus] = useState<StreamStatus>(mcpId && dashboardCache[mcpId] ? "done" : "idle")
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

    // If we have cached data, just use it and don't restart the stream
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

  return { components, status, refresh }
}
