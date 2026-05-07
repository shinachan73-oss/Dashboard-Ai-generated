# AI-Powered Dynamic Dashboard

A state-of-the-art, AI-driven insights platform that orchestrates multiple **Model Context Protocol (MCP)** servers to generate real-time, interactive dashboards. 

![Dashboard Overview](https://img.shields.io/badge/Status-Stable-green)
![Tech Stack](https://img.shields.io/badge/Tech-React%20%7C%20Node.js%20%7C%20MCP-blue)

## 🚀 Features

- **AI-Generated Layouts**: The dashboard isn't static. An AI agent analyzes available MCP tools and automatically builds the most relevant UI (metrics, charts, tables).
- **Conversational BI (Chat)**: A context-aware chat interface that knows what's on your screen and can fetch live data using MCP tools.
- **Turbo Sync**: High-speed batch data updates that refresh your dashboard content in-place without regenerating the layout.
- **Multi-MCP Support**: Connect to any MCP-compatible server (Finance, Weather, etc.) simultaneously.
- **Glassmorphism UI**: A premium, modern design system built with React and Vanilla CSS.

## 🛠️ Tech Stack

- **Frontend**: React (Vite), TailwindCSS, Lucide Icons, Shadcn UI.
- **Backend**: Node.js, Express, TypeScript.
- **AI Orchestration**: OpenAI (GPT-4o) / Anthropic (Claude 3.5 Sonnet).
- **Protocol**: Model Context Protocol (MCP) for tool discovery and execution.

## 📦 Project Structure

```text
├── backend/            # Express server & AI Agent Orchestrator
├── frontend/           # React application & UI Components
├── finance-mcp/        # Finance MCP Server (SSE)
└── weather-mcp/        # Weather MCP Server (SSE)
```

## 🚦 Quick Start

### 1. Prerequisites
- Node.js (v18+)
- AI API Key (OpenAI or Anthropic)

### 2. Configuration
Create a `.env` file in the `backend/` directory:
```env
OPENAI_API_KEY=your_key
OPENAI_BASE_URL=https://api.openai.com/v1
USE_OPENAI=true
```

### 3. Run the System
Run each component in a separate terminal:

**Backend:**
```bash
cd backend && npm install && npm run dev
```

**Frontend:**
```bash
cd frontend && npm install && npm run dev
```

**MCP Servers:**
```bash
cd finance-mcp && npm install && npm run serve
cd weather-mcp && npm install && npm run serve
```

## 📘 Documentation
For a deep dive into how the AI agent orchestrates the MCP servers, check out [ARCHITECTURE.md](./ARCHITECTURE.md).
