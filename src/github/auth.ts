import { Octokit } from 'octokit';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';

/**
 * Initializes and returns a configured Octokit instance.
 * We encapsulate this to ensure that authentication and core client
 * setup (e.g., attaching custom fetch behavior or logging) is centralized.
 */
export const initializeGitHubClient = (): Octokit => {
  logger.debug('Initializing GitHub Octokit client');

  const octokit = new Octokit({
    auth: env.GITHUB_TOKEN,
    log: {
      debug: (msg: string) => logger.debug({ context: 'Octokit' }, msg),
      info: (msg: string) => logger.info({ context: 'Octokit' }, msg),
      warn: (msg: string) => logger.warn({ context: 'Octokit' }, msg),
      error: (msg: string) => logger.error({ context: 'Octokit' }, msg),
    },
  });

  return octokit;
};

// We export a singleton instance for general use
export const githubClient = initializeGitHubClient();
