import { Octokit } from 'octokit';
import { retry } from '@octokit/plugin-retry';
import { throttling } from '@octokit/plugin-throttling';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';

/**
 * Initializes and returns a configured Octokit instance.
 * We encapsulate this to ensure that authentication and core client
 * setup (e.g., attaching custom fetch behavior or logging) is centralized.
 */
export const initializeGitHubClient = (): Octokit => {
  logger.debug('Initializing GitHub Octokit client');

  const EnhancedOctokit = Octokit.plugin(retry, throttling);

  const octokit = new EnhancedOctokit({
    auth: env.GITHUB_TOKEN,
    log: {
      debug: (msg: string) => logger.debug({ context: 'Octokit' }, msg),
      info: (msg: string) => logger.info({ context: 'Octokit' }, msg),
      warn: (msg: string) => logger.warn({ context: 'Octokit' }, msg),
      error: (msg: string) => logger.error({ context: 'Octokit' }, msg),
    },
    throttle: {
      onRateLimit: (retryAfter: number, options: any, octokit: any, retryCount: number) => {
        logger.warn(
          { context: 'OctokitThrottling', retryAfter, retryCount },
          `Rate limit hit for request ${options.method} ${options.url}`,
        );

        // Retry once after hitting a rate limit error, then give up
        if (retryCount < 1) {
          logger.info({ context: 'OctokitThrottling' }, `Retrying after ${retryAfter} seconds!`);
          return true;
        }
      },
      onSecondaryRateLimit: (retryAfter: number, options: any, octokit: any) => {
        // secondary rate limit usually means abuse detection
        logger.error(
          { context: 'OctokitThrottling', retryAfter },
          `Secondary rate limit hit for request ${options.method} ${options.url}`,
        );
      },
    },
    retry: {
      doNotRetry: [429], // Let throttling handle 429s
    },
  });

  return octokit;
};

// We export a singleton instance for general use
export const githubClient = initializeGitHubClient();
