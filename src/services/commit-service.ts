import { githubClient } from '../github/auth.js';
import { withGithubErrorHandling } from '../github/rest-client.js';
import { CacheService } from '../cache/cache-service.js';

export class CommitService {
  /**
   * Lists commits in a repository.
   */
  static async listCommits(owner: string, repo: string, limit: number = 30, branchOrSha?: string) {
    const cacheKey = CacheService.generateKey(
      'commits',
      'list',
      owner,
      repo,
      limit.toString(),
      branchOrSha || 'default',
    );
    const cached = await CacheService.get<any>(cacheKey);
    if (cached) return cached;

    const data = await withGithubErrorHandling(
      githubClient.rest.repos.listCommits({
        owner,
        repo,
        per_page: limit,
        sha: branchOrSha, // Can be a branch name or commit hash
      }),
    );

    await CacheService.set(cacheKey, data, 60);
    return data;
  }

  /**
   * Gets details of a specific commit, including raw diffs.
   */
  static async getCommit(owner: string, repo: string, ref: string) {
    const cacheKey = CacheService.generateKey('commits', 'get', owner, repo, ref);
    const cached = await CacheService.get<any>(cacheKey);
    if (cached) return cached;

    const data = await withGithubErrorHandling(
      githubClient.rest.repos.getCommit({
        owner,
        repo,
        ref,
      }),
    );

    // Commits are immutable, so we can cache them heavily.
    await CacheService.set(cacheKey, data, 3600); // Cache for 1 hour
    return data;
  }
}
