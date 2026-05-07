import React, { useState, useRef, useEffect } from "react"
import { Send, MessageSquare, X, Bot, User, Loader2 } from "lucide-react"
import { Button } from "../ui/button"
import { ChatMessage, ComponentEvent } from "../../types"

interface DashboardChatProps {
  mcpId: string
  components: ComponentEvent[]
  isOpen: boolean
  onClose: () => void
}

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3001"

export default function DashboardChat({ mcpId, components, isOpen, onClose }: DashboardChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, isLoading])

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault()
    if (!input.trim() || isLoading) return

    const userMessage: ChatMessage = { role: "user", content: input }
    setMessages(prev => [...prev, userMessage])
    setInput("")
    setIsLoading(true)

    try {
      // Create a summary of the dashboard for context
      const context = components.map(c => 
        `${c.tool}: ${JSON.stringify(c.props)}`
      ).join("\n")

      const res = await fetch(`${API_BASE}/api/mcp/${mcpId}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...messages, userMessage],
          dashboardContext: context
        })
      })

      if (!res.ok) throw new Error("Chat failed")
      
      const data = await res.json()
      const cleanContent = data.content.replace(/<think>[\s\S]*?<\/think>/g, "").trim()
      setMessages(prev => [...prev, { role: "assistant", content: cleanContent }])
    } catch (error) {
      console.error("Chat error:", error)
      setMessages(prev => [...prev, { role: "assistant", content: "Sorry, I encountered an error. Please check your MCP connection." }])
    } finally {
      setIsLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-y-0 right-0 w-96 bg-background/80 backdrop-blur-xl border-l border-border shadow-2xl z-50 flex flex-col animate-in slide-in-from-right duration-300">
      {/* Header */}
      <div className="p-4 border-b border-border flex items-center justify-between bg-primary/5">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-primary/10 rounded-lg">
            <MessageSquare className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-sm">Dashboard Assistant</h3>
            <p className="text-[10px] text-muted-foreground flex items-center gap-1">
              <span className="h-1.5 w-1.5 bg-green-500 rounded-full animate-pulse" />
              Online & Context Aware
            </p>
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full">
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-4">
            <div className="p-4 bg-primary/5 rounded-full">
              <Bot className="h-8 w-8 text-primary/40" />
            </div>
            <div>
              <p className="text-sm font-medium">Ask me anything!</p>
              <p className="text-xs text-muted-foreground mt-1">
                I can explain the data on your dashboard or fetch more info using tools.
              </p>
            </div>
          </div>
        )}
        
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`flex gap-3 max-w-[85%] ${m.role === "user" ? "flex-row-reverse" : ""}`}>
              <div className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 ${
                m.role === "user" ? "bg-primary" : "bg-muted border border-border"
              }`}>
                {m.role === "user" ? <User className="h-4 w-4 text-white" /> : <Bot className="h-4 w-4 text-primary" />}
              </div>
              <div className={`p-3 rounded-2xl text-sm ${
                m.role === "user" 
                  ? "bg-primary text-white rounded-tr-none" 
                  : "bg-muted/50 border border-border rounded-tl-none"
              }`}>
                {m.content}
              </div>
            </div>
          </div>
        ))}
        
        {isLoading && (
          <div className="flex justify-start">
            <div className="flex gap-3 max-w-[85%]">
              <div className="h-8 w-8 rounded-full bg-muted border border-border flex items-center justify-center shrink-0">
                <Bot className="h-4 w-4 text-primary" />
              </div>
              <div className="p-3 rounded-2xl rounded-tl-none bg-muted/50 border border-border flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                <span className="text-xs text-muted-foreground italic">Thinking...</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <form onSubmit={handleSend} className="p-4 border-t border-border bg-background">
        <div className="relative">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your message..."
            className="w-full bg-muted/50 border border-border rounded-xl py-3 pl-4 pr-12 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-primary text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105 active:scale-95 transition-all"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </form>
    </div>
  )
}
