import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { toolRegistry } from '../mcp/tool-registry.js';
import { PRService } from '../services/pr-service.js';
import { RepositoryResolver } from '../services/repository-resolver.js';
import { logger } from '../utils/logger.js';

// --- Schemas ---
const RepoSchema = z.object({
  repository: z.string().optional().describe('Target repository (e.g. owner/repo)'),
});

const ListPRsSchema = RepoSchema.extend({
  limit: z.number().int().min(1).max(100).default(10).describe('Max PRs to return'),
});

const FetchDiffSchema = RepoSchema.extend({
  pullNumber: z.number().int().describe('PR number to fetch diff for'),
});

const CreatePRSchema = RepoSchema.extend({
  title: z.string().describe('Title of the PR'),
  head: z.string().describe('The name of the branch where your changes are implemented'),
  base: z.string().describe('The name of the branch you want the changes pulled into'),
  body: z.string().optional().describe('Markdown body of the PR'),
});

const ReviewPRSchema = RepoSchema.extend({
  pullNumber: z.number().int().describe('PR number to review'),
  event: z.enum(['APPROVE', 'REQUEST_CHANGES', 'COMMENT']).describe('The review action to perform'),
  body: z.string().optional().describe('The body text of the pull request review'),
});

const MergePRSchema = RepoSchema.extend({
  pullNumber: z.number().int().describe('PR number to merge'),
  commitTitle: z.string().optional().describe('Title for the merge commit message'),
  mergeMethod: z
    .enum(['merge', 'squash', 'rebase'])
    .default('merge')
    .describe('Merge method to use'),
});

// --- Handlers ---

toolRegistry.register({
  name: 'list_pull_requests',
  description: 'List open Pull Requests in a GitHub repository',
  inputSchema: zodToJsonSchema(ListPRsSchema as any),
  handler: async (args: any) => {
    const { repository, limit } = args;
    const { owner, name } = await RepositoryResolver.resolve({ explicitRepo: repository });

    logger.info(
      { context: 'Tools', tool: 'list_pull_requests', owner, name },
      'Executing list_pull_requests',
    );
    const prs = await PRService.listPRs(owner, name, limit);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            prs.map((pr: any) => ({
              number: pr.number,
              title: pr.title,
              user: pr.user?.login,
              html_url: pr.html_url,
              state: pr.state,
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
  name: 'fetch_pr_diff',
  description: 'Fetch the raw diff (code changes) of a Pull Request',
  inputSchema: zodToJsonSchema(FetchDiffSchema as any),
  handler: async (args: any) => {
    const { repository, pullNumber } = args;
    const { owner, name } = await RepositoryResolver.resolve({ explicitRepo: repository });

    logger.info(
      { context: 'Tools', tool: 'fetch_pr_diff', owner, name, pullNumber },
      'Executing fetch_pr_diff',
    );
    const diff = await PRService.fetchDiff(owner, name, pullNumber);

    return {
      content: [
        {
          type: 'text',
          // Usually Octokit returns the diff as a string when format='diff', but just in case it is somehow an object, we enforce string format.
          text: typeof diff === 'string' ? diff : JSON.stringify(diff),
        },
      ],
    };
  },
});

toolRegistry.register({
  name: 'create_pull_request',
  description: 'Create a new Pull Request',
  inputSchema: zodToJsonSchema(CreatePRSchema as any),
  handler: async (args: any) => {
    const { repository, title, head, base, body } = args;
    const { owner, name } = await RepositoryResolver.resolve({ explicitRepo: repository });

    logger.info(
      { context: 'Tools', tool: 'create_pull_request', owner, name },
      'Executing create_pull_request',
    );
    const pr = await PRService.createPR(owner, name, title, head, base, body);

    return {
      content: [
        {
          type: 'text',
          text: `Pull Request created successfully!\nNumber: #${pr.number}\nURL: ${pr.html_url}`,
        },
      ],
    };
  },
});

toolRegistry.register({
  name: 'review_pull_request',
  description: 'Submit a review (Approve, Request Changes, or Comment) on a PR',
  inputSchema: zodToJsonSchema(ReviewPRSchema as any),
  handler: async (args: any) => {
    const { repository, pullNumber, event, body } = args;
    const { owner, name } = await RepositoryResolver.resolve({ explicitRepo: repository });

    logger.info(
      { context: 'Tools', tool: 'review_pull_request', owner, name, pullNumber, event },
      'Executing review_pull_request',
    );
    const review = await PRService.reviewPR(owner, name, pullNumber, event, body);

    return {
      content: [
        {
          type: 'text',
          text: `Review submitted successfully. State: ${review.state}\nURL: ${review.html_url}`,
        },
      ],
    };
  },
});

toolRegistry.register({
  name: 'merge_pull_request',
  description: 'Merge a Pull Request',
  inputSchema: zodToJsonSchema(MergePRSchema as any),
  handler: async (args: any) => {
    const { repository, pullNumber, commitTitle, mergeMethod } = args;
    const { owner, name } = await RepositoryResolver.resolve({ explicitRepo: repository });

    logger.info(
      { context: 'Tools', tool: 'merge_pull_request', owner, name, pullNumber, mergeMethod },
      'Executing merge_pull_request',
    );
    const result = await PRService.mergePR(owner, name, pullNumber, commitTitle, mergeMethod);

    return {
      content: [
        {
          type: 'text',
          text: `PR #${pullNumber} merged successfully! message: ${result.message}`,
        },
      ],
    };
  },
});
