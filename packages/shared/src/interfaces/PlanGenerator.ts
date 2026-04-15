import type { InvestigationResult } from '../types/phases.types.js';
import type { PlanResult } from '../types/phases.types.js';

/**
 * Generates an implementation plan from investigation results.
 */
export interface PlanGenerator {
  /** Generates a step-by-step plan for implementing the issue. */
  generatePlan(investigation: InvestigationResult): Promise<PlanResult>;
}

