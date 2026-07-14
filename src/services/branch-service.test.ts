import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * Unit tests for BranchService.
 *
 * Mocks GitHub API and CacheService to keep tests fast and isolated.
 */

vi.mock('../github/auth.js', () => ({
  githubClient: {
    rest: {
      repos: {
        listBranches: vi.fn(),
        getBranch: vi.fn(),
      },
      git: {
        createRef: vi.fn(),
        deleteRef: vi.fn(),
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
    get: vi.fn().mockResolvedValue(null),
    set: vi.fn().mockResolvedValue(undefined),
    invalidate: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock('../utils/logger.js', () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

vi.mock('../metrics/prometheus.js', () => ({
  redisCacheOperations: { inc: vi.fn() },
}));

import { BranchService } from './branch-service.js';
import { githubClient } from '../github/auth.js';
import { CacheService } from '../cache/cache-service.js';

describe('BranchService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(CacheService.get).mockResolvedValue(null);
  });

  describe('listBranches()', () => {
    it('should call GitHub API on cache miss', async () => {
      const mockBranches = [{ name: 'main', commit: { sha: 'abc123' }, protected: true }];
      vi.mocked(githubClient.rest.repos.listBranches).mockResolvedValue(mockBranches as any);

      const result = await BranchService.listBranches('owner', 'repo', 30);

      expect(githubClient.rest.repos.listBranches).toHaveBeenCalledWith({
        owner: 'owner',
        repo: 'repo',
        per_page: 30,
      });
      expect(result).toEqual(mockBranches);
    });

    it('should return cached data on cache hit', async () => {
      const cached = [{ name: 'develop' }];
      vi.mocked(CacheService.get).mockResolvedValue(cached);

      const result = await BranchService.listBranches('owner', 'repo');

      expect(githubClient.rest.repos.listBranches).not.toHaveBeenCalled();
      expect(result).toEqual(cached);
    });
  });

  describe('createBranch()', () => {
    it('should create a git ref with the correct branch path', async () => {
      const mockRef = { ref: 'refs/heads/feature/new', url: 'http://...' };
      vi.mocked(githubClient.rest.git.createRef).mockResolvedValue(mockRef as any);

      const result = await BranchService.createBranch('owner', 'repo', 'feature/new', 'deadbeef');

      expect(githubClient.rest.git.createRef).toHaveBeenCalledWith({
        owner: 'owner',
        repo: 'repo',
        ref: 'refs/heads/feature/new',
        sha: 'deadbeef',
      });
      expect(result).toEqual(mockRef);
    });

    it('should invalidate the branch list cache after creation', async () => {
      vi.mocked(githubClient.rest.git.createRef).mockResolvedValue({ ref: 'refs/heads/x' } as any);

      await BranchService.createBranch('owner', 'repo', 'feature/x', 'abc');

      expect(CacheService.invalidate).toHaveBeenCalledOnce();
    });
  });

  describe('deleteBranch()', () => {
    it('should delete using heads/ prefix (not refs/heads/)', async () => {
      vi.mocked(githubClient.rest.git.deleteRef).mockResolvedValue(undefined as any);

      await BranchService.deleteBranch('owner', 'repo', 'feature/old');

      expect(githubClient.rest.git.deleteRef).toHaveBeenCalledWith({
        owner: 'owner',
        repo: 'repo',
        ref: 'heads/feature/old',
      });
    });

    it('should invalidate the branch list cache after deletion', async () => {
      vi.mocked(githubClient.rest.git.deleteRef).mockResolvedValue(undefined as any);

      await BranchService.deleteBranch('owner', 'repo', 'feature/old');

      expect(CacheService.invalidate).toHaveBeenCalledOnce();
    });
  });
});
