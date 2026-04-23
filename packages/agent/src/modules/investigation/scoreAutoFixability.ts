import type {
    AutoFixabilityMetrics,
    AutoFixabilityReport,
    AutoFixabilityMetricKey,
    InvestigationContext,
    InvestigatorAutomationSettings,
    Issue,
} from '@hcdevagent/shared';

/** Input required to compute the final auto-fixability decision from AI metrics and project settings. */
export interface ScoreAutoFixabilityInput {
    readonly ready: boolean;
    readonly metrics: AutoFixabilityMetrics;
    readonly automationSettings: InvestigatorAutomationSettings;
    readonly issue: Issue;
    readonly contextUsed: InvestigationContext;
    readonly assumptions: ReadonlyArray<string>;
    readonly suggestedFollowUp: ReadonlyArray<string>;
}

const METRIC_KEYS: ReadonlyArray<AutoFixabilityMetricKey> = [
    'acceptanceCriteriaCoverage',
    'reproductionClarity',
    'codeContextCoverage',
    'changeLocality',
    'dependencyConfidence',
    'testability',
    'blastRadiusConfidence',
    'humanDecisionIndependence',
];

const roundScore = (value: number): number => Math.round(Math.min(Math.max(value, 0), 100));

const matchesRiskPattern = (filePath: string, pattern: string): boolean => filePath.toLowerCase().includes(pattern.toLowerCase());

const computeWeightedScore = (metrics: AutoFixabilityMetrics, settings: InvestigatorAutomationSettings): number => {
    const totalWeight = METRIC_KEYS.reduce((sum, key) => sum + settings.weights[key], 0);
    if (totalWeight <= 0) {
        return 0;
    }

    const weighted = METRIC_KEYS.reduce((sum, key) => sum + metrics[key].score * settings.weights[key], 0);
    return roundScore(weighted / totalWeight);
};

/** Computes the final auto-fixability report used for workflow routing decisions. */
export const scoreAutoFixability = ({
    ready,
    metrics,
    automationSettings,
    issue,
    contextUsed,
    assumptions,
    suggestedFollowUp,
}: ScoreAutoFixabilityInput): AutoFixabilityReport => {
    const blockingReasons: Array<string> = [];
    const score = computeWeightedScore(metrics, automationSettings);

    if (!ready) {
        blockingReasons.push('The issue is not ready for planning yet and still needs clarification.');
    }

    for (const metricKey of automationSettings.blockingMetrics) {
        if (metrics[metricKey].score < automationSettings.minimumMetricScore) {
            blockingReasons.push(
                `${metricKey} scored ${metrics[metricKey].score}, below the minimum blocking threshold of ${automationSettings.minimumMetricScore}.`,
            );
        }
    }

    const matchedRiskyPaths = contextUsed.relevantFiles.filter((filePath) =>
        automationSettings.riskyPathPatterns.some((pattern) => matchesRiskPattern(filePath, pattern)),
    );
    if (matchedRiskyPaths.length > 0) {
        blockingReasons.push(`Relevant code touches risky paths: ${matchedRiskyPaths.join(', ')}.`);
    }

    const matchedLabels = issue.labels.filter((label) => automationSettings.humanReviewLabels.includes(label));
    if (matchedLabels.length > 0) {
        blockingReasons.push(`Issue labels require human review: ${matchedLabels.join(', ')}.`);
    }

    if (ready && score < automationSettings.minimumScore) {
        blockingReasons.push(
            `Overall auto-fixability score ${score} is below the project minimum of ${automationSettings.minimumScore}.`,
        );
    }

    const decision = !ready
        ? 'needsHumanClarification'
        : blockingReasons.length === 0 && score >= automationSettings.minimumScore
            ? 'autoFixable'
            : 'needsHumanReview';

    return {
        decision,
        score,
        threshold: automationSettings.minimumScore,
        blockingReasons,
        assumptions,
        suggestedFollowUp,
        metrics,
    };
};



