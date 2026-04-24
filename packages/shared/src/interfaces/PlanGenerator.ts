/**
 * Generates implementation plans from the enhanced Description For AI.
 * Matches 3-interfaces.md §5.
 */
export interface PlanGenerator {
    /** Generate the reviewer-facing implementation plan from the enhanced description. */
    generatePlan(descriptionForAi: string, feedback?: string): Promise<string>;

    /** Re-generate the reviewer-facing plan incorporating human rejection feedback. */
    refinePlan(existingPlan: string, rejectionComment: string, descriptionForAi: string): Promise<string>;

    /** Generate the machine-readable implementation plan once the human plan is approved. */
    generatePlanForAi(descriptionForAi: string, approvedPlan: string): Promise<string>;
}
