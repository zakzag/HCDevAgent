/**
 * Low-level write adapter for the issue tracker (e.g., Jira REST API).
 * Matches 3-interfaces.md §2.
 */
export interface IssueWriter {
    /** Move the issue to a new workflow status. */
    transitionStatus(issueKey: string, statusName: string): Promise<void>;

    /** Post a comment on the issue. */
    addComment(issueKey: string, body: string): Promise<void>;

    /** Write a value to a custom Jira field. */
    updateCustomField(issueKey: string, fieldName: string, value: string): Promise<void>;
}
