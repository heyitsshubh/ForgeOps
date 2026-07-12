import { GraphqlResponseError } from '@octokit/graphql';
import { logger } from '../utils/logger.js';

/**
 * Executes a GitHub GraphQL API request and translates complex GraphQL errors
 * into human-readable strings for the MCP client (LLM).
 *
 * @param requestFn A promise returning a GraphQL response payload
 * @returns The successful data or throws a human-friendly error
 */
export async function withGithubGraphQLErrorHandling<T>(requestFn: Promise<T>): Promise<T> {
  try {
    return await requestFn;
  } catch (error: any) {
    if (error instanceof GraphqlResponseError) {
      logger.error(
        {
          context: 'GitHubGraphQLClient',
          errors: error.errors,
          query: error.request.query,
        },
        'GitHub GraphQL API request failed',
      );

      // GraphQL usually returns 200 OK but includes an "errors" array.
      // We extract the first meaningful error message for the AI.
      const firstErrorMessage = error.errors?.[0]?.message || error.message;

      // Handle common GraphQL specific errors
      if (firstErrorMessage.includes('Could not resolve to a node')) {
        throw new Error(
          `GITHUB_GRAPHQL_NOT_FOUND: Could not find the requested GitHub resource. Ensure the ID or name is correct. (Details: ${firstErrorMessage})`,
        );
      }

      if (firstErrorMessage.includes('Resource not accessible by integration')) {
        throw new Error(
          `GITHUB_GRAPHQL_FORBIDDEN: The token lacks permission to perform this GraphQL query. (Details: ${firstErrorMessage})`,
        );
      }

      throw new Error(`GITHUB_GRAPHQL_ERROR: The GraphQL query failed: ${firstErrorMessage}`);
    }

    // Unhandled or non-GraphQL errors (e.g. network drop)
    logger.error(
      { context: 'GitHubGraphQLClient', error },
      'Unknown error executing GraphQL request',
    );
    throw new Error(`UNKNOWN_ERROR: ${error instanceof Error ? error.message : String(error)}`);
  }
}
