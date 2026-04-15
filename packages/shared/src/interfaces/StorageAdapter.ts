import type { ActiveIssue, ExecutionLogEntry, PhaseMetric } from '../types/storage.types.js';

/**
 * Abstracts database operations for agent-internal data.
 * Matches 3-interfaces.md §8.
 */
export interface StorageAdapter {
    /** Fetch the currently active issue record. */
    getActiveIssue(): Promise<ActiveIssue | null>;

    /** Create or update the active issue record. */
    setActiveIssue(record: ActiveIssue): Promise<void>;

    /** Remove the active issue record (done / cancelled / failed). */
    clearActiveIssue(issueKey: string): Promise<void>;

    /** Append an audit log entry. */
    addExecutionLog(entry: ExecutionLogEntry): Promise<void>;

    /** Fetch execution history, optionally filtered by issue. */
    getExecutionHistory(issueKey?: string): Promise<ReadonlyArray<ExecutionLogEntry>>;

    /** Insert or update a phase metric record. */
    addMetric(metric: PhaseMetric): Promise<void>;

    /** Update an in-progress metric. */
    updateMetric(issueKey: string, phase: string, update: Partial<PhaseMetric>): Promise<void>;

    /** Fetch metrics, optionally filtered by issue. */
    getMetrics(issueKey?: string): Promise<ReadonlyArray<PhaseMetric>>;

    /** Read a runtime config override from the database. */
    getConfigOverride(key: string): Promise<unknown | null>;

    /** Upsert a runtime config override. */
    setConfigOverride(key: string, value: unknown, updatedBy?: string): Promise<void>;
}
