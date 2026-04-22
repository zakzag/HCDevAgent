import { injectable, inject } from 'inversify';
import type { VersionControl, CodeChanges, PrOptions, PullRequest, PrStatus } from '@hcdevagent/shared';
import { SYMBOLS } from '@hcdevagent/shared';
import type { GitProvider } from './GitProvider.js';
import type { GitRepository } from './GitRepository.js';

/**
 * Version-control facade that combines provider-agnostic local Git operations
 * with provider-specific remote collaboration features.
 */
@injectable()
export class LocalGitVersionControl implements VersionControl {
    public constructor(
        @inject(SYMBOLS.GitRepository) private readonly gitRepository: GitRepository,
        @inject(SYMBOLS.GitProvider) private readonly gitProvider: GitProvider,
    ) {}

    /**
     * Creates a new feature branch from base branch.
     */
    public async createBranch(branchName: string, baseBranch = 'main'): Promise<void> {
        await this.gitRepository.createBranch(branchName, baseBranch);
    }

    /**
     * Stages and applies code changes to the working tree.
     */
    public async applyChanges(changes: CodeChanges): Promise<void> {
        await this.gitRepository.applyChanges(changes);
    }

    /**
     * Commits staged changes and returns the commit SHA.
     */
    public async commit(message: string): Promise<string> {
        return this.gitRepository.commit(message);
    }

    /**
     * Pushes the branch to remote.
     */
    public async push(branchName: string): Promise<void> {
        await this.gitRepository.push(branchName);
    }

    /**
     * Creates a pull request using the selected remote provider.
     */
    public async createPullRequest(options: PrOptions): Promise<PullRequest> {
        return this.gitProvider.createPullRequest(options);
    }

    /**
     * Gets the status of a pull request by ID.
     */
    public async getPullRequestStatus(prId: string): Promise<PrStatus> {
        return this.gitProvider.getPullRequestStatus(prId);
    }

    /**
     * Deletes both remote and local branches.
     */
    public async deleteBranch(branchName: string): Promise<void> {
        await this.gitProvider.deleteRemoteBranch(branchName);
        await this.gitRepository.deleteLocalBranch(branchName);
    }
}

