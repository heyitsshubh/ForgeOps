# ForgeOps ⚒️
**AI-Powered GitHub Engineering Assistant (MCP)**

ForgeOps is a production-grade Model Context Protocol (MCP) server that enables AI clients (like Claude Desktop, Cursor, and VS Code) to interact intelligently with GitHub repositories.

Built with **Clean Architecture** principles, ForgeOps is designed for scale, resilience, and deep observability, offering a suite of powerful tools for issues, pull requests, branch management, and repository analytics.

---

## 🏗️ Architecture

ForgeOps operates entirely locally over `stdio`, ensuring your AI interactions remain secure. It uses a robust infrastructure layer:

*   **Model Context Protocol (MCP)**: Native integration via `@modelcontextprotocol/sdk`.
*   **GitHub Clients**: Highly resilient REST and GraphQL clients using `octokit`, featuring automatic rate-limit throttling and intelligent error translation for the LLM.
*   **Caching Layer (Redis)**: Aggressive caching of read-heavy GitHub endpoints to save rate limits and ensure lightning-fast AI responses.
*   **Structured Logging (Pino)**: High-performance JSON logging.
*   **Metrics (Prometheus)**: Built-in `/metrics` server (default port `9090`) tracking API limits, cache hits/misses, and system errors.
*   **Distributed Tracing (OpenTelemetry)**: Auto-instrumentation for deep latency analysis across Redis and GitHub API calls.

---

## 🚀 Getting Started

### Prerequisites
1.  **Node.js** (v18 or higher)
2.  **Redis** (Local instance or Docker container)
3.  **GitHub Personal Access Token (PAT)**

### Installation
Clone the repository and install dependencies:
```bash
git clone https://github.com/heyitsshubh/ForgeOps.git
cd ForgeOps
npm install
```

### Configuration
Create a `.env` file in the root directory (or inject these into your environment):

```env
# Required: Your GitHub Personal Access Token
GITHUB_TOKEN=ghp_your_token_here

# Optional Configurations
LOG_LEVEL=info                     # trace | debug | info | warn | error | fatal
REDIS_URL=redis://localhost:6379   # Connection string for Redis caching
PROMETHEUS_PORT=9090               # Port to expose Prometheus metrics scraper
OTEL_SERVICE_NAME=forgeops-mcp     # OpenTelemetry service name
```

### Building & Running
To run the server in development mode (with hot-reloading and pretty-printing logs):
```bash
npm run dev
```

To build for production:
```bash
npm run build
npm start
```

---

## 🔌 Integrating with Claude Desktop

To use ForgeOps with Claude Desktop, you need to add it to your `claude_desktop_config.json` file.

**Path to config:**
*   **Mac**: `~/Library/Application Support/Claude/claude_desktop_config.json`
*   **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

**Configuration:**
```json
{
  "mcpServers": {
    "forgeops": {
      "command": "node",
      "args": ["/absolute/path/to/ForgeOps/dist/index.js"],
      "env": {
        "GITHUB_TOKEN": "ghp_your_token_here",
        "REDIS_URL": "redis://localhost:6379"
      }
    }
  }
}
```

---

## 🛠️ Features (Development Roadmap)

- [x] **Infrastructure**: Pino, Prometheus, OpenTelemetry, Redis, Zod Config
- [x] **GitHub Client**: Resilient REST & GraphQL wrappers
- [x] **Context Resolver**: Intelligent target-repository resolution
- [ ] **Issue Tools**: Search, read, create, and manage GitHub issues.
- [ ] **Pull Request Tools**: Review code, fetch diffs, assign reviewers, and merge PRs.
- [ ] **Branch & Commit Tools**: Compare branches, list commits, and trace history.
- [ ] **Workflow Tools**: Monitor and manage GitHub Actions.
- [ ] **Repository Analytics**: Fetch stats, languages, and contributor insights.

---

## 🤝 Contributing
ForgeOps strictly follows **Git Flow** and **Conventional Commits**. Please branch off `develop` and ensure all tests and linters pass before submitting a Pull Request.