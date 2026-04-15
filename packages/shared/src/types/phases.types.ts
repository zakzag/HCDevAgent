/**
 * Phase result types for each agent workflow phase.
 * Matches 3-interfaces.md §4, §5, §6.
 */

/** Result of a single quality check during investigation. */
export interface CheckResult {
    readonly passed: boolean;
    readonly summary: string;
}

/** Detailed breakdown of each quality check during investigation. */
export interface QualityReport {
    readonly clarity: CheckResult;
    readonly completeness: CheckResult;
    readonly ambiguity: CheckResult;
    readonly specificity: CheckResult;
    readonly conflictDetection: CheckResult;
    readonly scope: CheckResult;
}

/** Result of the investigation phase (3-interfaces.md §4). */
export interface InvestigationResult {
    readonly ready: boolean;
    readonly descriptionForAi: string | null;
    readonly clarificationQuestions: ReadonlyArray<string> | null;
    readonly qualityReport: QualityReport;
}

/** Result of the planning phase (3-interfaces.md §5). */
export interface PlanResult {
    readonly plan: string;
    readonly planForAi: string;
}
