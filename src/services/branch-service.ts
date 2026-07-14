import { githubClient } from '../github/auth.js';
import { withGithubErrorHandling } from '../github/rest-client.js';
import { CacheService } from '../cache/cache-service.js';

export class BranchService {
  /**
   * Lists all branches in a repository.
   */
  static async listBranches(owner: string, repo: string, limit: number = 30) {
    const cacheKey = CacheService.generateKey('branches', 'list', owner, repo, limit.toString());
    const cached = await CacheService.get<any>(cacheKey);
    if (cached) return cached;

    const data = await withGithubErrorHandling(
      githubClient.rest.repos.listBranches({
        owner,
        repo,
        per_page: limit,
      }),
    );

    await CacheService.set(cacheKey, data, 60);
    return data;
  }

  /**
   * Gets details of a specific branch.
   */
  static async getBranch(owner: string, repo: string, branch: string) {
    const cacheKey = CacheService.generateKey('branches', 'get', owner, repo, branch);
    const cached = await CacheService.get<any>(cacheKey);
    if (cached) return cached;

    const data = await withGithubErrorHandling(
      githubClient.rest.repos.getBranch({
        owner,
        repo,
        branch,
      }),
    );

    await CacheService.set(cacheKey, data, 60);
    return data;
  }

  /**
   * Creates a new branch from a base branch or SHA.
   */
  static async createBranch(owner: string, repo: string, branchName: string, baseSha: string) {
    const data = await withGithubErrorHandling(
      githubClient.rest.git.createRef({
        owner,
        repo,
        ref: `refs/heads/${branchName}`,
        sha: baseSha,
      }),
    );

    // Invalidate list cache
    const cacheKey = CacheService.generateKey('branches', 'list', owner, repo, '30');
    await CacheService.invalidate(cacheKey);

    return data;
  }

  /**
   * Deletes a branch.
   */
  static async deleteBranch(owner: string, repo: string, branchName: string) {
    const data = await withGithubErrorHandling(
      githubClient.rest.git.deleteRef({
        owner,
        repo,
        ref: `heads/${branchName}`,
      }),
    );

    // Invalidate list cache
    const cacheKey = CacheService.generateKey('branches', 'list', owner, repo, '30');
    await CacheService.invalidate(cacheKey);

    return data;
  }
}
