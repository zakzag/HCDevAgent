import type { CodeChanges, PrOptions, PrStatus, PullRequest } from '../types/domain.types.js';

/**
 * Abstracts Git operations and remote platform API (e.g., GitHub).
 * Matches 3-interfaces.md §7.
 */
export interface VersionControl {
    /** Create a new feature branch from base (default: main). */
    createBranch(branchName: string, baseBranch?: string): Promise<void>;

    /** Stage file modifications in the working tree. */
    applyChanges(changes: CodeChanges): Promise<void>;

    /** Commit staged changes, returns commit SHA. */
    commit(message: string): Promise<string>;

    /** Push branch to remote. */
    push(branchName: string): Promise<void>;

    /** Open a PR on the remote platform. */
    createPullRequest(options: PrOptions): Promise<PullRequest>;

    /** Check PR state (open, merged, changes requested). */
    getPullRequestStatus(prId: string): Promise<PrStatus>;

    /** Delete remote and local branch (cleanup after merge). */
    deleteBranch(branchName: string): Promise<void>;
}
