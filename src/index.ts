import { otelSDK } from './tracing/opentelemetry.js';

// Start tracing before requiring any other modules
otelSDK.start();

import { logger } from './utils/logger.js';
import { ForgeOpsServer } from './mcp/server.js';

/**
 * ForgeOps MCP Server
 * AI-Powered GitHub Engineering Assistant
 */

export async function main() {
  logger.info({ context: 'Startup' }, 'ForgeOps initializing...');

  try {
    const server = new ForgeOpsServer();
    await server.start();
  } catch (error) {
    logger.fatal({ context: 'Startup', error }, 'Failed to start ForgeOps MCP Server');
    process.exit(1);
  }
}

if (process.argv[1] === new URL(import.meta.url).pathname) {
  main().catch((err) => {
    logger.fatal({ context: 'Startup', err }, 'Unhandled exception during startup');
    process.exit(1);
  });
}
