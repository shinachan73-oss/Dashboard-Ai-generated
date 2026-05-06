import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus } from "lucide-react"

interface FormPayload {
  name: string
  url: string
  auth: { type: "bearer" | "none"; token?: string }
}

interface MCPConfigFormProps {
  onSave: (payload: FormPayload) => Promise<void>
}

export default function MCPConfigForm({ onSave }: MCPConfigFormProps) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState("")
  const [url, setUrl] = useState("")
  const [authType, setAuthType] = useState<"none" | "bearer">("none")
  const [token, setToken] = useState("")
  const [saving, setSaving] = useState(false)

  const reset = () => {
    setName(""); setUrl(""); setAuthType("none"); setToken("")
  }

  const handleSave = async () => {
    if (!name.trim() || !url.trim()) return
    setSaving(true)
    await onSave({
      name: name.trim(),
      url: url.trim(),
      auth: authType === "bearer" ? { type: "bearer", token } : { type: "none" }
    })
    setSaving(false)
    reset()
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm"><Plus className="h-4 w-4 mr-1" /> Add MCP</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Connect MCP Server</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="mcp-name">Name</Label>
            <Input id="mcp-name" value={name} onChange={e => setName(e.target.value)} placeholder="Sales MCP" />
          </div>
          <div>
            <Label htmlFor="mcp-url">URL</Label>
            <Input id="mcp-url" value={url} onChange={e => setUrl(e.target.value)} placeholder="http://my-mcp/sse" />
          </div>
          <div>
            <Label>Auth Type</Label>
            <Select value={authType} onValueChange={v => setAuthType(v as "none" | "bearer")}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                <SelectItem value="bearer">Bearer Token</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {authType === "bearer" && (
            <div>
              <Label htmlFor="mcp-token">Token</Label>
              <Input id="mcp-token" type="password" value={token} onChange={e => setToken(e.target.value)} />
            </div>
          )}
          <Button onClick={handleSave} disabled={saving} className="w-full">
            {saving ? "Saving..." : "Save"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
