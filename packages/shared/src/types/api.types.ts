/**
 * API request and response types for the REST and WebSocket server.
 */

import type { Issue } from './domain.types.js';
import type { PlanResult, QualityReport } from './phases.types.js';
import type { ActiveIssue, ExecutionLogEntry } from './storage.types.js';

/** Response shape for listing issues. */
export interface IssueListResponse {
  readonly issues: ReadonlyArray<Issue>;
  readonly total: number;
}

/** Response shape for a single issue detail. */
export interface IssueDetailResponse {
  readonly issue: Issue;
  readonly activeIssue: ActiveIssue | null;
  readonly plan: PlanResult | null;
  readonly qualityReport: QualityReport | null;
  readonly logs: ReadonlyArray<ExecutionLogEntry>;
}

/** Response shape for agent status. */
export interface AgentStatusResponse {
  readonly isRunning: boolean;
  readonly activeIssuesCount: number;
  readonly uptime: number;
}

/** WebSocket event payload. */
export interface WsEventPayload {
  readonly event: string;
  readonly data: unknown;
  readonly timestamp: string;
}

