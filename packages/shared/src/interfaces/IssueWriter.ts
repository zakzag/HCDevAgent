/**
 * Writes updates to an issue tracker system.
 */
export interface IssueWriter {
  /** Transitions an issue to a new status. */
  transitionIssue(issueKey: string, targetStatus: string): Promise<void>;

  /** Adds a comment to an issue. */
  addComment(issueKey: string, body: string): Promise<void>;

  /** Updates custom fields on an issue. */
  updateFields(issueKey: string, fields: Record<string, unknown>): Promise<void>;
}

