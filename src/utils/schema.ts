import { zodToJsonSchema } from 'zod-to-json-schema';
import { z } from 'zod';

/**
 * Converts a Zod schema to an MCP-compatible JSON Schema object.
 *
 * The MCP SDK strictly validates that inputSchema.type === "object".
 * zod-to-json-schema v3 + Zod v4 may omit or change this field,
 * so we normalize it here as the single source of truth.
 */
export function toInputSchema(schema: z.ZodType<any>): Record<string, unknown> {
  const generated = zodToJsonSchema(schema as any) as any;
  return {
    type: 'object',
    properties: generated.properties ?? {},
    ...(generated.required ? { required: generated.required } : {}),
    ...(generated.description ? { description: generated.description } : {}),
  };
}
