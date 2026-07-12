import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { logger } from '../utils/logger.js';
import { redisManager } from '../cache/redis.js';
import { startMetricsServer } from '../metrics/prometheus.js';
import { Server as HttpServer } from 'node:http';

/**
 * ForgeOpsServer is the core wrapper around the Model Context Protocol (MCP) server.
 * It manages the lifecycle, transports, and registers the tools that AI clients can call.
 */
export class ForgeOpsServer {
  private server: Server;
  private metricsServer?: HttpServer;

  constructor() {
    this.server = new Server(
      {
        name: 'forgeops-mcp',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      },
    );

    // Global error handler for the MCP server
    this.server.onerror = (error) => {
      logger.error({ context: 'MCPServer', error }, 'MCP Server encountered an error');
    };

    // Handle graceful shutdown signals
    process.on('SIGINT', async () => {
      logger.info({ context: 'MCPServer' }, 'Received SIGINT, shutting down server...');
      await this.close();
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      logger.info({ context: 'MCPServer' }, 'Received SIGTERM, shutting down server...');
      await this.close();
      process.exit(0);
    });
  }

  /**
   * Connects the MCP server to the stdio transport.
   * AI clients (like Claude) communicate with local MCP servers via standard input/output.
   */
  async start() {
    this.metricsServer = startMetricsServer();

    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    logger.info({ context: 'MCPServer' }, 'ForgeOps MCP Server successfully started on stdio');
  }

  /**
   * Cleans up server resources and closes transports.
   */
  async close() {
    await this.server.close();
    await redisManager.close();

    if (this.metricsServer) {
      this.metricsServer.close();
    }

    logger.info({ context: 'MCPServer' }, 'Server closed');
  }
}
