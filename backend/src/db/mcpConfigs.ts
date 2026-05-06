import Database from "better-sqlite3"
import path from "path"
import { MCPConfig } from "../types"

let _db: Database.Database | null = null

function getDb(): Database.Database {
  if (_db) return _db
  const dbPath = process.env.DB_PATH || path.join(__dirname, "../../data/dashboard.db")
  _db = new Database(dbPath)
  _db.exec(`
    CREATE TABLE IF NOT EXISTS mcp_configs (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      url TEXT NOT NULL,
      auth_type TEXT NOT NULL DEFAULT 'none',
      auth_token TEXT,
      status TEXT NOT NULL DEFAULT 'disconnected',
      created_at TEXT NOT NULL
    )
  `)
  return _db
}

function rowToConfig(row: Record<string, unknown>): MCPConfig {
  return {
    id: row.id as string,
    name: row.name as string,
    url: row.url as string,
    auth: {
      type: row.auth_type as "bearer" | "none",
      token: (row.auth_token as string | null) ?? undefined
    },
    status: row.status as MCPConfig["status"],
    createdAt: row.created_at as string
  }
}

export function saveConfig(config: MCPConfig): MCPConfig {
  getDb().prepare(`
    INSERT OR REPLACE INTO mcp_configs (id, name, url, auth_type, auth_token, status, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    config.id, config.name, config.url,
    config.auth.type, config.auth.token ?? null,
    config.status, config.createdAt
  )
  return config
}

export function listConfigs(): MCPConfig[] {
  return (getDb().prepare("SELECT * FROM mcp_configs ORDER BY created_at DESC").all() as Record<string, unknown>[]).map(rowToConfig)
}

export function getConfig(id: string): MCPConfig | null {
  const row = getDb().prepare("SELECT * FROM mcp_configs WHERE id = ?").get(id) as Record<string, unknown> | undefined
  return row ? rowToConfig(row) : null
}

export function updateStatus(id: string, status: MCPConfig["status"]): void {
  getDb().prepare("UPDATE mcp_configs SET status = ? WHERE id = ?").run(status, id)
}

export function deleteConfig(id: string): void {
  getDb().prepare("DELETE FROM mcp_configs WHERE id = ?").run(id)
}
