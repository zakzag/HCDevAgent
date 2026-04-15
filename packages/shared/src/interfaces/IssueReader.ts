import type { Issue } from '../types/domain.types.js';
import type { Comment } from '../types/domain.types.js';

/**
 * Low-level read adapter for the issue tracker (e.g., Jira REST API).
 * Matches 3-interfaces.md §1.
 */
export interface IssueReader {
    /** Fetch all issues currently in the given workflow status. */
    fetchIssuesByStatus(statusName: string): Promise<ReadonlyArray<Issue>>;

    /** Fetch full issue details by key. */
    getIssue(issueKey: string): Promise<Issue>;

    /** Fetch all comments on an issue, ordered chronologically. */
    getComments(issueKey: string): Promise<ReadonlyArray<Comment>>;

    /** Fetch the most recent comment (used to read human replies). */
    getLatestComment(issueKey: string): Promise<Comment | null>;

    /** Read the value of a custom field. */
    getCustomField(issueKey: string, fieldName: string): Promise<string | null>;

    /** Read the current workflow status of an issue. */
    getStatus(issueKey: string): Promise<string>;
}
