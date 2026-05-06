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
