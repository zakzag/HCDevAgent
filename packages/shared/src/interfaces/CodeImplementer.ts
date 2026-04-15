import type { PlanResult, QualityReport } from '../types/phases.types.js';

/**
 * Implements code changes based on a plan.
 */
export interface CodeImplementer {
  /** Implements the plan and returns a quality report. */
  implement(plan: PlanResult): Promise<QualityReport>;
}

