/**
 * Event name constants for the internal event bus.
 */
export const EVENT_NAMES = {
    // Conductor lifecycle
    CONDUCTOR_STARTED: 'conductor.started',
    CONDUCTOR_STOPPED: 'conductor.stopped',
    CONDUCTOR_POLL: 'conductor.poll',
    CONDUCTOR_IDLE: 'conductor.idle',
    CONDUCTOR_ERROR: 'conductor.error',

    // Issue pickup
    ISSUE_PICKED: 'issue.picked',

    // Investigation phase
    INVESTIGATION_STARTED: 'investigation.started',
    INVESTIGATION_READY: 'investigation.ready',
    INVESTIGATION_BLOCKED: 'investigation.blocked',
    INVESTIGATION_FAILED: 'investigation.failed',

    // Planning phase
    PLAN_STARTED: 'plan.started',
    PLAN_COMPLETED: 'plan.completed',
    PLAN_REJECTED: 'plan.rejected',

    // Implementation phase
    IMPLEMENTATION_STARTED: 'implementation.started',
    IMPLEMENTATION_COMPLETED: 'implementation.completed',
    IMPLEMENTATION_BLOCKED: 'implementation.blocked',

    // PR phase
    PR_CREATED: 'pr.created',
    PR_APPROVED: 'pr.approved',
    PR_CHANGES_REQUESTED: 'pr.changes.requested',

    // Terminal states
    ISSUE_DONE: 'issue.done',
    ISSUE_FAILED: 'issue.failed',
    ISSUE_CANCELLED: 'issue.cancelled',
} as const;

/** Union type of all valid event names. */
export type EventName = (typeof EVENT_NAMES)[keyof typeof EVENT_NAMES];
