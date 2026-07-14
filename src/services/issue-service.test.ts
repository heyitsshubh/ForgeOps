import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * Unit tests for IssueService.
 *
 * We use Vitest's vi.mock() to isolate the service from:
 *   - GitHub API (octokit)
 *   - Redis (CacheService)
 *   - Prometheus metrics
 *
 * This ensures tests are fast, deterministic, and don't require network access.
 */

// ─── Mock dependencies before importing the module under test ───────────────

vi.mock('../github/auth.js', () => ({
  githubClient: {
    rest: {
      issues: {
        listForRepo: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
      },
      search: {
        issuesAndPullRequests: vi.fn(),
      },
    },
  },
}));

vi.mock('../github/rest-client.js', () => ({
  withGithubErrorHandling: vi.fn((promise) => promise),
}));

vi.mock('../cache/cache-service.js', () => ({
  CacheService: {
    generateKey: vi.fn((...parts: string[]) => parts.join(':')),
    get: vi.fn().mockResolvedValue(null), // Default: cache miss
    set: vi.fn().mockResolvedValue(undefined),
    invalidate: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock('../utils/logger.js', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('../metrics/prometheus.js', () => ({
  redisCacheOperations: { inc: vi.fn() },
  mcpToolCalls: { inc: vi.fn() },
}));

// ─── Import AFTER mocks are registered ──────────────────────────────────────
import { IssueService } from './issue-service.js';
import { githubClient } from '../github/auth.js';
import { CacheService } from '../cache/cache-service.js';

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('IssueService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset cache to always return null (cache miss) between tests
    vi.mocked(CacheService.get).mockResolvedValue(null);
  });

  // ── listIssues ─────────────────────────────────────────────────────────────

  describe('listIssues()', () => {
    it('should call GitHub API when cache misses', async () => {
      const mockData = [{ id: 1, number: 42, title: 'Test issue' }];
      vi.mocked(githubClient.rest.issues.listForRepo).mockResolvedValue(mockData as any);

      const result = await IssueService.listIssues('owner', 'repo', 10);

      expect(githubClient.rest.issues.listForRepo).toHaveBeenCalledOnce();
      expect(githubClient.rest.issues.listForRepo).toHaveBeenCalledWith({
        owner: 'owner',
        repo: 'repo',
        state: 'open',
        per_page: 10,
      });
      expect(result).toEqual(mockData);
    });

    it('should return cached data without calling GitHub API', async () => {
      const cachedData = [{ id: 1, number: 1, title: 'Cached issue' }];
      vi.mocked(CacheService.get).mockResolvedValue(cachedData);

      const result = await IssueService.listIssues('owner', 'repo', 10);

      expect(githubClient.rest.issues.listForRepo).not.toHaveBeenCalled();
      expect(result).toEqual(cachedData);
    });

    it('should store results in cache after a miss', async () => {
      const mockData = [{ id: 1 }];
      vi.mocked(githubClient.rest.issues.listForRepo).mockResolvedValue(mockData as any);

      await IssueService.listIssues('owner', 'repo', 10);

      expect(CacheService.set).toHaveBeenCalledOnce();
      expect(CacheService.set).toHaveBeenCalledWith(expect.any(String), mockData, 60);
    });
  });

  // ── createIssue ────────────────────────────────────────────────────────────

  describe('createIssue()', () => {
    it('should call GitHub API with correct parameters', async () => {
      const mockIssue = { id: 99, number: 5, title: 'New issue' };
      vi.mocked(githubClient.rest.issues.create).mockResolvedValue(mockIssue as any);

      const result = await IssueService.createIssue('owner', 'repo', 'New issue', 'Body text');

      expect(githubClient.rest.issues.create).toHaveBeenCalledWith({
        owner: 'owner',
        repo: 'repo',
        title: 'New issue',
        body: 'Body text',
      });
      expect(result).toEqual(mockIssue);
    });

    it('should invalidate the list cache after creating an issue', async () => {
      vi.mocked(githubClient.rest.issues.create).mockResolvedValue({ id: 1 } as any);

      await IssueService.createIssue('owner', 'repo', 'Title');

      expect(CacheService.invalidate).toHaveBeenCalledOnce();
    });

    it('should work without a body (optional parameter)', async () => {
      vi.mocked(githubClient.rest.issues.create).mockResolvedValue({ id: 1 } as any);

      await IssueService.createIssue('owner', 'repo', 'No body issue');

      expect(githubClient.rest.issues.create).toHaveBeenCalledWith({
        owner: 'owner',
        repo: 'repo',
        title: 'No body issue',
        body: undefined,
      });
    });
  });

  // ── updateIssueState ───────────────────────────────────────────────────────

  describe('updateIssueState()', () => {
    it('should call GitHub API to close an issue', async () => {
      const mockUpdated = { id: 1, state: 'closed' };
      vi.mocked(githubClient.rest.issues.update).mockResolvedValue(mockUpdated as any);

      const result = await IssueService.updateIssueState('owner', 'repo', 42, 'closed');

      expect(githubClient.rest.issues.update).toHaveBeenCalledWith({
        owner: 'owner',
        repo: 'repo',
        issue_number: 42,
        state: 'closed',
      });
      expect(result).toEqual(mockUpdated);
    });

    it('should call GitHub API to reopen an issue', async () => {
      vi.mocked(githubClient.rest.issues.update).mockResolvedValue({ id: 1, state: 'open' } as any);

      await IssueService.updateIssueState('owner', 'repo', 42, 'open');

      expect(githubClient.rest.issues.update).toHaveBeenCalledWith(
        expect.objectContaining({ state: 'open' }),
      );
    });

    it('should invalidate the list cache after updating issue state', async () => {
      vi.mocked(githubClient.rest.issues.update).mockResolvedValue({ id: 1 } as any);

      await IssueService.updateIssueState('owner', 'repo', 42, 'closed');

      expect(CacheService.invalidate).toHaveBeenCalledOnce();
    });
  });
});
