# ForgeOps

> **AI-Powered GitHub Engineering Assistant** — A production-grade [Model Context Protocol (MCP)](https://modelcontextprotocol.io) server that gives AI assistants like Claude full control over GitHub repositories.

[![Node.js](https://img.shields.io/badge/node-20%2B-brightgreen)](https://nodejs.org)
[![TypeScript](https://img.shields.io/badge/typescript-5%2B-blue)](https://typescriptlang.org)
[![MCP SDK](https://img.shields.io/badge/MCP%20SDK-1.29.0-purple)](https://github.com/modelcontextprotocol/sdk)
[![License: ISC](https://img.shields.io/badge/license-ISC-lightgrey)](./LICENSE)
[![Tests](https://img.shields.io/badge/tests-21%20passing-success)](./src)

---

## What is ForgeOps?

ForgeOps connects Claude Desktop (or any MCP-compatible AI client) directly to your GitHub repositories. Instead of copy-pasting code into a chat window, Claude can natively:

- 📋 **Read and manage Issues** — list, search, create, and close
- 🔀 **Review Pull Requests** — fetch raw diffs, approve, request changes, and merge
- 🌿 **Manipulate Branches** — list, create, and delete Git references
- 📜 **Inspect Commit History** — walk the git log and read exact file-level diffs
- ⚙️ **Control CI/CD** — trigger, re-run, cancel, and monitor GitHub Actions workflows
- 📊 **Analyse Repository Health** — contributor stats, commit velocity, code frequency, and traffic

All of this runs locally on your machine over `stdio` — no cloud dependencies, no third-party data sharing.

---

## Architecture

```
┌──────────────────────────────────────────────────────┐
│                  Claude Desktop (AI)                  │
└────────────────────────┬─────────────────────────────┘
                         │  JSON-RPC over stdio
                         ▼
┌──────────────────────────────────────────────────────┐
│                 ForgeOps MCP Server                   │
│  ┌─────────────┐   ┌──────────────┐  ┌────────────┐ │
│  │ Tool        │   │  Business    │  │  GitHub    │ │
│  │ Registry    │──▶│  Services    │─▶│  Clients   │ │
│  └─────────────┘   └──────────────┘  └────────────┘ │
│         │                │                           │
│         │         ┌──────▼──────┐                   │
│         │         │ Redis Cache │                   │
│         │         └─────────────┘                   │
│         │                                            │
│  ┌──────▼──────────────────────────────────────┐    │
│  │  Prometheus /metrics  │  OpenTelemetry       │    │
│  └─────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────┘
```

### Layer Responsibilities

| Layer | Location | Responsibility |
|-------|----------|---------------|
| **MCP Server** | `src/mcp/` | stdio transport, tool dispatch via `ToolRegistry` |
| **Tools** | `src/tools/` | Zod schema validation, request/response shaping |
| **Services** | `src/services/` | Business logic, cache-first data access |
| **GitHub Clients** | `src/github/` | Resilient REST + GraphQL wrappers with retry/throttle |
| **Cache** | `src/cache/` | Redis-backed TTL cache with graceful degradation |
| **Observability** | `src/metrics/`, `src/tracing/` | Prometheus metrics, OpenTelemetry tracing |

---

## Tools Reference

### 📋 Issues (4 tools)

| Tool | Description |
|------|-------------|
| `list_issues` | List open issues in a repository |
| `search_issues` | Search issues using GitHub search syntax |
| `create_issue` | Create a new issue |
| `update_issue_state` | Close or reopen an existing issue |

### 🔀 Pull Requests (5 tools)

| Tool | Description |
|------|-------------|
| `list_pull_requests` | List open PRs |
| `fetch_pr_diff` | Fetch the raw git diff of a PR |
| `create_pull_request` | Open a new PR between two branches |
| `review_pull_request` | Submit APPROVE / REQUEST_CHANGES / COMMENT review |
| `merge_pull_request` | Merge via merge, squash, or rebase strategy |

### 🌿 Branches (4 tools)

| Tool | Description |
|------|-------------|
| `list_branches` | List all branches |
| `get_branch` | Get branch details and latest commit author |
| `create_branch` | Create a new branch from a commit SHA |
| `delete_branch` | Delete a branch |

### 📜 Commits (2 tools)

| Tool | Description |
|------|-------------|
| `list_commits` | List commit history (optionally scoped to a branch/SHA) |
| `get_commit` | Get a commit's full diff with per-file patch |

### ⚙️ GitHub Actions (6 tools)

| Tool | Description |
|------|-------------|
| `list_workflows` | List all workflow definitions |
| `list_workflow_runs` | List recent runs for a workflow |
| `get_workflow_run_logs_url` | Get the log download URL for a run |
| `trigger_workflow` | Fire a `workflow_dispatch` event |
| `rerun_workflow` | Re-run a failed or cancelled workflow |
| `cancel_workflow_run` | Cancel an in-progress workflow run |

### 📊 Repository Analytics (6 tools)

| Tool | Description |
|------|-------------|
| `get_repo_info` | Stars, forks, language, topics, license, open issues |
| `get_contributors` | Top contributors sorted by commit count |
| `get_commit_activity` | Weekly commit velocity for the last 12 weeks |
| `get_code_frequency` | Lines added/deleted per week |
| `get_traffic_views` | Page view traffic (last 14 days) |
| `list_labels` | All issue labels with colors and descriptions |

---

## Quick Start

### 1. Prerequisites

- Node.js 20+
- A GitHub Personal Access Token ([create one here](https://github.com/settings/personal-access-tokens/new)) with `repo` and `read:org` scopes
- Redis (optional — the server degrades gracefully without it)

### 2. Clone and Install

```bash
git clone https://github.com/heyitsshubh/ForgeOps.git
cd ForgeOps
npm install
```

### 3. Configure Environment

```bash
cp .env.example .env
```

Edit `.env`:

```env
GITHUB_TOKEN=ghp_your_token_here
REDIS_URL=redis://localhost:6379   # optional
PROMETHEUS_PORT=9090
LOG_LEVEL=info
```

### 4. Build

```bash
npm run build
```

### 5. Test with MCP Inspector

```bash
npx -y @modelcontextprotocol/inspector node dist/index.js
```

Open the URL shown in your terminal, click **Connect**, then explore all 27 tools from the **Tools** tab.

---

## Claude Desktop Integration

Add the following to your `claude_desktop_config.json`:

**Windows**: `%APPDATA%\Claude\claude_desktop_config.json`  
**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "forgeops": {
      "command": "node",
      "args": ["C:\\path\\to\\ForgeOps\\dist\\index.js"],
      "env": {
        "GITHUB_TOKEN": "ghp_your_token_here",
        "REDIS_URL": "redis://localhost:6379",
        "LOG_LEVEL": "info"
      }
    }
  }
}
```

Restart Claude Desktop. You will see a 🔨 icon in the chat bar indicating ForgeOps is connected.

**Try asking Claude:**
> *"List the open issues in my repository and create a summary grouped by label."*

> *"Fetch the diff for PR #42 and identify any potential security issues."*

> *"Check the CI status for the last 5 commits on main."*

---

## Docker

### Run with Docker Compose (recommended)

```bash
# Copy and configure your environment
cp .env.example .env

# Build and start ForgeOps + Redis + Prometheus
docker compose up --build
```

This starts:
- `forgeops-mcp` — the MCP server (Prometheus metrics on `:9090`)
- `forgeops-redis` — Redis cache with LRU eviction and persistence
- `forgeops-prometheus` — Prometheus scraping metrics on `:9091`

### Build the image manually

```bash
docker build -t forgeops:latest .
```

---

## Observability

### Prometheus Metrics

Visit `http://localhost:9090/metrics` while the server is running to see:

```
# Tool call counters (by tool name)
forgeops_mcp_tool_calls_total{tool="list_issues"} 12

# Redis cache performance
forgeops_redis_cache_operations_total{result="hit"} 8
forgeops_redis_cache_operations_total{result="miss"} 4

# GitHub API rate limit remaining
forgeops_github_rate_limit_remaining 4923
```

### OpenTelemetry

Distributed traces are captured via auto-instrumentation. In production, configure `OTEL_EXPORTER_OTLP_ENDPOINT` to export spans to Jaeger, Datadog, or any OTLP-compatible backend.

---

## Development

```bash
# Run in watch mode (auto-reloads on save)
npm run dev

# Type-check + compile
npm run build

# Run all 21 unit tests
npm test

# Format source files
npm run format
```

### Project Structure

```
ForgeOps/
├── src/
│   ├── cache/              # Redis CacheService
│   ├── config/             # Zod-validated environment variables
│   ├── github/             # Octokit REST + GraphQL clients
│   ├── mcp/                # MCP server + ToolRegistry
│   ├── metrics/            # Prometheus counters and gauges
│   ├── services/           # Business logic (IssueService, PRService, ...)
│   ├── tools/              # MCP tool handlers (issues.ts, prs.ts, ...)
│   ├── tracing/            # OpenTelemetry SDK setup
│   ├── utils/              # Shared logger
│   └── index.ts            # Application entry point
├── Dockerfile              # Multi-stage production image
├── docker-compose.yml      # Full stack orchestration
├── prometheus.yml          # Prometheus scrape config
├── vitest.config.ts        # Test configuration
└── .env.example            # Environment variable template
```

### Git Flow

This project follows [Git Flow](https://nvie.com/posts/a-successful-git-branching-model/):

- `main` — production-ready releases only
- `develop` — integration branch, always deployable
- `feature/*` — one branch per feature, merged into `develop` via PR

All commits follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:
```
feat(issues): implement create_issue tool
fix(mcp): resolve stdio stream corruption on Windows
test(services): add unit tests for BranchService
```

---

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Write your changes following the Clean Architecture pattern
4. Add tests for any new service methods
5. Run `npm test` and `npm run build` — both must pass
6. Open a Pull Request against `develop`

---

## License

ISC © [heyitsshubh](https://github.com/heyitsshubh)