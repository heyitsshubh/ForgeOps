import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { toolRegistry } from '../mcp/tool-registry.js';
import { BranchService } from '../services/branch-service.js';
import { RepositoryResolver } from '../services/repository-resolver.js';
import { logger } from '../utils/logger.js';

// --- Schemas ---
const RepoSchema = z.object({
  repository: z.string().optional().describe('Target repository (e.g. owner/repo)'),
});

const ListBranchesSchema = RepoSchema.extend({
  limit: z.number().int().min(1).max(100).default(30).describe('Max branches to return'),
});

const GetBranchSchema = RepoSchema.extend({
  branch: z.string().describe('The name of the branch to get'),
});

const CreateBranchSchema = RepoSchema.extend({
  branchName: z.string().describe('The name of the new branch to create'),
  baseSha: z.string().describe('The SHA1 value for the base commit to branch from'),
});

const DeleteBranchSchema = RepoSchema.extend({
  branchName: z.string().describe('The name of the branch to delete'),
});

// --- Handlers ---

toolRegistry.register({
  name: 'list_branches',
  description: 'List branches in a GitHub repository',
  inputSchema: zodToJsonSchema(ListBranchesSchema as any),
  handler: async (args: any) => {
    const { repository, limit } = args;
    const { owner, name } = await RepositoryResolver.resolve({ explicitRepo: repository });

    logger.info(
      { context: 'Tools', tool: 'list_branches', owner, name },
      'Executing list_branches',
    );
    const branches = await BranchService.listBranches(owner, name, limit);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            branches.map((b: any) => ({
              name: b.name,
              commit: b.commit.sha,
              protected: b.protected,
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
  name: 'get_branch',
  description: 'Get detailed information about a specific branch',
  inputSchema: zodToJsonSchema(GetBranchSchema as any),
  handler: async (args: any) => {
    const { repository, branch } = args;
    const { owner, name } = await RepositoryResolver.resolve({ explicitRepo: repository });

    logger.info(
      { context: 'Tools', tool: 'get_branch', owner, name, branch },
      'Executing get_branch',
    );
    const branchInfo = await BranchService.getBranch(owner, name, branch);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              name: branchInfo.name,
              commit: branchInfo.commit.sha,
              protected: branchInfo.protected,
              author: branchInfo.commit.commit.author,
            },
            null,
            2,
          ),
        },
      ],
    };
  },
});

toolRegistry.register({
  name: 'create_branch',
  description: 'Create a new branch from a base SHA',
  inputSchema: zodToJsonSchema(CreateBranchSchema as any),
  handler: async (args: any) => {
    const { repository, branchName, baseSha } = args;
    const { owner, name } = await RepositoryResolver.resolve({ explicitRepo: repository });

    logger.info(
      { context: 'Tools', tool: 'create_branch', owner, name, branchName },
      'Executing create_branch',
    );
    const ref = await BranchService.createBranch(owner, name, branchName, baseSha);

    return {
      content: [
        {
          type: 'text',
          text: `Branch created successfully!\nRef: ${ref.ref}\nURL: ${ref.url}`,
        },
      ],
    };
  },
});

toolRegistry.register({
  name: 'delete_branch',
  description: 'Delete a branch',
  inputSchema: zodToJsonSchema(DeleteBranchSchema as any),
  handler: async (args: any) => {
    const { repository, branchName } = args;
    const { owner, name } = await RepositoryResolver.resolve({ explicitRepo: repository });

    logger.info(
      { context: 'Tools', tool: 'delete_branch', owner, name, branchName },
      'Executing delete_branch',
    );
    await BranchService.deleteBranch(owner, name, branchName);

    return {
      content: [
        {
          type: 'text',
          text: `Branch '${branchName}' deleted successfully.`,
        },
      ],
    };
  },
});
