/**
 * Event name constants for the internal event bus.
 */
export const EVENT_NAMES = {
  ISSUE_PICKED: 'issue.picked',
  INVESTIGATION_STARTED: 'investigation.started',
  INVESTIGATION_COMPLETED: 'investigation.completed',
  PLAN_STARTED: 'plan.started',
  PLAN_COMPLETED: 'plan.completed',
  IMPLEMENTATION_STARTED: 'implementation.started',
  IMPLEMENTATION_COMPLETED: 'implementation.completed',
  QUALITY_CHECK_PASSED: 'quality.check.passed',
  QUALITY_CHECK_FAILED: 'quality.check.failed',
  PR_CREATED: 'pr.created',
  PHASE_FAILED: 'phase.failed',
} as const;

/** Union type of all valid event names. */
export type EventName = (typeof EVENT_NAMES)[keyof typeof EVENT_NAMES];

