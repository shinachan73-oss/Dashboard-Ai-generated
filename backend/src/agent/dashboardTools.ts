import Anthropic from "@anthropic-ai/sdk"

export const DASHBOARD_TOOLS: Anthropic.Tool[] = [
  {
    name: "render_metric",
    description: "Render a single KPI or numeric metric as a card.",
    input_schema: {
      type: "object",
      properties: {
        label: { type: "string", description: "Metric name" },
        value: { type: "string", description: "Formatted value, e.g. '$12,400'" },
        trend: { type: "string", enum: ["up", "down"], description: "Optional trend direction" }
      },
      required: ["label", "value"]
    }
  },
  {
    name: "render_table",
    description: "Render tabular data with columns and rows.",
    input_schema: {
      type: "object",
      properties: {
        title: { type: "string" },
        columns: { type: "array", items: { type: "string" }, description: "Column header names" },
        rows: {
          type: "array",
          items: { type: "object", additionalProperties: true },
          description: "Array of row objects keyed by column name"
        }
      },
      required: ["columns", "rows"]
    }
  },
  {
    name: "render_chart",
    description: "Render a bar, line, or pie chart.",
    input_schema: {
      type: "object",
      properties: {
        title: { type: "string" },
        chart_type: { type: "string", enum: ["bar", "line", "pie"] },
        data: { type: "array", items: { type: "object", additionalProperties: true } },
        x_key: { type: "string", description: "Key in data objects to use as X axis / label" },
        y_key: { type: "string", description: "Key in data objects to use as Y axis / value" }
      },
      required: ["chart_type", "data", "x_key", "y_key"]
    }
  },
  {
    name: "render_text",
    description: "Render a text summary or explanation block.",
    input_schema: {
      type: "object",
      properties: {
        title: { type: "string" },
        content: { type: "string" }
      },
      required: ["content"]
    }
  },
  {
    name: "render_list",
    description: "Render a bullet list of items.",
    input_schema: {
      type: "object",
      properties: {
        title: { type: "string" },
        items: { type: "array", items: { type: "string" } }
      },
      required: ["items"]
    }
  },
  {
    name: "render_alert",
    description: "Render an alert banner for warnings, errors, or info messages.",
    input_schema: {
      type: "object",
      properties: {
        message: { type: "string" },
        severity: { type: "string", enum: ["info", "warning", "error"] }
      },
      required: ["message", "severity"]
    }
  }
]

export const DASHBOARD_TOOL_NAMES = new Set(DASHBOARD_TOOLS.map(t => t.name))

export function isDashboardTool(name: string): boolean {
  return DASHBOARD_TOOL_NAMES.has(name)
}
