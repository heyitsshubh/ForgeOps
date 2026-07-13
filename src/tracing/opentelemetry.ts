import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { ConsoleSpanExporter } from '@opentelemetry/sdk-trace-node';
import { logger } from '../utils/logger.js';
import { trace } from '@opentelemetry/api';

process.env.OTEL_SERVICE_NAME = 'forgeops-mcp';

/**
 * Initializes the OpenTelemetry SDK.
 * This hooks into Node.js core modules (http, net) and third-party libraries (redis, pino)
 * to automatically generate distributed traces.
 */
export const otelSDK = new NodeSDK({
  // For this local MCP server MVP, we'll just export spans to the console.
  // In production, this would be replaced with an OTLPTraceExporter sending to Jaeger/Datadog.
  traceExporter: new ConsoleSpanExporter(),
  instrumentations: [
    getNodeAutoInstrumentations({
      // We can disable specific instrumentations if they are too noisy
      '@opentelemetry/instrumentation-fs': { enabled: false },
    }),
  ],
});

/**
 * Helper to get the global tracer for manual span creation
 */
export const getTracer = () => trace.getTracer('forgeops-tracer');

// Graceful shutdown logic for the tracer
process.on('SIGTERM', () => {
  otelSDK
    .shutdown()
    .then(() => logger.info({ context: 'OpenTelemetry' }, 'Tracing terminated'))
    .catch((error) =>
      logger.error({ context: 'OpenTelemetry', error }, 'Error terminating tracing'),
    )
    .finally(() => process.exit(0));
});
