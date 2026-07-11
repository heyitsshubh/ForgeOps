import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import { logger } from '../utils/logger.js';

const execAsync = promisify(exec);

export interface ResolveRepoParams {
  /** Repository explicitly provided by the AI in the tool arguments (e.g. 'owner/repo') */
  explicitRepo?: string;
  /** Repository configured for the current session/environment */
  sessionRepo?: string;
  /** The local directory path to check for a git repository */
  localPath?: string;
}

export interface ResolvedRepo {
  owner: string;
  name: string;
}

/**
 * Service responsible for determining which GitHub repository a tool should operate on.
 * Resolution order: Explicit -> Session -> Local Git -> Throw (Ask User)
 */
export class RepositoryResolver {
  /**
   * Resolves the target GitHub repository.
   */
  static async resolve(params: ResolveRepoParams): Promise<ResolvedRepo> {
    // 1. Explicit repository passed to tool
    if (params.explicitRepo) {
      return this.parseRepoString(params.explicitRepo, 'explicit');
    }

    // 2. Session repository (e.g. passed via environment or global state)
    if (params.sessionRepo) {
      return this.parseRepoString(params.sessionRepo, 'session');
    }

    // 3. Local Git repository
    const localRepo = await this.getLocalRepo(params.localPath || process.cwd());
    if (localRepo) {
      return this.parseRepoString(localRepo, 'local');
    }

    // 4. Ask user (The LLM will see this error message and ask the human)
    logger.warn({ context: 'RepositoryResolver' }, 'Could not resolve repository context');
    throw new Error(
      'REPOSITORY_NOT_FOUND: I could not determine which repository you want to interact with. ' +
        'Please explicitly specify the repository name in the format "owner/repo".',
    );
  }

  /**
   * Parses an "owner/repo" string into a strongly typed object.
   */
  private static parseRepoString(repoStr: string, source: string): ResolvedRepo {
    const parts = repoStr.split('/');
    if (parts.length !== 2) {
      throw new Error(
        `INVALID_REPOSITORY_FORMAT: Repository string from ${source} must be "owner/repo", got "${repoStr}"`,
      );
    }

    // Strip any lingering .git suffix just in case
    const name = parts[1].replace(/\.git$/, '');

    logger.debug(
      { context: 'RepositoryResolver', source, owner: parts[0], name },
      'Resolved repository',
    );
    return { owner: parts[0], name };
  }

  /**
   * Attempts to parse the local git configuration to find the GitHub origin URL.
   */
  private static async getLocalRepo(path: string): Promise<string | null> {
    try {
      const { stdout } = await execAsync('git config --get remote.origin.url', { cwd: path });
      const url = stdout.trim();

      // Match SSH (git@github.com:owner/repo.git) or HTTPS (https://github.com/owner/repo.git)
      const match = url.match(/github\.com[:/](.+)\/(.+?)(\.git)?$/);
      if (match) {
        return `${match[1]}/${match[2]}`;
      }
      return null;
    } catch (error) {
      // Command fails if not a git repo or no origin remote
      return null;
    }
  }
}
