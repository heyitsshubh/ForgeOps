import { githubClient } from '../github/auth.js';
import { withGithubErrorHandling } from '../github/rest-client.js';
import { CacheService } from '../cache/cache-service.js';

export class AnalyticsService {
  /**
   * Gets general repository metadata and statistics.
   */
  static async getRepoInfo(owner: string, repo: string) {
    const cacheKey = CacheService.generateKey('analytics', 'repo', owner, repo);
    const cached = await CacheService.get<any>(cacheKey);
    if (cached) return cached;

    const data = await withGithubErrorHandling(githubClient.rest.repos.get({ owner, repo }));

    await CacheService.set(cacheKey, data, 300);
    return data;
  }

  /**
   * Lists top contributors sorted by number of commits.
   */
  static async getContributors(owner: string, repo: string, limit: number = 10) {
    const cacheKey = CacheService.generateKey(
      'analytics',
      'contributors',
      owner,
      repo,
      limit.toString(),
    );
    const cached = await CacheService.get<any>(cacheKey);
    if (cached) return cached;

    const data = await withGithubErrorHandling(
      githubClient.rest.repos.listContributors({
        owner,
        repo,
        per_page: limit,
      }),
    );

    await CacheService.set(cacheKey, data, 600); // 10 min — contributor list changes slowly
    return data;
  }

  /**
   * Gets weekly commit activity for the past year.
   */
  static async getCommitActivity(owner: string, repo: string) {
    const cacheKey = CacheService.generateKey('analytics', 'commit-activity', owner, repo);
    const cached = await CacheService.get<any>(cacheKey);
    if (cached) return cached;

    const data = await withGithubErrorHandling(
      githubClient.rest.repos.getCommitActivityStats({ owner, repo }) as any
    );

    await CacheService.set(cacheKey, data, 3600); // 1 hour — stats are computed weekly
    return data;
  }

  /**
   * Gets code frequency stats (additions/deletions per week).
   */
  static async getCodeFrequency(owner: string, repo: string) {
    const cacheKey = CacheService.generateKey('analytics', 'code-frequency', owner, repo);
    const cached = await CacheService.get<any>(cacheKey);
    if (cached) return cached;

    const data = await withGithubErrorHandling(
      githubClient.rest.repos.getCodeFrequencyStats({ owner, repo }) as any
    );

    await CacheService.set(cacheKey, data, 3600);
    return data;
  }

  /**
   * Gets the top 10 referrers and popular content for the last 14 days.
   * Requires push access to the repository.
   */
  static async getTrafficViews(owner: string, repo: string) {
    const cacheKey = CacheService.generateKey('analytics', 'traffic-views', owner, repo);
    const cached = await CacheService.get<any>(cacheKey);
    if (cached) return cached;

    const data = await withGithubErrorHandling(
      githubClient.rest.repos.getViews({ owner, repo, per: 'week' }),
    );

    await CacheService.set(cacheKey, data, 3600);
    return data;
  }

  /**
   * Gets all open issues and PRs grouped by label for a prioritization view.
   */
  static async listLabels(owner: string, repo: string) {
    const cacheKey = CacheService.generateKey('analytics', 'labels', owner, repo);
    const cached = await CacheService.get<any>(cacheKey);
    if (cached) return cached;

    const data = await withGithubErrorHandling(
      githubClient.rest.issues.listLabelsForRepo({
        owner,
        repo,
        per_page: 100,
      }),
    );

    await CacheService.set(cacheKey, data, 300);
    return data;
  }
}
