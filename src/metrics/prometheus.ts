import * as promClient from 'prom-client';
import { createServer } from 'node:http';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';

// Setup Prometheus Registry
export const registry = new promClient.Registry();

// Enable default Node.js metrics (CPU, Memory, Event Loop Lag, etc.)
promClient.collectDefaultMetrics({ register: registry, prefix: 'forgeops_' });

// --- Custom Metrics ---

export const mcpRequestsTotal = new promClient.Counter({
  name: 'forgeops_mcp_requests_total',
  help: 'Total number of MCP tool requests handled',
  labelNames: ['tool_name', 'status'],
  registers: [registry],
});

export const mcpRequestLatency = new promClient.Histogram({
  name: 'forgeops_mcp_request_duration_seconds',
  help: 'Latency of MCP tool requests',
  labelNames: ['tool_name'],
  buckets: [0.1, 0.5, 1, 2, 5, 10],
  registers: [registry],
});

export const githubApiCallsTotal = new promClient.Counter({
  name: 'forgeops_github_api_calls_total',
  help: 'Total GitHub API requests made',
  labelNames: ['method', 'status'],
  registers: [registry],
});

export const githubRateLimitsHit = new promClient.Counter({
  name: 'forgeops_github_rate_limits_hit_total',
  help: 'Number of times GitHub API rate limit was hit',
  labelNames: ['type'], // e.g. 'primary', 'secondary'
  registers: [registry],
});

export const redisCacheOperations = new promClient.Counter({
  name: 'forgeops_redis_cache_operations_total',
  help: 'Redis cache hit or miss',
  labelNames: ['result'], // 'hit' | 'miss'
  registers: [registry],
});

export const errorsTotal = new promClient.Counter({
  name: 'forgeops_errors_total',
  help: 'Total number of errors encountered in the system',
  labelNames: ['type'], // 'github', 'redis', 'mcp'
  registers: [registry],
});

// --- Metrics Server ---

/**
 * Starts a standalone HTTP server specifically for Prometheus scraping.
 * Since MCP operates over stdio, it cannot serve HTTP endpoints natively.
 */
export function startMetricsServer() {
  const port = env.PROMETHEUS_PORT;

  const server = createServer(async (req, res) => {
    if (req.url === '/metrics') {
      try {
        res.setHeader('Content-Type', registry.contentType);
        const metrics = await registry.metrics();
        res.end(metrics);
      } catch (ex) {
        res.statusCode = 500;
        res.end(String(ex));
      }
    } else {
      res.statusCode = 404;
      res.end('Not found');
    }
  });

  server.listen(port, () => {
    logger.info(
      { context: 'Metrics', port },
      `Prometheus metrics exposed at http://localhost:${port}/metrics`,
    );
  });

  return server;
}
