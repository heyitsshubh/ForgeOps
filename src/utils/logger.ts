import pino from 'pino';
import { env } from '../config/env.js';

/**
 * Singleton logger instance using Pino.
 * Pino is extremely fast and outputs structured JSON logs.
 * In development, we use pino-pretty for human-readable output if available.
 */
export const logger = pino(
  {
    level: env.LOG_LEVEL,
  },
  pino.destination(2) // 2 = stderr. CRITICAL for MCP over stdio
);
