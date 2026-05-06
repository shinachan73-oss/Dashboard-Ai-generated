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

    es.addEventListener("error", () => {
      setStatus("error")
      es.close()
    })

    return () => {
      es.close()
    }
  }, [mcpId])

  return { components, status }
}
