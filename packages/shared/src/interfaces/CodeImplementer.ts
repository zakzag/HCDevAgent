import type { CodeChanges, CodebaseContext } from '../types/domain.types.js';

/**
 * Generates code changes based on an approved plan.
 * Matches 3-interfaces.md §6.
 */
export interface CodeImplementer {
    /** Generate code changes for the full plan. */
    implementPlan(planForAi: string, codebase: CodebaseContext): Promise<CodeChanges>;

    /** Re-generate code incorporating PR review feedback. */
    applyPrFeedback(planForAi: string, codebase: CodebaseContext, reviewComments: string): Promise<CodeChanges>;

    /** Continue implementation after human clarification. */
    answerClarification(planForAi: string, codebase: CodebaseContext, clarification: string): Promise<CodeChanges>;
}
