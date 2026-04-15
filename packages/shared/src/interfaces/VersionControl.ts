import type { PullRequest } from '../types/domain.types.js';

/**
 * Manages version control operations (branches, commits, PRs).
 */
export interface VersionControl {
  /** Creates a new branch from the default branch. */
  createBranch(branchName: string): Promise<void>;

  /** Commits changes to the current branch. */
  commitChanges(message: string, files: ReadonlyArray<string>): Promise<string>;

  /** Creates a pull request. */
  createPullRequest(
    title: string,
    description: string,
    sourceBranch: string,
  ): Promise<PullRequest>;

  /** Gets the status of a pull request by ID. */
  getPullRequestStatus(prId: string): Promise<string>;
}

