# Contributing to ForgeOps

Thank you for your interest in contributing! This guide will get you up and running quickly.

## Development Setup

```bash
git clone https://github.com/heyitsshubh/ForgeOps.git
cd ForgeOps
npm install
cp .env.example .env   # Fill in your GITHUB_TOKEN
npm run build
```

## Git Flow

We follow [Git Flow](https://nvie.com/posts/a-successful-git-branching-model/):

| Branch | Purpose |
|--------|---------|
| `main` | Production releases only — never commit directly |
| `develop` | Integration branch — always deployable |
| `feature/*` | One branch per feature, opened as PR against `develop` |
| `fix/*` | Bug fixes |
| `hotfix/*` | Emergency patches applied directly to `main` |

### Creating a Feature

```bash
git checkout develop
git checkout -b feature/my-awesome-feature
# ... work ...
git commit -m "feat(scope): what this commit does"
git push -u origin feature/my-awesome-feature
# Open a PR against develop on GitHub
```

## Commit Convention

All commits must follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <description>
```

| Type | When to use |
|------|-------------|
| `feat` | A new feature or tool |
| `fix` | A bug fix |
| `test` | Adding or updating tests |
| `docs` | Documentation only |
| `refactor` | Code restructuring without behaviour change |
| `chore` | Build scripts, config, CI changes |
| `perf` | Performance improvements |

**Examples:**
```
feat(issues): implement search_issues tool
fix(mcp): resolve stdio stream corruption
test(services): add 21 unit tests for IssueService
docs: update Claude Desktop integration guide
```

## Adding a New Tool

1. **Create the service** in `src/services/your-service.ts`
   - Follow the `static async method()` pattern
   - Always check cache before calling GitHub API
   - Always set cache after a successful GitHub API call
   - Invalidate relevant cache keys after write operations

2. **Create the tool handlers** in `src/tools/your-tools.ts`
   - Define Zod schemas for all inputs
   - Register each tool via `toolRegistry.register()`
   - Cast schemas with `as any` when passing to `zodToJsonSchema()`

3. **Import the tool file** in `src/mcp/server.ts`:
   ```ts
   import '../tools/your-tools.js';
   ```

4. **Write tests** in `src/services/your-service.test.ts`
   - Mock `githubClient`, `CacheService`, `logger`, and `metrics`
   - Test cache hit, cache miss, and cache invalidation paths

5. **Verify everything builds and tests pass:**
   ```bash
   npm run build
   npm test
   ```

## Testing

```bash
npm test             # Run all unit tests
npm run test:watch   # Watch mode during development
```

All tests run without network access — we mock all external dependencies using `vi.mock()`.

## Code Style

We use **Prettier** for formatting. Before committing:

```bash
npm run format
```

TypeScript strict mode is enabled. No `any` types unless explicitly needed for third-party library interop.

## Pull Request Checklist

- [ ] Branch created from `develop` (not `main`)
- [ ] Commit messages follow Conventional Commits format
- [ ] `npm run build` passes with zero errors
- [ ] `npm test` passes with all tests green
- [ ] New service methods have unit tests
- [ ] README updated if new tools were added
