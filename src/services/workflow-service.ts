import { githubClient } from '../github/auth.js';
import { withGithubErrorHandling } from '../github/rest-client.js';
import { CacheService } from '../cache/cache-service.js';

export class WorkflowService {
  /**
   * Lists all GitHub Actions workflows in a repository.
   */
  static async listWorkflows(owner: string, repo: string) {
    const cacheKey = CacheService.generateKey('workflows', 'list', owner, repo);
    const cached = await CacheService.get<any>(cacheKey);
    if (cached) return cached;

    const data = await withGithubErrorHandling(
      githubClient.rest.actions.listRepoWorkflows({
        owner,
        repo,
      }),
    );

    await CacheService.set(cacheKey, data, 300); // Workflows don't change often, 5 min cache
    return data;
  }

  /**
   * Lists recent runs for a specific workflow.
   */
  static async listWorkflowRuns(
    owner: string,
    repo: string,
    workflowId: number | string,
    limit: number = 10,
  ) {
    const cacheKey = CacheService.generateKey(
      'workflows',
      'runs',
      owner,
      repo,
      workflowId.toString(),
      limit.toString(),
    );
    const cached = await CacheService.get<any>(cacheKey);
    if (cached) return cached;

    const data = await withGithubErrorHandling(
      githubClient.rest.actions.listWorkflowRuns({
        owner,
        repo,
        workflow_id: workflowId,
        per_page: limit,
      }),
    );

    await CacheService.set(cacheKey, data, 30); // Runs update frequently, 30 sec cache
    return data;
  }

  /**
   * Gets the logs URL for a specific workflow run.
   */
  static async getWorkflowRunLogs(owner: string, repo: string, runId: number) {
    // Logs are dynamic, so we don't cache them
    const data = await withGithubErrorHandling(
      githubClient.rest.actions.downloadWorkflowRunLogs({
        owner,
        repo,
        run_id: runId,
        request: {
          redirect: 'manual',
        },
      }),
    );
    return data;
  }

  /**
   * Triggers a workflow run (workflow_dispatch event).
   */
  static async triggerWorkflow(
    owner: string,
    repo: string,
    workflowId: number | string,
    ref: string,
    inputs?: Record<string, string>,
  ) {
    const data = await withGithubErrorHandling(
      githubClient.rest.actions.createWorkflowDispatch({
        owner,
        repo,
        workflow_id: workflowId,
        ref,
        inputs,
      }),
    );

    // Invalidate the runs cache
    const cacheKey = CacheService.generateKey(
      'workflows',
      'runs',
      owner,
      repo,
      workflowId.toString(),
      '10',
    );
    await CacheService.invalidate(cacheKey);

    return data;
  }

  /**
   * Re-runs a failed workflow run.
   */
  static async rerunWorkflow(owner: string, repo: string, runId: number) {
    const data = await withGithubErrorHandling(
      githubClient.rest.actions.reRunWorkflow({
        owner,
        repo,
        run_id: runId,
      }),
    );
    return data;
  }

  /**
   * Cancels a running workflow run.
   */
  static async cancelWorkflowRun(owner: string, repo: string, runId: number) {
    const data = await withGithubErrorHandling(
      githubClient.rest.actions.cancelWorkflowRun({
        owner,
        repo,
        run_id: runId,
      }),
    );
    return data;
  }
}
