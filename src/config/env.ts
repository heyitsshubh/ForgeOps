import { z } from 'zod';
import * as dotenv from 'dotenv';

// Disable dotenv logging which corrupts MCP stdio streams
process.env.DOTENV_QUIET = 'true';
dotenv.config();

/**
 * Zod schema for environment variables.
 * Ensures that the application fails fast if required configurations are missing.
 */
const envSchema = z.object({
  /**
   * Defines the minimum log level.
   * Useful for distinguishing between development (e.g. 'debug') and production (e.g. 'info').
   */
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),

  /**
   * GitHub Personal Access Token (PAT).
   * Required to authenticate API requests to GitHub.
   */
  GITHUB_TOKEN: z.string().min(1, 'GITHUB_TOKEN is required'),

  /**
   * Redis Connection String (e.g. redis://localhost:6379)
   * Used for caching GitHub API responses and rate limits.
   */
  REDIS_URL: z.string().url().default('redis://localhost:6379'),

  /**
   * Port to expose Prometheus metrics (e.g. 9090)
   * The MCP server runs on stdio, but Prometheus needs an HTTP endpoint to scrape.
   */
  PROMETHEUS_PORT: z.coerce.number().int().positive().default(9090),
});

// Parse and export the validated environment variables
export const env = envSchema.parse(process.env);
