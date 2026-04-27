import type {
    AutoFixabilityMetrics,
    AutoFixabilityReport,
    CheckResult,
    Comment,
    InvestigationContext,
    InvestigationResult,
    InvestigatorBypassSettings,
    Issue,
    QualityReport,
    ScoredCheckResult,
} from '@hcdevagent/shared';

/**
 * Discriminated union returned by `detectInvestigationBypass`.
 * When `bypassed` is true the triggering comment is included.
 */
export type BypassDetectionResult =
    | { readonly bypassed: false }
    | { readonly bypassed: true; readonly triggeringComment: Comment };

/**
 * Scans all comments on an issue for a human bypass instruction.
 * Returns the first comment that matches one of the configured trigger phrases
 * (case-insensitive). Returns `{ bypassed: false }` when no match is found or
 * when the bypass feature is disabled.
 */
export const detectInvestigationBypass = (
    issue: Issue,
    bypassSettings: InvestigatorBypassSettings,
): BypassDetectionResult => {
    if (!bypassSettings.enabled || bypassSettings.triggerPhrases.length === 0) {
        return { bypassed: false };
    }

    const lowerPhrases = bypassSettings.triggerPhrases.map((phrase) => phrase.toLowerCase());

    for (const comment of issue.comments) {
        const lowerBody = comment.body.toLowerCase();
        if (lowerPhrases.some((phrase) => lowerBody.includes(phrase))) {
            return { bypassed: true, triggeringComment: comment };
        }
    }

    return { bypassed: false };
};

/** Synthetic check result used for all quality dimensions when investigation is bypassed. */
const BYPASSED_CHECK: CheckResult = {
    passed: true,
    summary: 'Bypassed by human instruction.',
};

/** Synthetic scored metric used for all auto-fixability metrics when investigation is bypassed. */
const BYPASSED_SCORED: ScoredCheckResult = {
    score: 100,
    summary: 'Bypassed by human instruction.',
};

const BYPASSED_QUALITY_REPORT: QualityReport = {
    clarity: BYPASSED_CHECK,
    completeness: BYPASSED_CHECK,
    ambiguity: BYPASSED_CHECK,
    specificity: BYPASSED_CHECK,
    conflictDetection: BYPASSED_CHECK,
    scope: BYPASSED_CHECK,
};

const BYPASSED_METRICS: AutoFixabilityMetrics = {
    acceptanceCriteriaCoverage: BYPASSED_SCORED,
    reproductionClarity: BYPASSED_SCORED,
    codeContextCoverage: BYPASSED_SCORED,
    changeLocality: BYPASSED_SCORED,
    dependencyConfidence: BYPASSED_SCORED,
    testability: BYPASSED_SCORED,
    blastRadiusConfidence: BYPASSED_SCORED,
    humanDecisionIndependence: BYPASSED_SCORED,
};

/**
 * Builds a synthetic `InvestigationResult` that marks the issue as ready for planning
 * without running AI investigation.
 * The `descriptionForAi` is derived directly from the issue's summary and description.
 */
export const buildBypassedInvestigationResult = (
    issue: Issue,
    contextUsed: InvestigationContext,
    triggeringComment: Comment,
): InvestigationResult => {
    const descriptionForAi = [
        '## Summary',
        issue.summary,
        '',
        '## Description',
        issue.description || '(no description provided)',
    ].join('\n');

    const autoFixabilityReport: AutoFixabilityReport = {
        decision: 'autoFixable',
        score: 100,
        threshold: 0,
        blockingReasons: [],
        assumptions: [
            `Investigation bypassed by comment from ${triggeringComment.author}: "${triggeringComment.body}"`,
        ],
        suggestedFollowUp: [],
        metrics: BYPASSED_METRICS,
    };

    return {
        ready: true,
        descriptionForAi,
        clarificationQuestions: null,
        qualityReport: BYPASSED_QUALITY_REPORT,
        contextUsed,
        autoFixabilityReport,
    };
};

