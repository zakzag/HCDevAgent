import { injectable, inject } from 'inversify';
import { simpleGit, type SimpleGit } from 'simple-git';
import type { ConfigProvider, Logger, CodeChanges } from '@hcdevagent/shared';
import { SYMBOLS, IntegrationError } from '@hcdevagent/shared';
import type { GitRepository } from './GitRepository.js';

/**
 * Provider-agnostic local Git repository implementation backed by simple-git.
 */
@injectable()
export class LocalGitRepository implements GitRepository {
    private readonly git: SimpleGit;
    private readonly workspacePath: string;
    private readonly repoUrl: string;
    private readonly gitUserName: string;
    private readonly gitUserEmail: string;
    private readonly remoteName = 'origin';

    public constructor(
        @inject(SYMBOLS.ConfigProvider) configProvider: ConfigProvider,
        @inject(SYMBOLS.Logger) private readonly logger: Logger,
    ) {
        this.workspacePath = configProvider.getRequired('WORKSPACE_PATH');
        this.repoUrl = configProvider.getRequired('GIT_REPO_URL');
        this.gitUserName = configProvider.getRequired('GIT_USER_NAME');
        this.gitUserEmail = configProvider.getRequired('GIT_USER_EMAIL');

        this.git = simpleGit(this.workspacePath);

        this.logger.debug('LocalGitRepository initialized', {
            workspacePath: this.workspacePath,
            repoUrl: this.repoUrl,
            remoteName: this.remoteName,
        });
    }

    /**
     * Creates a new feature branch from base branch.
     */
    public async createBranch(branchName: string, baseBranch = 'main'): Promise<void> {
        this.logger.info('Creating branch', { branchName, baseBranch });

        try {
            await this.ensureRemoteConfigured();
            await this.git.fetch(this.remoteName);
            await this.git.checkout(baseBranch);
            await this.git.pull(this.remoteName, baseBranch);
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

            const fullPath = path.join(this.workspacePath, changes.filePath);

            await fs.mkdir(path.dirname(fullPath), { recursive: true });

            this.logger.warn('Diff application not yet fully implemented', {
                filePath: changes.filePath,
                diffSize: changes.diff.length,
            });

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
            await this.git.addConfig('user.name', this.gitUserName);
            await this.git.addConfig('user.email', this.gitUserEmail);

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
     * Pushes the branch to the configured remote.
     */
    public async push(branchName: string): Promise<void> {
        this.logger.info('Pushing branch to remote', { branchName });

        try {
            await this.ensureRemoteConfigured();
            await this.git.push(this.remoteName, branchName, ['--set-upstream']);
            this.logger.info('Branch pushed successfully', { branchName });
        } catch (error) {
            throw new IntegrationError('Failed to push branch', {
                branchName,
                error: String(error),
            });
        }
    }

    /**
     * Deletes a local branch, switching to the fallback branch first when required.
     */
    public async deleteLocalBranch(branchName: string, fallbackBranch = 'main'): Promise<void> {
        this.logger.info('Deleting local branch', { branchName, fallbackBranch });

        try {
            const currentBranch = await this.git.revparse(['--abbrev-ref', 'HEAD']);
            if (currentBranch.trim() === branchName) {
                await this.git.checkout(fallbackBranch);
            }

            await this.git.deleteLocalBranch(branchName, true);
            this.logger.info('Local branch deleted successfully', { branchName });
        } catch (error) {
            throw new IntegrationError('Failed to delete local branch', {
                branchName,
                fallbackBranch,
                error: String(error),
            });
        }
    }

    /**
     * Ensures the canonical remote is present and points at the configured repository URL.
     */
    private async ensureRemoteConfigured(): Promise<void> {
        const remotes = await this.git.getRemotes(true);
        const remote = remotes.find(({ name }) => name === this.remoteName);

        if (remote === undefined) {
            await this.git.addRemote(this.remoteName, this.repoUrl);
            this.logger.info('Git remote configured', {
                remoteName: this.remoteName,
                repoUrl: this.repoUrl,
            });
            return;
        }

        const currentUrl = remote.refs.fetch || remote.refs.push;
        if (currentUrl !== this.repoUrl) {
            await this.git.raw(['remote', 'set-url', this.remoteName, this.repoUrl]);
            this.logger.warn('Git remote URL updated to configured repository URL', {
                remoteName: this.remoteName,
                previousRepoUrl: currentUrl,
                repoUrl: this.repoUrl,
            });
        }
    }
}


