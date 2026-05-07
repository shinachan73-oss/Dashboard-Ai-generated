import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Trash2 } from "lucide-react"
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
  onDelete: (id: string) => void
}

export default function MCPStatusList({ configs, selectedId, onSelect, onDelete }: MCPStatusListProps) {
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
          <CardContent className="flex items-center justify-between p-3 group">
            <div className="flex flex-col gap-1">
              <span className="text-sm font-medium">{config.name}</span>
              <Badge variant={statusColor[config.status]} className="w-fit">{config.status}</Badge>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8 text-destructive hover:bg-destructive/10"
              onClick={(e) => {
                e.stopPropagation()
                onDelete(config.id)
              }}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
