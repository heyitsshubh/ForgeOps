import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { toolRegistry } from '../mcp/tool-registry.js';
import { AnalyticsService } from '../services/analytics-service.js';
import { RepositoryResolver } from '../services/repository-resolver.js';
import { logger } from '../utils/logger.js';

// --- Schemas ---
const RepoSchema = z.object({
  repository: z.string().optional().describe('Target repository (e.g. owner/repo)'),
});

const GetContributorsSchema = RepoSchema.extend({
  limit: z.number().int().min(1).max(100).default(10).describe('Max contributors to return'),
});

// --- Handlers ---

toolRegistry.register({
  name: 'get_repo_info',
  description:
    'Get detailed metadata and statistics about a GitHub repository (stars, forks, open issues, language, etc.)',
  inputSchema: zodToJsonSchema(RepoSchema.extend({}) as any),
  handler: async (args: any) => {
    const { repository } = args;
    const { owner, name } = await RepositoryResolver.resolve({ explicitRepo: repository });

    logger.info(
      { context: 'Tools', tool: 'get_repo_info', owner, name },
      'Executing get_repo_info',
    );
    const repo = await AnalyticsService.getRepoInfo(owner, name);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              name: repo.name,
              full_name: repo.full_name,
              description: repo.description,
              language: repo.language,
              stars: repo.stargazers_count,
              forks: repo.forks_count,
              open_issues: repo.open_issues_count,
              watchers: repo.watchers_count,
              default_branch: repo.default_branch,
              created_at: repo.created_at,
              updated_at: repo.updated_at,
              license: repo.license?.name,
              topics: repo.topics,
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
  name: 'get_contributors',
  description: 'Get the top contributors to a repository sorted by number of commits',
  inputSchema: zodToJsonSchema(GetContributorsSchema as any),
  handler: async (args: any) => {
    const { repository, limit } = args;
    const { owner, name } = await RepositoryResolver.resolve({ explicitRepo: repository });

    logger.info(
      { context: 'Tools', tool: 'get_contributors', owner, name },
      'Executing get_contributors',
    );
    const contributors = await AnalyticsService.getContributors(owner, name, limit);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            contributors.map((c: any) => ({
              login: c.login,
              contributions: c.contributions,
              avatar_url: c.avatar_url,
              html_url: c.html_url,
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
  name: 'get_commit_activity',
  description:
    'Get weekly commit activity for the past year — useful for spotting development velocity trends',
  inputSchema: zodToJsonSchema(RepoSchema.extend({}) as any),
  handler: async (args: any) => {
    const { repository } = args;
    const { owner, name } = await RepositoryResolver.resolve({ explicitRepo: repository });

    logger.info(
      { context: 'Tools', tool: 'get_commit_activity', owner, name },
      'Executing get_commit_activity',
    );
    const activity = await AnalyticsService.getCommitActivity(owner, name);

    // GitHub may return 202 (computing stats) — handle gracefully
    if (!Array.isArray(activity)) {
      return {
        content: [
          { type: 'text', text: 'GitHub is computing stats. Please try again in a few seconds.' },
        ],
      };
    }

    // Return only the last 12 weeks for a focused view
    const recentWeeks = activity.slice(-12).map((w: any) => ({
      week: new Date(w.week * 1000).toISOString().split('T')[0],
      total: w.total,
      days: w.days,
    }));

    return {
      content: [{ type: 'text', text: JSON.stringify(recentWeeks, null, 2) }],
    };
  },
});

toolRegistry.register({
  name: 'get_code_frequency',
  description: 'Get weekly code additions and deletions per week for the repository lifetime',
  inputSchema: zodToJsonSchema(RepoSchema.extend({}) as any),
  handler: async (args: any) => {
    const { repository } = args;
    const { owner, name } = await RepositoryResolver.resolve({ explicitRepo: repository });

    logger.info(
      { context: 'Tools', tool: 'get_code_frequency', owner, name },
      'Executing get_code_frequency',
    );
    const frequency = await AnalyticsService.getCodeFrequency(owner, name);

    if (!Array.isArray(frequency)) {
      return {
        content: [
          { type: 'text', text: 'GitHub is computing stats. Please try again in a few seconds.' },
        ],
      };
    }

    // Return last 12 weeks: [unix_timestamp, additions, deletions]
    const recent = frequency.slice(-12).map((w: any) => ({
      week: new Date(w[0] * 1000).toISOString().split('T')[0],
      additions: w[1],
      deletions: w[2],
    }));

    return {
      content: [{ type: 'text', text: JSON.stringify(recent, null, 2) }],
    };
  },
});

toolRegistry.register({
  name: 'get_traffic_views',
  description:
    'Get page view traffic for the repository over the last 14 days (requires push access)',
  inputSchema: zodToJsonSchema(RepoSchema.extend({}) as any),
  handler: async (args: any) => {
    const { repository } = args;
    const { owner, name } = await RepositoryResolver.resolve({ explicitRepo: repository });

    logger.info(
      { context: 'Tools', tool: 'get_traffic_views', owner, name },
      'Executing get_traffic_views',
    );
    const traffic = await AnalyticsService.getTrafficViews(owner, name);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              total_count: traffic.count,
              total_uniques: traffic.uniques,
              views: traffic.views.map((v: any) => ({
                timestamp: v.timestamp,
                count: v.count,
                uniques: v.uniques,
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

toolRegistry.register({
  name: 'list_labels',
  description: 'List all issue labels defined in a repository',
  inputSchema: zodToJsonSchema(RepoSchema.extend({}) as any),
  handler: async (args: any) => {
    const { repository } = args;
    const { owner, name } = await RepositoryResolver.resolve({ explicitRepo: repository });

    logger.info({ context: 'Tools', tool: 'list_labels', owner, name }, 'Executing list_labels');
    const labels = await AnalyticsService.listLabels(owner, name);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            labels.map((l: any) => ({
              name: l.name,
              color: `#${l.color}`,
              description: l.description,
            })),
            null,
            2,
          ),
        },
      ],
    };
  },
});
