import { renderHook, act } from "@testing-library/react"
import { useDashboard } from "../hooks/useDashboard"

// Mock EventSource
class MockEventSource {
  static instances: MockEventSource[] = []
  url: string
  listeners: Record<string, ((e: MessageEvent) => void)[]> = {}

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
