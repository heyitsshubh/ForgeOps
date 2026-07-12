import { RequestError } from 'octokit';
import { logger } from '../utils/logger.js';

/**
 * Executes a GitHub REST API request and translates raw HTTP errors
 * into human-readable strings that the MCP client (LLM) can easily understand.
 *
 * @param requestFn A promise returning an Octokit response
 * @returns The successful data or throws a human-friendly error
 */
export async function withGithubErrorHandling<T>(requestFn: Promise<{ data: T }>): Promise<T> {
  try {
    const response = await requestFn;
    return response.data;
  } catch (error: any) {
    if (error instanceof RequestError) {
      const status = error.status;
      const url = error.request.url;

      logger.error(
        { context: 'GitHubRestClient', status, url, message: error.message },
        'GitHub REST API request failed',
      );

      // Translate specific HTTP status codes into human-friendly MCP responses
      switch (status) {
        case 401:
          throw new Error(
            'GITHUB_AUTH_FAILED: Your GitHub token is invalid or expired. Please check your credentials.',
          );
        case 403:
          throw new Error(
            `GITHUB_FORBIDDEN: You do not have permission to perform this action. Wait for rate limits to reset or check your token scopes. (Error: ${error.message})`,
          );
        case 404:
          throw new Error(
            `GITHUB_NOT_FOUND: The requested resource could not be found. Please check the repository name, issue number, or branch name. (URL: ${url})`,
          );
        case 422:
          throw new Error(
            `GITHUB_VALIDATION_FAILED: The data provided was invalid. (Details: ${error.message})`,
          );
        case 429:
          throw new Error(
            'GITHUB_RATE_LIMIT: We have hit the GitHub API rate limit. Please try again later.',
          );
        case 500:
        case 502:
        case 503:
        case 504:
          throw new Error(
            `GITHUB_SERVER_ERROR: GitHub is currently experiencing downtime or errors (${status}).`,
          );
        default:
          throw new Error(`GITHUB_API_ERROR: An unexpected error occurred: ${error.message}`);
      }
    }

    // Unhandled or non-Octokit errors
    logger.error({ context: 'GitHubRestClient', error }, 'Unknown error executing GitHub request');
    throw new Error(`UNKNOWN_ERROR: ${error instanceof Error ? error.message : String(error)}`);
  }
}
