/**
 * Storage-related types for persistence layer.
 */

/** Represents an issue currently being processed by the agent. */
export interface ActiveIssue {
  readonly issueKey: string;
  readonly currentPhase: string;
  readonly startedAt: string;
  readonly updatedAt: string;
  readonly retryCount: number;
  readonly metadata: Record<string, unknown>;
}

/** Represents a single execution log entry. */
export interface ExecutionLogEntry {
  readonly id: string;
  readonly issueKey: string;
  readonly phase: string;
  readonly status: 'started' | 'completed' | 'failed';
  readonly message: string;
  readonly timestamp: string;
  readonly durationMs: number | null;
}

/** Metrics for a single phase execution. */
export interface PhaseMetric {
  readonly issueKey: string;
  readonly phase: string;
  readonly startedAt: string;
  readonly completedAt: string | null;
  readonly durationMs: number | null;
  readonly success: boolean;
  readonly errorMessage: string | null;
}

