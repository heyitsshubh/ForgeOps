import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { toolRegistry } from '../mcp/tool-registry.js';
import { CommitService } from '../services/commit-service.js';
import { RepositoryResolver } from '../services/repository-resolver.js';
import { logger } from '../utils/logger.js';

// --- Schemas ---
const RepoSchema = z.object({
  repository: z.string().optional().describe('Target repository (e.g. owner/repo)'),
});

const ListCommitsSchema = RepoSchema.extend({
  limit: z.number().int().min(1).max(100).default(30).describe('Max commits to return'),
  branchOrSha: z
    .string()
    .optional()
    .describe('Branch name or SHA to start listing from (defaults to default branch)'),
});

const GetCommitSchema = RepoSchema.extend({
  ref: z.string().describe('The commit SHA or branch name'),
});

// --- Handlers ---

toolRegistry.register({
  name: 'list_commits',
  description: 'List commits in a GitHub repository',
  inputSchema: zodToJsonSchema(ListCommitsSchema as any),
  handler: async (args: any) => {
    const { repository, limit, branchOrSha } = args;
    const { owner, name } = await RepositoryResolver.resolve({ explicitRepo: repository });

    logger.info(
      { context: 'Tools', tool: 'list_commits', owner, name, branchOrSha },
      'Executing list_commits',
    );
    const commits = await CommitService.listCommits(owner, name, limit, branchOrSha);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            commits.map((c: any) => ({
              sha: c.sha,
              message: c.commit.message.split('\n')[0], // Only first line of message
              author: c.commit.author?.name,
              date: c.commit.author?.date,
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
  name: 'get_commit',
  description: 'Get detailed information about a specific commit, including file changes',
  inputSchema: zodToJsonSchema(GetCommitSchema as any),
  handler: async (args: any) => {
    const { repository, ref } = args;
    const { owner, name } = await RepositoryResolver.resolve({ explicitRepo: repository });

    logger.info({ context: 'Tools', tool: 'get_commit', owner, name, ref }, 'Executing get_commit');
    const commitInfo = await CommitService.getCommit(owner, name, ref);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              sha: commitInfo.sha,
              message: commitInfo.commit.message,
              author: commitInfo.commit.author,
              stats: commitInfo.stats,
              files: commitInfo.files?.map((f: any) => ({
                filename: f.filename,
                status: f.status,
                additions: f.additions,
                deletions: f.deletions,
                patch: f.patch, // The actual code diff
              })),
            },
            null,
            2,
          ),
        },
      ],
    };
  },
});
