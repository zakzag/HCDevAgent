import type { ActiveIssue, ExecutionLogEntry, PhaseMetric } from '../types/storage.types.js';

/**
 * Abstraction for persistent storage operations.
 */
export interface StorageAdapter {
  /** Saves or updates an active issue record. */
  upsertActiveIssue(activeIssue: ActiveIssue): Promise<void>;

  /** Retrieves an active issue by its key. */
  getActiveIssue(issueKey: string): Promise<ActiveIssue | null>;

  /** Removes an active issue record. */
  removeActiveIssue(issueKey: string): Promise<void>;

  /** Retrieves all currently active issues. */
  getAllActiveIssues(): Promise<ReadonlyArray<ActiveIssue>>;

  /** Appends an execution log entry. */
  appendLog(entry: ExecutionLogEntry): Promise<void>;

  /** Retrieves execution logs for an issue. */
  getLogs(issueKey: string): Promise<ReadonlyArray<ExecutionLogEntry>>;

  /** Records a phase metric. */
  recordMetric(metric: PhaseMetric): Promise<void>;
}

