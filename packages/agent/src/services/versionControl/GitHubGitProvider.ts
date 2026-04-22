import { injectable, inject } from 'inversify';
import type { ConfigProvider, Logger, PullRequest, PrOptions, PrStatus } from '@hcdevagent/shared';
import { SYMBOLS, ConfigError, IntegrationError } from '@hcdevagent/shared';
import type { GitProvider } from './GitProvider.js';

/** Parsed GitHub repository identity. */
type GitHubRepositoryIdentity = {
    readonly owner: string;
    readonly repo: string;
};

/**
 * GitHub implementation of the remote Git provider abstraction.
 */
@injectable()
export class GitHubGitProvider implements GitProvider {
    private readonly token: string;
    private readonly owner: string;
    private readonly repo: string;
    private readonly apiBase = 'https://api.github.com';

    public constructor(
        @inject(SYMBOLS.ConfigProvider) configProvider: ConfigProvider,
        @inject(SYMBOLS.Logger) private readonly logger: Logger,
    ) {
        this.token = configProvider.getRequired('GITHUB_TOKEN');
        const repoUrl = configProvider.getRequired('GIT_REPO_URL');
        const repositoryIdentity = this.parseGitHubRepositoryIdentity(repoUrl);
        this.owner = repositoryIdentity.owner;
        this.repo = repositoryIdentity.repo;

        this.logger.debug('GitHubGitProvider initialized', {
            repoUrl,
            owner: this.owner,
            repo: this.repo,
        });
    }

    /**
     * Creates a pull request on GitHub.
     */
    public async createPullRequest(options: PrOptions): Promise<PullRequest> {
        this.logger.info('Creating pull request', {
            title: options.title,
            base: options.targetBranch,
            head: options.sourceBranch,
        });

        try {
            const response = await this.githubFetch(`/repos/${this.owner}/${this.repo}/pulls`, {
                method: 'POST',
                body: JSON.stringify({
                    title: options.title,
                    body: options.body,
                    head: options.sourceBranch,
                    base: options.targetBranch,
                }),
            });

            const data = response as Record<string, unknown>;
            const prNumber = Number(data['number']);
            const prUrl = String(data['html_url']);
            const prState = String(data['state']);

            this.logger.info('Pull request created successfully', {
                prNumber,
                prUrl,
            });

            return {
                id: String(prNumber),
                title: options.title,
                description: options.body,
                url: prUrl,
                branch: options.sourceBranch,
                status: prState,
            };
        } catch (error) {
            if (error instanceof IntegrationError) {
                throw error;
            }

            throw new IntegrationError('Failed to create pull request', {
                title: options.title,
                error: String(error),
            });
        }
    }

    /**
     * Gets the status of a pull request by ID.
     */
    public async getPullRequestStatus(prId: string): Promise<PrStatus> {
        this.logger.debug('Fetching pull request status', { prId });

        try {
            const response = await this.githubFetch(`/repos/${this.owner}/${this.repo}/pulls/${prId}`);
            const data = response as Record<string, unknown>;

            const state = String(data['state']);
            const merged = Boolean(data['merged']);
            const mergeSha = merged ? String(data['merge_commit_sha']) : null;

            let prState: 'open' | 'merged' | 'changesRequested' = 'open';
            if (merged) {
                prState = 'merged';
            } else if (state === 'closed') {
                prState = 'changesRequested';
            }

            const reviewsResponse = await this.githubFetch(
                `/repos/${this.owner}/${this.repo}/pulls/${prId}/reviews`,
            );
            const reviews = reviewsResponse as Array<Record<string, unknown>>;
            const reviewComments = reviews
                .filter((review) => review['state'] === 'CHANGES_REQUESTED')
                .map((review) => String(review['body'] || ''));

            return {
                state: prState,
                reviewComments,
                mergeSha,
            };
        } catch (error) {
            if (error instanceof IntegrationError) {
                throw error;
            }

            throw new IntegrationError('Failed to get pull request status', {
                prId,
                error: String(error),
            });
        }
    }

    /**
     * Deletes a remote branch on GitHub.
     */
    public async deleteRemoteBranch(branchName: string): Promise<void> {
        this.logger.info('Deleting remote branch', { branchName });

        try {
            await this.githubFetch(`/repos/${this.owner}/${this.repo}/git/refs/heads/${branchName}`, {
                method: 'DELETE',
            });
            this.logger.info('Remote branch deleted successfully', { branchName });
        } catch (error) {
            if (error instanceof IntegrationError) {
                throw error;
            }

            throw new IntegrationError('Failed to delete remote branch', {
                branchName,
                error: String(error),
            });
        }
    }

    /**
     * Helper to make authenticated GitHub API calls.
     */
    private async githubFetch(path: string, options?: RequestInit): Promise<unknown> {
        const url = `${this.apiBase}${path}`;
        const response = await fetch(url, {
            ...options,
            headers: {
                Authorization: `Bearer ${this.token}`,
                Accept: 'application/vnd.github.v3+json',
                'Content-Type': 'application/json',
                ...options?.headers,
            },
        });

        if (!response.ok) {
            const text = await response.text();
            throw new IntegrationError(`GitHub API returned ${response.status}`, {
                path,
                status: response.status,
                body: text,
            });
        }

        return response.json();
    }

    /**
     * Extracts GitHub owner and repository name from a remote URL.
     */
    private parseGitHubRepositoryIdentity(repoUrl: string): GitHubRepositoryIdentity {
        const httpsMatch = /^https?:\/\/github\.com\/([^/]+)\/([^/]+?)(?:\.git)?\/?$/iu.exec(repoUrl);
        if (httpsMatch !== null) {
            return {
                owner: httpsMatch[1],
                repo: httpsMatch[2],
            };
        }

        const sshMatch = /^(?:git@github\.com:|ssh:\/\/git@github\.com\/)([^/]+)\/([^/]+?)(?:\.git)?\/?$/iu.exec(repoUrl);
        if (sshMatch !== null) {
            return {
                owner: sshMatch[1],
                repo: sshMatch[2],
            };
        }

        throw new ConfigError('GIT_REPO_URL must point to a valid GitHub repository URL', {
            key: 'GIT_REPO_URL',
            repoUrl,
        });
    }
}


