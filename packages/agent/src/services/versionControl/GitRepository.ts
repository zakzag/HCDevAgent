import type { CodeChanges } from '@hcdevagent/shared';

/**
 * Common local Git repository operations that are independent of any hosting provider.
 */
export interface GitRepository {
    /** Create a new feature branch from base (default: main). */
    createBranch(branchName: string, baseBranch?: string): Promise<void>;

    /** Stage file modifications in the working tree. */
    applyChanges(changes: CodeChanges): Promise<void>;

    /** Commit staged changes, returns commit SHA. */
    commit(message: string): Promise<string>;

    /** Push the branch to the configured remote. */
    push(branchName: string): Promise<void>;

    /** Delete a local branch, checking out a fallback branch first when needed. */
    deleteLocalBranch(branchName: string, fallbackBranch?: string): Promise<void>;
}

