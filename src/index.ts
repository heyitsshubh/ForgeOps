import { logger } from './utils/logger.js';

/**
 * ForgeOps MCP Server
 * AI-Powered GitHub Engineering Assistant
 */

export function main() {
  logger.info({ context: 'Startup' }, 'ForgeOps initializing...');
}

if (process.argv[1] === new URL(import.meta.url).pathname) {
  main();
}
