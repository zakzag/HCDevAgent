/**
 * Phase result types for each agent workflow phase.
 * Matches 3-interfaces.md §4, §5, §6.
 */

/** Result of a single quality check during investigation. */
export interface CheckResult {
    readonly passed: boolean;
    readonly summary: string;
}

/** Result of a scored investigation metric used for auto-fixability decisions. */
export interface ScoredCheckResult {
    readonly score: number;
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

/** Metric names used for determining whether an issue can be handled autonomously. */
export type AutoFixabilityMetricKey =
    | 'acceptanceCriteriaCoverage'
    | 'reproductionClarity'
    | 'codeContextCoverage'
    | 'changeLocality'
    | 'dependencyConfidence'
    | 'testability'
    | 'blastRadiusConfidence'
    | 'humanDecisionIndependence';

/** Weighted auto-fixability metrics returned by investigation. */
export interface AutoFixabilityMetrics {
    readonly acceptanceCriteriaCoverage: ScoredCheckResult;
    readonly reproductionClarity: ScoredCheckResult;
    readonly codeContextCoverage: ScoredCheckResult;
    readonly changeLocality: ScoredCheckResult;
    readonly dependencyConfidence: ScoredCheckResult;
    readonly testability: ScoredCheckResult;
    readonly blastRadiusConfidence: ScoredCheckResult;
    readonly humanDecisionIndependence: ScoredCheckResult;
}

/** Relative weights used to compute the final auto-fixability score. */
export interface AutoFixabilityWeights {
    readonly acceptanceCriteriaCoverage: number;
    readonly reproductionClarity: number;
    readonly codeContextCoverage: number;
    readonly changeLocality: number;
    readonly dependencyConfidence: number;
    readonly testability: number;
    readonly blastRadiusConfidence: number;
    readonly humanDecisionIndependence: number;
}

/** Settings that allow a human to bypass the investigation phase via a comment command. */
export interface InvestigatorBypassSettings {
    /** Whether the bypass feature is enabled for this project. */
    readonly enabled: boolean;
    /**
     * Case-insensitive phrases that trigger the bypass when found in any issue comment.
     * Example: ["!bypass-investigation", "skip investigation"]
     */
    readonly triggerPhrases: ReadonlyArray<string>;
}

/** Project-level automation settings used to interpret the investigation metrics. */
export interface InvestigatorAutomationSettings {
    readonly minimumScore: number;
    readonly minimumMetricScore: number;
    readonly blockingMetrics: ReadonlyArray<AutoFixabilityMetricKey>;
    readonly riskyPathPatterns: ReadonlyArray<string>;
    readonly humanReviewLabels: ReadonlyArray<string>;
    readonly weights: AutoFixabilityWeights;
}

/** Repository context assembled before asking the AI to investigate an issue. */
export interface InvestigationContext {
    readonly projectDescription: string;
    readonly codeChunksContext: string;
    readonly investigatorSettingsContext: string;
    readonly relevantFiles: ReadonlyArray<string>;
}

/** Fully prepared investigation input assembled from repo files and project settings. */
export interface PreparedInvestigationContext {
    readonly contextUsed: InvestigationContext;
    readonly automationSettings: InvestigatorAutomationSettings;
    readonly bypassSettings: InvestigatorBypassSettings;
}

/** Final routing decision for whether the issue can proceed autonomously. */
export type AutoFixabilityDecision = 'autoFixable' | 'needsHumanReview' | 'needsHumanClarification';

/** Report describing whether the issue can likely be implemented without extra human interaction. */
export interface AutoFixabilityReport {
    readonly decision: AutoFixabilityDecision;
    readonly score: number;
    readonly threshold: number;
    readonly blockingReasons: ReadonlyArray<string>;
    readonly assumptions: ReadonlyArray<string>;
    readonly suggestedFollowUp: ReadonlyArray<string>;
    readonly metrics: AutoFixabilityMetrics;
}

/** Result of the investigation phase (3-interfaces.md §4). */
export interface InvestigationResult {
    readonly ready: boolean;
    readonly descriptionForAi: string | null;
    readonly clarificationQuestions: ReadonlyArray<string> | null;
    readonly qualityReport: QualityReport;
    readonly contextUsed: InvestigationContext;
    readonly autoFixabilityReport: AutoFixabilityReport;
}

/**
 * Stored planning artifacts for one issue.
 * `planForAi` remains null until the human-approved plan is converted into the
 * machine-readable implementation contract.
 */
export interface PlanResult {
    readonly plan: string;
    readonly planForAi: string | null;
}
