import { githubClient } from '../github/auth.js';
import { withGithubErrorHandling } from '../github/rest-client.js';
import { CacheService } from '../cache/cache-service.js';

export class PRService {
  /**
   * Lists open Pull Requests for a repository.
   */
  static async listPRs(owner: string, repo: string, limit: number = 10) {
    const cacheKey = CacheService.generateKey('prs', 'list', owner, repo, limit.toString());
    const cached = await CacheService.get<any>(cacheKey);
    if (cached) return cached;

    const data = await withGithubErrorHandling(
      githubClient.rest.pulls.list({
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
   * Fetches the raw diff of a Pull Request.
   */
  static async fetchDiff(owner: string, repo: string, pullNumber: number) {
    const cacheKey = CacheService.generateKey('prs', 'diff', owner, repo, pullNumber.toString());
    const cached = await CacheService.get<any>(cacheKey);
    if (cached) return cached;

    const data = await withGithubErrorHandling(
      githubClient.rest.pulls.get({
        owner,
        repo,
        pull_number: pullNumber,
        mediaType: {
          format: 'diff',
        },
      }),
    );

    await CacheService.set(cacheKey, data, 120);
    return data;
  }

  /**
   * Creates a new Pull Request.
   */
  static async createPR(
    owner: string,
    repo: string,
    title: string,
    head: string,
    base: string,
    body?: string,
  ) {
    const data = await withGithubErrorHandling(
      githubClient.rest.pulls.create({
        owner,
        repo,
        title,
        head,
        base,
        body,
      }),
    );

    const cacheKey = CacheService.generateKey('prs', 'list', owner, repo, '10');
    await CacheService.invalidate(cacheKey);

    return data;
  }

  /**
   * Submits a review on a Pull Request.
   */
  static async reviewPR(
    owner: string,
    repo: string,
    pullNumber: number,
    event: 'APPROVE' | 'REQUEST_CHANGES' | 'COMMENT',
    body?: string,
  ) {
    const data = await withGithubErrorHandling(
      githubClient.rest.pulls.createReview({
        owner,
        repo,
        pull_number: pullNumber,
        event,
        body,
      }),
    );
    return data;
  }

  /**
   * Merges a Pull Request.
   */
  static async mergePR(
    owner: string,
    repo: string,
    pullNumber: number,
    commitTitle?: string,
    mergeMethod: 'merge' | 'squash' | 'rebase' = 'merge',
  ) {
    const data = await withGithubErrorHandling(
      githubClient.rest.pulls.merge({
        owner,
        repo,
        pull_number: pullNumber,
        commit_title: commitTitle,
        merge_method: mergeMethod,
      }),
    );

    const cacheKey = CacheService.generateKey('prs', 'list', owner, repo, '10');
    await CacheService.invalidate(cacheKey);

    return data;
  }
}
