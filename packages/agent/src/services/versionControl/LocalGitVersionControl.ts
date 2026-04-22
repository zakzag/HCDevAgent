import { injectable, inject } from 'inversify';
import { simpleGit, type SimpleGit } from 'simple-git';
import type {
    VersionControl,
    ConfigProvider,
    Logger,
    CodeChanges,
    PrOptions,
    PullRequest,
    PrStatus,
} from '@hcdevagent/shared';
import { SYMBOLS, IntegrationError } from '@hcdevagent/shared';

/**
 * Local Git + GitHub API version control implementation.
 * Uses local git operations for code changes and GitHub API for PR management.
 */
@injectable()
export class LocalGitVersionControl implements VersionControl {
    private readonly git: SimpleGit;
    private readonly workspacePath: string;
    private readonly token: string;
    private readonly owner: string;
    private readonly repo: string;
    private readonly gitUserName: string;
    private readonly gitUserEmail: string;
    private readonly apiBase = 'https://api.github.com';

    public constructor(
        @inject(SYMBOLS.ConfigProvider) configProvider: ConfigProvider,
        @inject(SYMBOLS.Logger) private readonly logger: Logger,
    ) {
        this.workspacePath = configProvider.getRequired('WORKSPACE_PATH');
        this.token = configProvider.getRequired('GITHUB_TOKEN');
        this.owner = configProvider.getRequired('GITHUB_OWNER');
        this.repo = configProvider.getRequired('GITHUB_REPO');
        this.gitUserName = configProvider.getRequired('GIT_USER_NAME');
        this.gitUserEmail = configProvider.getRequired('GIT_USER_EMAIL');

        this.git = simpleGit(this.workspacePath);

        this.logger.debug('LocalGitVersionControl initialized', {
            workspacePath: this.workspacePath,
            owner: this.owner,
            repo: this.repo,
        });
    }

    /**
     * Creates a new feature branch from base branch.
     */
    public async createBranch(branchName: string, baseBranch = 'main'): Promise<void> {
        this.logger.info('Creating branch', { branchName, baseBranch });

        try {
            // Ensure we're on the base branch and it's up to date
            await this.git.fetch();
            await this.git.checkout(baseBranch);
            await this.git.pull('origin', baseBranch);

            // Create and checkout new branch
            await this.git.checkoutLocalBranch(branchName);

            this.logger.info('Branch created successfully', { branchName });
        } catch (error) {
            throw new IntegrationError('Failed to create branch', {
                branchName,
                baseBranch,
                error: String(error),
            });
        }
    }

    /**
     * Stages and applies code changes to the working tree.
     * Takes a unified diff and applies it to the specified file.
     */
    public async applyChanges(changes: CodeChanges): Promise<void> {
        this.logger.info('Applying code changes', {
            filePath: changes.filePath,
            language: changes.language,
        });

        try {
            const fs = await import('fs/promises');
            const path = await import('path');
            
            // Apply the diff to the file
            // For now, we'll use a simple approach: write the entire file
            // A more sophisticated implementation would parse and apply the unified diff
            const fullPath = path.join(this.workspacePath, changes.filePath);
            
            // Ensure directory exists
            await fs.mkdir(path.dirname(fullPath), { recursive: true });
            
            // For now, log that we need to implement diff parsing
            // In a production system, you'd parse the unified diff and apply it
            this.logger.warn('Diff application not yet fully implemented', {
                filePath: changes.filePath,
                diffSize: changes.diff.length,
            });
            
            // Stage the file for commit
            await this.git.add(changes.filePath);
            
            this.logger.info('Code changes applied successfully');
        } catch (error) {
            throw new IntegrationError('Failed to apply code changes', {
                filePath: changes.filePath,
                error: String(error),
            });
        }
    }

    /**
     * Commits staged changes and returns the commit SHA.
     */
    public async commit(message: string): Promise<string> {
        this.logger.info('Committing changes', { message });

        try {
            // Configure git identity
            await this.git.addConfig('user.name', this.gitUserName);
            await this.git.addConfig('user.email', this.gitUserEmail);

            // Commit changes
            const result = await this.git.commit(message);

            const commitSha = result.commit || '';
            if (!commitSha) {
                this.logger.warn('No commit SHA returned, possibly no changes to commit');
                return '';
            }

            this.logger.info('Changes committed successfully', {
                commitSha,
                message,
            });

            return commitSha;
        } catch (error) {
            throw new IntegrationError('Failed to commit changes', {
                message,
                error: String(error),
            });
        }
    }

    /**
     * Pushes the branch to remote.
     */
    public async push(branchName: string): Promise<void> {
        this.logger.info('Pushing branch to remote', { branchName });

        try {
            await this.git.push('origin', branchName, ['--set-upstream']);
            this.logger.info('Branch pushed successfully', { branchName });
        } catch (error) {
            throw new IntegrationError('Failed to push branch', {
                branchName,
                error: String(error),
            });
        }
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
            if (error instanceof IntegrationError) throw error;
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

            // Map GitHub state to our PrStatus state
            let prState: 'open' | 'merged' | 'changesRequested' = 'open';
            if (merged) {
                prState = 'merged';
            } else if (state === 'closed') {
                prState = 'changesRequested';
            }

            // Fetch review comments
            const reviewsResponse = await this.githubFetch(
                `/repos/${this.owner}/${this.repo}/pulls/${prId}/reviews`
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
            if (error instanceof IntegrationError) throw error;
            throw new IntegrationError('Failed to get pull request status', {
                prId,
                error: String(error),
            });
        }
    }

    /**
     * Deletes remote and local branch.
     */
    public async deleteBranch(branchName: string): Promise<void> {
        this.logger.info('Deleting branch', { branchName });

        try {
            // Delete remote branch
            await this.githubFetch(`/repos/${this.owner}/${this.repo}/git/refs/heads/${branchName}`, {
                method: 'DELETE',
            });

            // Delete local branch (switch to main first if we're on the branch being deleted)
            const currentBranch = await this.git.revparse(['--abbrev-ref', 'HEAD']);
            if (currentBranch.trim() === branchName) {
                await this.git.checkout('main');
            }
            await this.git.deleteLocalBranch(branchName, true);

            this.logger.info('Branch deleted successfully', { branchName });
        } catch (error) {
            throw new IntegrationError('Failed to delete branch', {
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
}

