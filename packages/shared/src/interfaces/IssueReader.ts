import type { Issue } from '../types/domain.types.js';

/**
 * Reads issues from an issue tracker system.
 */
export interface IssueReader {
  /** Fetches a single issue by its key. */
  getIssue(issueKey: string): Promise<Issue>;

  /** Fetches issues matching a given query or filter. */
  getIssues(query: string): Promise<ReadonlyArray<Issue>>;
}

