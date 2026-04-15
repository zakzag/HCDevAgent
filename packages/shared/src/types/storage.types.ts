/**
 * Storage-related types for persistence layer.
 * Matches 3-interfaces.md §8.
 */

/** Represents the currently active issue being processed by the agent. */
export interface ActiveIssue {
    readonly issueKey: string;
    readonly phase: string;
    readonly agentId: string;
    readonly currentStep: string | null;
    readonly branchName: string | null;
    readonly prUrl: string | null;
    readonly retryCount: number;
    readonly lastError: string | null;
    readonly startedAt: string;
    readonly updatedAt: string;
}

/** Represents a single execution log entry for audit purposes. */
export interface ExecutionLogEntry {
    readonly issueKey: string;
    readonly action: string;
    readonly timestamp: string;
    readonly phase: string;
    readonly details: string;
    readonly outcome: 'success' | 'failure' | 'skipped';
    readonly durationMs: number | null;
    readonly errorMessage: string | null;
}

/** Metrics for a single phase execution. */
export interface PhaseMetric {
    readonly issueKey: string;
    readonly phase: string;
    readonly startedAt: string;
    readonly completedAt: string | null;
    readonly durationMs: number | null;
    readonly aiTokensUsed: number;
    readonly aiCallCount: number;
    readonly retryCount: number;
    readonly outcome: 'success' | 'failure' | 'in_progress';
}
