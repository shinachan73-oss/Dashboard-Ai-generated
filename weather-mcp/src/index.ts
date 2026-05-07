import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js"
import express from "express"
import { z } from "zod"

const PORT = parseInt(process.env.PORT ?? "9000")

// ── Weather API helpers ──────────────────────────────────────────────────────

interface GeoResult {
  name: string
  latitude: number
  longitude: number
  country: string
  admin1?: string
}

async function geocode(city: string): Promise<GeoResult> {
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=en&format=json`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Geocoding failed: ${res.status}`)
  const data = (await res.json()) as { results?: GeoResult[] }
  if (!data.results?.length) throw new Error(`City not found: ${city}`)
  return data.results[0]
}

interface CurrentWeather {
  temperature_2m: number
  relative_humidity_2m: number
  wind_speed_10m: number
  weather_code: number
  precipitation: number
  apparent_temperature: number
}

interface HourlyWeather {
  time: string[]
  temperature_2m: number[]
  precipitation_probability: number[]
  weather_code: number[]
}

interface DailyWeather {
  time: string[]
  temperature_2m_max: number[]
  temperature_2m_min: number[]
  precipitation_sum: number[]
  weather_code: number[]
}

function describeWeatherCode(code: number): string {
  if (code === 0) return "Clear sky"
  if (code <= 3) return "Partly cloudy"
  if (code <= 9) return "Foggy"
  if (code <= 19) return "Drizzle"
  if (code <= 29) return "Rain"
  if (code <= 39) return "Snow"
  if (code <= 49) return "Fog"
  if (code <= 59) return "Drizzle"
  if (code <= 69) return "Rain"
  if (code <= 79) return "Snow"
  if (code <= 84) return "Rain showers"
  if (code <= 94) return "Snow showers"
  return "Thunderstorm"
}

async function fetchCurrentWeather(lat: number, lon: number): Promise<CurrentWeather> {
  const params = new URLSearchParams({
    latitude: lat.toString(),
    longitude: lon.toString(),
    current: "temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code,precipitation,apparent_temperature",
    wind_speed_unit: "kmh",
    timezone: "auto"
  })
  const res = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`)
  if (!res.ok) throw new Error(`Weather API failed: ${res.status}`)
  const data = (await res.json()) as { current: CurrentWeather }
  return data.current
}

async function fetchHourlyForecast(lat: number, lon: number): Promise<HourlyWeather> {
  const params = new URLSearchParams({
    latitude: lat.toString(),
    longitude: lon.toString(),
    hourly: "temperature_2m,precipitation_probability,weather_code",
    forecast_days: "1",
    timezone: "auto"
  })
  const res = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`)
  if (!res.ok) throw new Error(`Weather API failed: ${res.status}`)
  const data = (await res.json()) as { hourly: HourlyWeather }
  return data.hourly
}

