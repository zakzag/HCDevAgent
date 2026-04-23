import type {
    AutoFixabilityMetrics,
    CheckResult,
    QualityReport,
    ScoredCheckResult,
} from '@hcdevagent/shared';
import { IntegrationError } from '@hcdevagent/shared';

/** Raw shape expected from the AI JSON response for investigation. */
export interface InvestigationAiResponse {
    readonly ready: boolean;
    readonly descriptionForAi: string | null;
    readonly clarificationQuestions: ReadonlyArray<string> | null;
    readonly qualityReport: QualityReport;
    readonly autoFixabilityMetrics: AutoFixabilityMetrics;
    readonly assumptions: ReadonlyArray<string>;
    readonly suggestedFollowUp: ReadonlyArray<string>;
}

const QUALITY_DIMENSIONS = ['clarity', 'completeness', 'ambiguity', 'specificity', 'conflictDetection', 'scope'] as const;
const AUTO_FIXABILITY_METRICS = [
    'acceptanceCriteriaCoverage',
    'reproductionClarity',
    'codeContextCoverage',
    'changeLocality',
    'dependencyConfidence',
    'testability',
    'blastRadiusConfidence',
    'humanDecisionIndependence',
] as const;

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null;

const isStringArray = (value: unknown): value is Array<string> =>
    Array.isArray(value) && value.every((entry) => typeof entry === 'string');

const isCheckResult = (value: unknown): value is CheckResult =>
    isRecord(value) && typeof value['passed'] === 'boolean' && typeof value['summary'] === 'string';

const isScoredCheckResult = (value: unknown): value is ScoredCheckResult =>
    isRecord(value)
    && typeof value['score'] === 'number'
    && !Number.isNaN(value['score'])
    && typeof value['summary'] === 'string';

/** Strips markdown code fences from a string if present. */
export const stripCodeFences = (raw: string): string => {
    const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
    return fenced ? fenced[1].trim() : raw.trim();
};

/** Validates that the AI response conforms to the expected investigation schema. */
export const isValidInvestigationResponse = (value: unknown): value is InvestigationAiResponse => {
    if (!isRecord(value)) {
        return false;
    }

    if (typeof value['ready'] !== 'boolean') {
        return false;
    }

    if (!(typeof value['descriptionForAi'] === 'string' || value['descriptionForAi'] === null)) {
        return false;
    }

    if (!(value['clarificationQuestions'] === null || isStringArray(value['clarificationQuestions']))) {
        return false;
    }

    if (!isRecord(value['qualityReport']) || !isRecord(value['autoFixabilityMetrics'])) {
        return false;
    }

    const qualityReport = value['qualityReport'];
    const autoFixabilityMetrics = value['autoFixabilityMetrics'];

    return QUALITY_DIMENSIONS.every((dimension) => isCheckResult(qualityReport[dimension]))
        && AUTO_FIXABILITY_METRICS.every((metric) => isScoredCheckResult(autoFixabilityMetrics[metric]))
        && isStringArray(value['assumptions'])
        && isStringArray(value['suggestedFollowUp']);
};

/** Parses and validates the AI investigation response. */
export const parseInvestigationResponse = (raw: string, issueKey: string): InvestigationAiResponse => {
    const cleaned = stripCodeFences(raw);

    let parsed: unknown;
    try {
        parsed = JSON.parse(cleaned) as unknown;
    } catch {
        throw new IntegrationError('AI returned invalid JSON during investigation', {
            issueKey,
            raw: cleaned.slice(0, 500),
        });
    }

    if (!isValidInvestigationResponse(parsed)) {
        throw new IntegrationError('AI investigation response has unexpected shape', {
            issueKey,
            raw: cleaned.slice(0, 500),
        });
    }

    return parsed;
};

