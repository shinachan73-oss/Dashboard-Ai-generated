# Weather MCP Server

A local MCP server that wraps the [Open-Meteo](https://open-meteo.com/) public API (no API key needed).

## Run

```bash
cd weather-mcp
npm install   # first time only
npm run dev   # starts on http://localhost:9000/sse
```

## Connect to the dashboard

In the dashboard UI, add an MCP config:

| Field | Value |
|-------|-------|
| Name | Weather |
| URL | `http://localhost:9000/sse` |
| Auth | None |

## Tools

| Tool | Description |
|------|-------------|
| `get_current_weather` | Current conditions for a city (temp, humidity, wind, etc.) |
| `get_hourly_forecast` | Hour-by-hour forecast for today |
| `get_daily_forecast` | Up to 7-day forecast |
| `compare_cities_weather` | Side-by-side comparison of 2–5 cities |

## Change port

```bash
PORT=9001 npm run dev
```
