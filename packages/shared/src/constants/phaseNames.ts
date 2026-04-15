/**
 * Phase name constants for the agent workflow.
 */
export const PHASE_NAMES = {
  INVESTIGATION: 'investigation',
  PLANNING: 'planning',
  IMPLEMENTATION: 'implementation',
  QUALITY_CHECK: 'quality_check',
  CODE_REVIEW: 'code_review',
} as const;

/** Union type of all valid phase names. */
export type PhaseName = (typeof PHASE_NAMES)[keyof typeof PHASE_NAMES];

