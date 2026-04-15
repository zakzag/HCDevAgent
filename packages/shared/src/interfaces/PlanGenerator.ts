import type { PlanResult } from '../types/phases.types.js';

/**
 * Generates implementation plans from the enhanced Description For AI.
 * Matches 3-interfaces.md §5.
 */
export interface PlanGenerator {
    /** Generate both plan formats from the enhanced description. */
    generatePlan(descriptionForAi: string, feedback?: string): Promise<PlanResult>;

    /** Re-generate both plans incorporating human rejection feedback. */
    refinePlan(existingPlanForAi: string, rejectionComment: string): Promise<PlanResult>;
}
