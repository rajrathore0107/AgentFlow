# 🌊 AgentFlow

**AgentFlow** is an advanced, production-ready AI Orchestration Platform that allows you to visually build, manage, and execute multi-agent AI pipelines. Powered by **LangGraph**, **Gemini 2.5**, and **Redis/BullMQ**, AgentFlow goes beyond simple chatbots by enabling complex, non-linear agent workflows with long-term memory, sandboxed code execution, and real-time web search.

---

## ✨ Core Features

- **Visual Pipeline Builder**: A beautiful drag-and-drop React Flow interface to design multi-agent architectures (e.g., Researcher → Analyst → Writer).
- **LangGraph State Orchestration**: Agents intelligently pass state, context, and data between one another using a strict graph-based execution engine.
- **Dynamic Tool Binding**: Equip specific agents with superpowers via the UI:
  - 🔍 **Web Search**: Real-time internet access via the Tavily API.
  - ⚙️ **Code Interpreter**: A secure, deterministic `node:vm` sandbox allowing agents to execute JavaScript to solve math or process data.
  - 🧠 **Persistent Vector Memory**: A custom in-memory Cosine Similarity Vector DB that allows agents to recall context from past pipeline executions (RAG).
- **Real-Time WebSocket Streaming**: Watch agents "type" out their thoughts and execute tools live in the Execution Dashboard.
- **Human-in-the-Loop (HITL)**: Pause pipelines mid-execution to require human approval before proceeding to the next agent.
- **Automated Cron Scheduling**: Schedule recurring pipelines (e.g., "Run Market Research every Monday at 9 AM") via BullMQ.
- **Model Routing**: Optimize API costs by dynamically selecting the LLM (Gemini Flash, Pro, or Flash-8B) on a per-agent basis.

---

## 🏗️ Architecture Stack

- **Frontend**: React 18, Vite, React Flow, CSS (Sleek Aurora Aesthetic)
- **Backend**: Node.js, Express, LangChain/LangGraph JS, WebSockets (ws)
- **Database**: PostgreSQL (User Data & Pipeline Configs)
- **Message Queue / Cache**: Redis & BullMQ (Job Scheduling)
- **AI Models**: Google Generative AI (Gemini 2.5)

---

## 🚀 Quick Start (Docker)

AgentFlow is fully containerized for a seamless 1-click deployment.

### 1. Configure Environment Variables
Create a `.env` file in the root directory and add your API keys:
```env
JWT_SECRET=your_super_secret_jwt_key
GEMINI_API_KEY=your_gemini_api_key
TAVILY_API_KEY=your_tavily_api_key
```

### 2. Spin Up the Cluster
Ensure Docker Desktop is running, then execute:
```bash
docker compose up --build -d
```
This will start 4 containers: `agentflow-client`, `agentflow-server`, `postgres`, and `redis`.

### 3. Open the App
Navigate to: **[http://localhost:8080](http://localhost:8080)**

---

## 🛠️ Local Development (Without Docker)
If you prefer running the services directly on your host machine (requires local Postgres and Redis instances):

1. **Start the Backend:**
   ```bash
   cd server
   npm install
   npm run dev
   ```
2. **Start the Frontend:**
   ```bash
   cd client
   npm install
   npm run dev
   ```
   *The frontend will be available at `http://localhost:5173`.*

---

## 🎨 UI Aesthetics
AgentFlow features a premium **Sleek Minimalist** design. It utilizes deep obsidian backgrounds, sharp geometric borders, and a dynamic "Aurora" radial gradient mesh for a modern, enterprise-grade feel. All styles are handled purely via custom CSS properties for maximum performance.

---

*Built with ❤️ for advanced AI Orchestration.*
