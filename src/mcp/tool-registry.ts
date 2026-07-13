import { CallToolRequest, ListToolsRequest, Tool } from '@modelcontextprotocol/sdk/types.js';

export interface ToolHandler {
  name: string;
  description: string;
  inputSchema: any; // ZodJSONSchema or plain JSON schema
  handler: (
    args: any,
  ) => Promise<{ content: Array<{ type: string; text: string }>; isError?: boolean }>;
}

/**
 * Singleton registry to hold all MCP tools across different domains (Issues, PRs, etc.)
 */
class ToolRegistry {
  private handlers = new Map<string, ToolHandler>();

  /**
   * Registers a new tool handler.
   */
  register(handler: ToolHandler) {
    this.handlers.set(handler.name, handler);
  }

  /**
   * Returns all registered tools in the format required by MCP `ListToolsRequest`.
   */
  getTools(): Tool[] {
    return Array.from(this.handlers.values()).map((h) => ({
      name: h.name,
      description: h.description,
      inputSchema: h.inputSchema,
    }));
  }

  /**
   * Executes a specific tool by name.
   */
  async executeTool(name: string, args: any) {
    const handler = this.handlers.get(name);
    if (!handler) {
      throw new Error(`Tool not found: ${name}`);
    }
    return await handler.handler(args);
  }
}

export const toolRegistry = new ToolRegistry();
