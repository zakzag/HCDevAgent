/**
 * Workflow status constants matching Jira issue statuses.
 */
export const WORKFLOW_STATUSES = {
  TODO: 'To Do',
  IN_PROGRESS: 'In Progress',
  INVESTIGATING: 'Investigating',
  PLANNING: 'Planning',
  IMPLEMENTING: 'Implementing',
  CODE_REVIEW: 'Code Review',
  TESTING: 'Testing',
  DONE: 'Done',
  FAILED: 'Failed',
} as const;

/** Union type of all valid workflow statuses. */
export type WorkflowStatus = (typeof WORKFLOW_STATUSES)[keyof typeof WORKFLOW_STATUSES];

