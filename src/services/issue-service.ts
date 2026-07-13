import { githubClient } from '../github/auth.js';
import { withGithubErrorHandling } from '../github/rest-client.js';
import { CacheService } from '../cache/cache-service.js';

export class IssueService {
  /**
   * Searches for issues across a repository (or globally).
   */
  static async searchIssues(query: string, limit: number = 10) {
    const cacheKey = CacheService.generateKey('issues', 'search', query, limit.toString());
    const cached = await CacheService.get<any>(cacheKey);
    if (cached) return cached;

    const data = await withGithubErrorHandling(
      githubClient.rest.search.issuesAndPullRequests({
        q: query,
        per_page: limit,
      }),
    );

    await CacheService.set(cacheKey, data, 60);
    return data;
  }

  /**
   * Lists open issues for a repository.
   * This is a read-heavy operation, so we cache it for 60 seconds.
   */
  static async listIssues(owner: string, repo: string, limit: number = 10) {
    const cacheKey = CacheService.generateKey('issues', 'list', owner, repo, limit.toString());
    const cached = await CacheService.get<any>(cacheKey);
    if (cached) return cached;

    const data = await withGithubErrorHandling(
      githubClient.rest.issues.listForRepo({
        owner,
        repo,
        state: 'open',
        per_page: limit,
      }),
    );

    await CacheService.set(cacheKey, data, 60);
    return data;
  }

  /**
   * Creates a new issue.
   * Automatically invalidates the issue list cache for this repo.
   */
  static async createIssue(owner: string, repo: string, title: string, body?: string) {
    const data = await withGithubErrorHandling(
      githubClient.rest.issues.create({
        owner,
        repo,
        title,
        body,
      }),
    );

    // Invalidate the list cache so the next request sees the new issue
    // (In a real app, we might use pattern deletion or tag invalidation)
    const cacheKey = CacheService.generateKey('issues', 'list', owner, repo, '10');
    await CacheService.invalidate(cacheKey);

    return data;
  }

  /**
   * Updates an issue's state (e.g., closing or reopening).
   */
  static async updateIssueState(
    owner: string,
    repo: string,
    issueNumber: number,
    state: 'open' | 'closed',
  ) {
    const data = await withGithubErrorHandling(
      githubClient.rest.issues.update({
        owner,
        repo,
        issue_number: issueNumber,
        state,
      }),
    );

    // Invalidate list cache
    const cacheKey = CacheService.generateKey('issues', 'list', owner, repo, '10');
    await CacheService.invalidate(cacheKey);

    return data;
  }
}
