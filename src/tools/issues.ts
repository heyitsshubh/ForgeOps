import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { toolRegistry } from '../mcp/tool-registry.js';
import { IssueService } from '../services/issue-service.js';
import { RepositoryResolver } from '../services/repository-resolver.js';
import { logger } from '../utils/logger.js';

// --- Schemas ---
const RepoSchema = z.object({
  repository: z.string().optional().describe('Target repository (e.g. owner/repo)'),
});

const ListIssuesSchema = RepoSchema.extend({
  limit: z.number().int().min(1).max(100).default(10).describe('Max issues to return'),
});

const SearchIssuesSchema = RepoSchema.extend({
  query: z.string().describe('Search query (e.g. "bug in:title")'),
  limit: z.number().int().min(1).max(100).default(10).describe('Max issues to return'),
});

const CreateIssueSchema = RepoSchema.extend({
  title: z.string().describe('Title of the issue'),
  body: z.string().optional().describe('Markdown body of the issue'),
});

const UpdateIssueSchema = RepoSchema.extend({
  issueNumber: z.number().int().describe('Issue number to update'),
  state: z.enum(['open', 'closed']).describe('State to set the issue to'),
});

// --- Handlers ---

toolRegistry.register({
  name: 'list_issues',
  description: 'List open issues in a GitHub repository',
  inputSchema: zodToJsonSchema(ListIssuesSchema as any),
  handler: async (args: any) => {
    const { repository, limit } = args;
    const { owner, name } = await RepositoryResolver.resolve({ explicitRepo: repository });

    logger.info({ context: 'Tools', tool: 'list_issues', owner, name }, 'Executing list_issues');
    const issues = await IssueService.listIssues(owner, name, limit);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            issues.map((i: any) => ({
              number: i.number,
              title: i.title,
              user: i.user?.login,
              html_url: i.html_url,
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
  name: 'search_issues',
  description: 'Search for issues using GitHub search syntax',
  inputSchema: zodToJsonSchema(SearchIssuesSchema as any),
  handler: async (args: any) => {
    const { repository, query, limit } = args;
    const { owner, name } = await RepositoryResolver.resolve({ explicitRepo: repository });

    // Auto-scope query to the resolved repository if it doesn't already contain a repo filter
    const scopedQuery = query.includes('repo:') ? query : `repo:${owner}/${name} ${query}`;

    logger.info(
      { context: 'Tools', tool: 'search_issues', scopedQuery },
      'Executing search_issues',
    );
    const results = await IssueService.searchIssues(scopedQuery, limit);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            results.items.map((i: any) => ({
              number: i.number,
              title: i.title,
              state: i.state,
              html_url: i.html_url,
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
  name: 'create_issue',
  description: 'Create a new issue in a GitHub repository',
  inputSchema: zodToJsonSchema(CreateIssueSchema as any),
  handler: async (args: any) => {
    const { repository, title, body } = args;
    const { owner, name } = await RepositoryResolver.resolve({ explicitRepo: repository });

    logger.info({ context: 'Tools', tool: 'create_issue', owner, name }, 'Executing create_issue');
    const issue = await IssueService.createIssue(owner, name, title, body);

    return {
      content: [
        {
          type: 'text',
          text: `Issue created successfully!\nNumber: #${issue.number}\nURL: ${issue.html_url}`,
        },
      ],
    };
  },
});

toolRegistry.register({
  name: 'update_issue_state',
  description: 'Close or reopen an existing GitHub issue',
  inputSchema: zodToJsonSchema(UpdateIssueSchema as any),
  handler: async (args: any) => {
    const { repository, issueNumber, state } = args;
    const { owner, name } = await RepositoryResolver.resolve({ explicitRepo: repository });

    logger.info(
      { context: 'Tools', tool: 'update_issue_state', owner, name, issueNumber, state },
      'Executing update_issue_state',
    );
    const issue = await IssueService.updateIssueState(owner, name, issueNumber, state);

    return {
      content: [
        {
          type: 'text',
          text: `Issue #${issue.number} is now ${issue.state}.\nURL: ${issue.html_url}`,
        },
      ],
    };
  },
});
