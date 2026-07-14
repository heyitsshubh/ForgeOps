import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { toolRegistry } from '../mcp/tool-registry.js';
import { WorkflowService } from '../services/workflow-service.js';
import { RepositoryResolver } from '../services/repository-resolver.js';
import { logger } from '../utils/logger.js';

// --- Schemas ---
const RepoSchema = z.object({
  repository: z.string().optional().describe('Target repository (e.g. owner/repo)'),
});

const ListWorkflowsSchema = RepoSchema.extend({});

const ListWorkflowRunsSchema = RepoSchema.extend({
  workflowId: z
    .union([z.number().int(), z.string()])
    .describe('The workflow ID or filename (e.g. "ci.yml")'),
  limit: z.number().int().min(1).max(100).default(10).describe('Max runs to return'),
});

const GetWorkflowRunLogsSchema = RepoSchema.extend({
  runId: z.number().int().describe('The unique identifier of the workflow run'),
});

const TriggerWorkflowSchema = RepoSchema.extend({
  workflowId: z
    .union([z.number().int(), z.string()])
    .describe('The workflow ID or filename (e.g. "ci.yml")'),
  ref: z.string().describe('The git reference for the workflow (branch or tag name)'),
  inputs: z
    .record(z.string(), z.string())
    .optional()
    .describe('Key-value pairs of inputs defined in the workflow'),
});

const RerunWorkflowSchema = RepoSchema.extend({
  runId: z.number().int().describe('The unique identifier of the workflow run to re-run'),
});

const CancelWorkflowSchema = RepoSchema.extend({
  runId: z.number().int().describe('The unique identifier of the workflow run to cancel'),
});

// --- Handlers ---

toolRegistry.register({
  name: 'list_workflows',
  description: 'List all GitHub Actions workflows in a repository',
  inputSchema: zodToJsonSchema(ListWorkflowsSchema as any),
  handler: async (args: any) => {
    const { repository } = args;
    const { owner, name } = await RepositoryResolver.resolve({ explicitRepo: repository });

    logger.info(
      { context: 'Tools', tool: 'list_workflows', owner, name },
      'Executing list_workflows',
    );
    const result = await WorkflowService.listWorkflows(owner, name);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            result.workflows.map((w: any) => ({
              id: w.id,
              name: w.name,
              path: w.path,
              state: w.state,
            })),
            null,
            2,
          ),
        },
      ],
    };
  },
});

toolRegistry.register({
  name: 'list_workflow_runs',
  description: 'List recent runs for a specific GitHub Actions workflow',
  inputSchema: zodToJsonSchema(ListWorkflowRunsSchema as any),
  handler: async (args: any) => {
    const { repository, workflowId, limit } = args;
    const { owner, name } = await RepositoryResolver.resolve({ explicitRepo: repository });

    logger.info(
      { context: 'Tools', tool: 'list_workflow_runs', owner, name, workflowId },
      'Executing list_workflow_runs',
    );
    const result = await WorkflowService.listWorkflowRuns(owner, name, workflowId, limit);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            result.workflow_runs.map((r: any) => ({
              id: r.id,
              name: r.name,
              status: r.status,
              conclusion: r.conclusion,
              branch: r.head_branch,
              commit: r.head_sha?.substring(0, 7),
              created_at: r.created_at,
              html_url: r.html_url,
            })),
            null,
            2,
          ),
        },
      ],
    };
  },
});

toolRegistry.register({
  name: 'get_workflow_run_logs_url',
  description: 'Get the download URL for the logs of a specific workflow run',
  inputSchema: zodToJsonSchema(GetWorkflowRunLogsSchema as any),
  handler: async (args: any) => {
    const { repository, runId } = args;
    const { owner, name } = await RepositoryResolver.resolve({ explicitRepo: repository });

    logger.info(
      { context: 'Tools', tool: 'get_workflow_run_logs_url', owner, name, runId },
      'Executing get_workflow_run_logs_url',
    );
    const result = await WorkflowService.getWorkflowRunLogs(owner, name, runId);

    return {
      content: [
        {
          type: 'text',
          text: `Logs available at: ${(result as any).url}`,
        },
      ],
    };
  },
});

toolRegistry.register({
  name: 'trigger_workflow',
  description: 'Manually trigger a GitHub Actions workflow using workflow_dispatch',
  inputSchema: zodToJsonSchema(TriggerWorkflowSchema as any),
  handler: async (args: any) => {
    const { repository, workflowId, ref, inputs } = args;
    const { owner, name } = await RepositoryResolver.resolve({ explicitRepo: repository });

    logger.info(
      { context: 'Tools', tool: 'trigger_workflow', owner, name, workflowId, ref },
      'Executing trigger_workflow',
    );
    await WorkflowService.triggerWorkflow(owner, name, workflowId, ref, inputs);

    return {
      content: [
        {
          type: 'text',
          text: `Workflow '${workflowId}' triggered successfully on ref '${ref}'.`,
        },
      ],
    };
  },
});

toolRegistry.register({
  name: 'rerun_workflow',
  description: 'Re-run a failed or cancelled GitHub Actions workflow run',
  inputSchema: zodToJsonSchema(RerunWorkflowSchema as any),
  handler: async (args: any) => {
    const { repository, runId } = args;
    const { owner, name } = await RepositoryResolver.resolve({ explicitRepo: repository });

    logger.info(
      { context: 'Tools', tool: 'rerun_workflow', owner, name, runId },
      'Executing rerun_workflow',
    );
    await WorkflowService.rerunWorkflow(owner, name, runId);

    return {
      content: [
        {
          type: 'text',
          text: `Workflow run #${runId} has been re-triggered successfully.`,
        },
      ],
    };
  },
});

toolRegistry.register({
  name: 'cancel_workflow_run',
  description: 'Cancel a currently running GitHub Actions workflow run',
  inputSchema: zodToJsonSchema(CancelWorkflowSchema as any),
  handler: async (args: any) => {
    const { repository, runId } = args;
    const { owner, name } = await RepositoryResolver.resolve({ explicitRepo: repository });

    logger.info(
      { context: 'Tools', tool: 'cancel_workflow_run', owner, name, runId },
      'Executing cancel_workflow_run',
    );
    await WorkflowService.cancelWorkflowRun(owner, name, runId);

    return {
      content: [
        {
          type: 'text',
          text: `Workflow run #${runId} has been cancelled successfully.`,
        },
      ],
    };
  },
});
