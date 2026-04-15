import { injectable, inject } from 'inversify';
import type { VersionControl, PullRequest, ConfigProvider, Logger } from '@hcdevagent/shared';
import { SYMBOLS, IntegrationError } from '@hcdevagent/shared';

/**
 * GitHub-based version control implementation.
 */
@injectable()
export class GitHubVersionControl implements VersionControl {
  private readonly token: string;
  private readonly owner: string;
  private readonly repo: string;
  private readonly apiBase = 'https://api.github.com';

  constructor(
    @inject(SYMBOLS.ConfigProvider) configProvider: ConfigProvider,
    @inject(SYMBOLS.Logger) private readonly logger: Logger,
  ) {
    this.token = configProvider.getRequired('GITHUB_TOKEN');
    this.owner = configProvider.getRequired('GITHUB_OWNER');
    this.repo = configProvider.getRequired('GITHUB_REPO');
  }

  /** Creates a new branch from the default branch. */
  public async createBranch(branchName: string): Promise<void> {
    this.logger.info('Creating branch', { branchName });
    try {
      const refResponse = await this.githubFetch(`/repos/${this.owner}/${this.repo}/git/ref/heads/main`);
      const sha = String((refResponse as Record<string, unknown>)['object']
        ? ((refResponse as Record<string, Record<string, unknown>>)['object']['sha'])
        : '');
      await this.githubFetch(`/repos/${this.owner}/${this.repo}/git/refs`, {
        method: 'POST',
        body: JSON.stringify({ ref: `refs/heads/${branchName}`, sha }),
      });
    } catch (error) {
      if (error instanceof IntegrationError) throw error;
      throw new IntegrationError('Failed to create branch on GitHub', {
        branchName,
        originalError: String(error),
      });
    }
  }

  /** Commits changes to the current branch. */
  public async commitChanges(message: string, files: ReadonlyArray<string>): Promise<string> {
    this.logger.info('Committing changes', { message, fileCount: files.length });
    // Placeholder — real implementation will use GitHub Git Data API
    return 'commit-sha-placeholder';
  }

  /** Creates a pull request on GitHub. */
  public async createPullRequest(
    title: string,
    description: string,
    sourceBranch: string,
  ): Promise<PullRequest> {
    this.logger.info('Creating pull request', { title, sourceBranch });
    try {
      const data = await this.githubFetch(`/repos/${this.owner}/${this.repo}/pulls`, {
        method: 'POST',
        body: JSON.stringify({
          title,
          body: description,
          head: sourceBranch,
          base: 'main',
        }),
      }) as Record<string, unknown>;
      return {
        id: String(data['number'] ?? ''),
        title: String(data['title'] ?? ''),
        description: String(data['body'] ?? ''),
        url: String(data['html_url'] ?? ''),
        branch: sourceBranch,
        status: String(data['state'] ?? ''),
      };
    } catch (error) {
      if (error instanceof IntegrationError) throw error;
      throw new IntegrationError('Failed to create pull request on GitHub', {
        title,
        sourceBranch,
        originalError: String(error),
      });
    }
  }

  /** Gets the status of a pull request by ID. */
  public async getPullRequestStatus(prId: string): Promise<string> {
    this.logger.debug('Getting PR status', { prId });
    try {
      const data = await this.githubFetch(
        `/repos/${this.owner}/${this.repo}/pulls/${prId}`,
      ) as Record<string, unknown>;
      return String(data['state'] ?? 'unknown');
    } catch (error) {
      if (error instanceof IntegrationError) throw error;
      throw new IntegrationError('Failed to get PR status from GitHub', {
        prId,
        originalError: String(error),
      });
    }
  }

  /** Helper to make authenticated GitHub API calls. */
  private async githubFetch(path: string, options?: RequestInit): Promise<unknown> {
    const response = await fetch(`${this.apiBase}${path}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${this.token}`,
        Accept: 'application/vnd.github+json',
        'Content-Type': 'application/json',
        ...(options?.headers as Record<string, string> | undefined),
      },
    });
    if (!response.ok) {
      throw new IntegrationError(`GitHub API returned ${response.status}`, {
        path,
        status: response.status,
      });
    }
    return response.json();
  }
}

