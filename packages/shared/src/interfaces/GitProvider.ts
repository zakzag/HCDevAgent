import type { PrOptions, PrStatus, PullRequest } from '../types/domain.types.js';

/**
 * Common interface for remote Git hosting providers such as GitHub or GitLab.
 */
export interface GitProvider {
    /** Open a pull/merge request on the remote platform. */
    createPullRequest(options: PrOptions): Promise<PullRequest>;

    /** Check the status of a pull/merge request on the remote platform. */
    getPullRequestStatus(prId: string): Promise<PrStatus>;

    /** Delete a remote branch on the hosting platform. */
    deleteRemoteBranch(branchName: string): Promise<void>;
}

