import { z } from 'zod';
import * as dotenv from 'dotenv';

// Load environment variables from .env file if present
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
});

// Parse and export the validated environment variables
export const env = envSchema.parse(process.env);