async function fetchDailyForecast(lat: number, lon: number, days: number): Promise<DailyWeather> {
  const params = new URLSearchParams({
    latitude: lat.toString(),
    longitude: lon.toString(),
    daily: "temperature_2m_max,temperature_2m_min,precipitation_sum,weather_code",
    forecast_days: days.toString(),
    timezone: "auto"
  })
  const res = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`)
  if (!res.ok) throw new Error(`Weather API failed: ${res.status}`)
  const data = (await res.json()) as { daily: DailyWeather }
  return data.daily
}

// ── MCP Server ───────────────────────────────────────────────────────────────

const registerTools = (server: McpServer) => {
  server.tool(
    "get_current_weather",
    "Get current weather conditions for a city",
    { city: z.string().describe("City name, e.g. 'London' or 'New York'") },
    async ({ city }) => {
      const geo = await geocode(city)
      const w = await fetchCurrentWeather(geo.latitude, geo.longitude)
      const location = [geo.name, geo.admin1, geo.country].filter(Boolean).join(", ")
      return {
        content: [{
          type: "text" as const,
          text: JSON.stringify({
            location,
            temperature_c: w.temperature_2m,
            feels_like_c: w.apparent_temperature,
            humidity_pct: w.relative_humidity_2m,
            wind_speed_kmh: w.wind_speed_10m,
            precipitation_mm: w.precipitation,
            condition: describeWeatherCode(w.weather_code)
          }, null, 2)
        }]
      }
    }
  )

  server.tool(
    "get_hourly_forecast",
    "Get hourly weather forecast for today for a city",
    { city: z.string().describe("City name") },
    async ({ city }) => {
      const geo = await geocode(city)
      const h = await fetchHourlyForecast(geo.latitude, geo.longitude)
      const location = [geo.name, geo.admin1, geo.country].filter(Boolean).join(", ")
      const hours = h.time.map((t, i) => ({
        time: t.split("T")[1],
        temperature_c: h.temperature_2m[i],
        precipitation_probability_pct: h.precipitation_probability[i],
        condition: describeWeatherCode(h.weather_code[i])
      }))
      return {
        content: [{
          type: "text" as const,
          text: JSON.stringify({ location, hourly: hours }, null, 2)
        }]
      }
    }
  )

  server.tool(
    "get_daily_forecast",
    "Get multi-day weather forecast for a city",
    {
      city: z.string().describe("City name"),
      days: z.number().min(1).max(7).default(5).describe("Number of days (1-7)")
    },
    async ({ city, days }) => {
      const geo = await geocode(city)
      const d = await fetchDailyForecast(geo.latitude, geo.longitude, days)
      const location = [geo.name, geo.admin1, geo.country].filter(Boolean).join(", ")
      const forecast = d.time.map((date, i) => ({
        date,
        max_temp_c: d.temperature_2m_max[i],
        min_temp_c: d.temperature_2m_min[i],
        precipitation_mm: d.precipitation_sum[i],
        condition: describeWeatherCode(d.weather_code[i])
      }))
      return {
        content: [{
          type: "text" as const,
          text: JSON.stringify({ location, forecast }, null, 2)
        }]
      }
    }
  )

  server.tool(
    "compare_cities_weather",
    "Compare current weather across multiple cities",
    { cities: z.array(z.string()).min(2).max(5).describe("List of city names to compare") },
    async ({ cities }) => {
      const results = await Promise.all(cities.map(async (city) => {
        const geo = await geocode(city)
        const w = await fetchCurrentWeather(geo.latitude, geo.longitude)
        return {
          city: [geo.name, geo.country].filter(Boolean).join(", "),
          temperature_c: w.temperature_2m,
          feels_like_c: w.apparent_temperature,
          humidity_pct: w.relative_humidity_2m,
          wind_speed_kmh: w.wind_speed_10m,
          condition: describeWeatherCode(w.weather_code)
        }
      }))
      return {
        content: [{
          type: "text" as const,
          text: JSON.stringify({ comparison: results }, null, 2)
        }]
      }
    }
  )
}

// ── Express SSE transport ────────────────────────────────────────────────────

const app = express()
const transports = new Map<string, { server: McpServer; transport: SSEServerTransport }>()

app.get("/sse", async (req, res) => {
  const server = new McpServer({ name: "weather", version: "1.0.0" })
  registerTools(server)
  const transport = new SSEServerTransport("/messages", res)
  transports.set(transport.sessionId, { server, transport })
  res.on("close", () => transports.delete(transport.sessionId))
  await server.connect(transport)
})

app.post("/messages", async (req, res) => {
  const sessionId = req.query.sessionId as string
  const entry = transports.get(sessionId)
  if (!entry) {
    console.error(`Session not found: ${sessionId}`)
    res.status(404).json({ error: "Session not found" })
    return
  }
  try {
    await entry.transport.handlePostMessage(req, res)
  } catch (err) {
    console.error(`POST error for session ${sessionId}:`, err)
    res.status(500).json({ error: "Internal server error" })
  }
})

app.listen(PORT, () => {
  console.log(`Weather MCP server running at http://localhost:${PORT}/sse`)
  console.log("Tools: get_current_weather, get_hourly_forecast, get_daily_forecast, compare_cities_weather")
})
