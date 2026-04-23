import type {
    AutoFixabilityMetricKey,
    AutoFixabilityWeights,
    InvestigatorAutomationSettings,
} from '@hcdevagent/shared';

/** Settings controlling how repository files are selected for investigation context. */
export interface InvestigatorContextCollectionSettings {
    readonly includeExtensions: ReadonlyArray<string>;
    readonly excludeDirectories: ReadonlyArray<string>;
    readonly alwaysIncludeFiles: ReadonlyArray<string>;
    readonly maxFiles: number;
    readonly maxFileChars: number;
    readonly maxTotalChars: number;
    readonly maxCandidateFiles: number;
}

/** Repository-specific investigator settings loaded from `.agent/project-settings.json`. */
export interface InvestigatorProjectSettings {
    readonly projectDescriptionFile: string;
    readonly contextCollection: InvestigatorContextCollectionSettings;
    readonly autoFixability: InvestigatorAutomationSettings;
}

/** Placeholder section for future planner-specific project tuning. */
export interface PlannerProjectSettings {
    readonly notes: ReadonlyArray<string>;
}

/** Placeholder section for future implementer-specific project tuning. */
export interface ImplementerProjectSettings {
    readonly notes: ReadonlyArray<string>;
}

/** Complete repository-specific settings document stored under `.agent/`. */
export interface ProjectSettings {
    readonly schemaVersion: number;
    readonly investigator: InvestigatorProjectSettings;
    readonly planner: PlannerProjectSettings;
    readonly implementer: ImplementerProjectSettings;
}

const DEFAULT_AUTO_FIXABILITY_WEIGHTS: AutoFixabilityWeights = {
    acceptanceCriteriaCoverage: 0.2,
    reproductionClarity: 0.1,
    codeContextCoverage: 0.15,
    changeLocality: 0.1,
    dependencyConfidence: 0.15,
    testability: 0.1,
    blastRadiusConfidence: 0.1,
    humanDecisionIndependence: 0.1,
};

/** Default project settings used when the `.agent` settings file is missing or invalid. */
export const DEFAULT_PROJECT_SETTINGS: ProjectSettings = {
    schemaVersion: 1,
    investigator: {
        projectDescriptionFile: '.agent/project-description.md',
        contextCollection: {
            includeExtensions: ['.ts', '.tsx', '.js', '.jsx', '.json', '.md'],
            excludeDirectories: ['.git', '.agent', 'node_modules', 'dist', 'coverage', '.turbo'],
            alwaysIncludeFiles: ['README.md', 'package.json'],
            maxFiles: 6,
            maxFileChars: 1800,
            maxTotalChars: 7200,
            maxCandidateFiles: 200,
        },
        autoFixability: {
            minimumScore: 72,
            minimumMetricScore: 55,
            blockingMetrics: ['dependencyConfidence', 'blastRadiusConfidence', 'humanDecisionIndependence'],
            riskyPathPatterns: ['src/index.ts', 'src/server', 'auth', 'billing', 'payment', 'migration'],
            humanReviewLabels: ['needs-product-decision', 'breaking-change', 'security-sensitive'],
            weights: DEFAULT_AUTO_FIXABILITY_WEIGHTS,
        },
    },
    planner: {
        notes: [
            'Keep human-readable and machine-readable plans aligned.',
            'Highlight assumptions inherited from investigation.',
        ],
    },
    implementer: {
        notes: [
            'Prefer small, reversible changes.',
            'Expand tests before changing risky files.',
        ],
    },
};

const AUTO_FIXABILITY_METRIC_KEYS: ReadonlyArray<AutoFixabilityMetricKey> = [
    'acceptanceCriteriaCoverage',
    'reproductionClarity',
    'codeContextCoverage',
    'changeLocality',
    'dependencyConfidence',
    'testability',
    'blastRadiusConfidence',
    'humanDecisionIndependence',
];

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null;

const cloneStringArray = (values: ReadonlyArray<string>): Array<string> => [...values];

const clampNumber = (value: number, min: number, max: number): number => Math.min(Math.max(value, min), max);

const readString = (value: unknown, fallback: string): string => (typeof value === 'string' && value.trim() !== '' ? value : fallback);

const readNumber = (value: unknown, fallback: number, min: number, max: number): number => {
    if (typeof value !== 'number' || Number.isNaN(value)) {
        return fallback;
    }

    return clampNumber(value, min, max);
};

const readStringArray = (value: unknown, fallback: ReadonlyArray<string>): Array<string> => {
    if (!Array.isArray(value)) {
        return cloneStringArray(fallback);
    }

    return value.filter((entry): entry is string => typeof entry === 'string' && entry.trim() !== '');
};

const readMetricKeyArray = (
    value: unknown,
    fallback: ReadonlyArray<AutoFixabilityMetricKey>,
): Array<AutoFixabilityMetricKey> => {
    if (!Array.isArray(value)) {
        return [...fallback];
    }

    return value.filter((entry): entry is AutoFixabilityMetricKey =>
        typeof entry === 'string' && AUTO_FIXABILITY_METRIC_KEYS.includes(entry as AutoFixabilityMetricKey),
    );
};

const parseWeights = (value: unknown, fallback: AutoFixabilityWeights): AutoFixabilityWeights => {
    if (!isRecord(value)) {
        return { ...fallback };
    }

    return {
        acceptanceCriteriaCoverage: readNumber(value['acceptanceCriteriaCoverage'], fallback.acceptanceCriteriaCoverage, 0, 1),
        reproductionClarity: readNumber(value['reproductionClarity'], fallback.reproductionClarity, 0, 1),
        codeContextCoverage: readNumber(value['codeContextCoverage'], fallback.codeContextCoverage, 0, 1),
        changeLocality: readNumber(value['changeLocality'], fallback.changeLocality, 0, 1),
        dependencyConfidence: readNumber(value['dependencyConfidence'], fallback.dependencyConfidence, 0, 1),
        testability: readNumber(value['testability'], fallback.testability, 0, 1),
        blastRadiusConfidence: readNumber(value['blastRadiusConfidence'], fallback.blastRadiusConfidence, 0, 1),
        humanDecisionIndependence: readNumber(value['humanDecisionIndependence'], fallback.humanDecisionIndependence, 0, 1),
    };
};

const parseContextCollection = (value: unknown): InvestigatorContextCollectionSettings => {
    const fallback = DEFAULT_PROJECT_SETTINGS.investigator.contextCollection;
    if (!isRecord(value)) {
        return {
            includeExtensions: cloneStringArray(fallback.includeExtensions),
            excludeDirectories: cloneStringArray(fallback.excludeDirectories),
            alwaysIncludeFiles: cloneStringArray(fallback.alwaysIncludeFiles),
            maxFiles: fallback.maxFiles,
            maxFileChars: fallback.maxFileChars,
            maxTotalChars: fallback.maxTotalChars,
            maxCandidateFiles: fallback.maxCandidateFiles,
        };
    }

    return {
        includeExtensions: readStringArray(value['includeExtensions'], fallback.includeExtensions),
        excludeDirectories: readStringArray(value['excludeDirectories'], fallback.excludeDirectories),
        alwaysIncludeFiles: readStringArray(value['alwaysIncludeFiles'], fallback.alwaysIncludeFiles),
        maxFiles: readNumber(value['maxFiles'], fallback.maxFiles, 1, 20),
        maxFileChars: readNumber(value['maxFileChars'], fallback.maxFileChars, 200, 10_000),
        maxTotalChars: readNumber(value['maxTotalChars'], fallback.maxTotalChars, 500, 50_000),
        maxCandidateFiles: readNumber(value['maxCandidateFiles'], fallback.maxCandidateFiles, 10, 2_000),
    };
};

const parseAutoFixability = (value: unknown): InvestigatorAutomationSettings => {
    const fallback = DEFAULT_PROJECT_SETTINGS.investigator.autoFixability;
    if (!isRecord(value)) {
        return {
            minimumScore: fallback.minimumScore,
            minimumMetricScore: fallback.minimumMetricScore,
            blockingMetrics: [...fallback.blockingMetrics],
            riskyPathPatterns: cloneStringArray(fallback.riskyPathPatterns),
            humanReviewLabels: cloneStringArray(fallback.humanReviewLabels),
            weights: { ...fallback.weights },
        };
    }

    return {
        minimumScore: readNumber(value['minimumScore'], fallback.minimumScore, 0, 100),
        minimumMetricScore: readNumber(value['minimumMetricScore'], fallback.minimumMetricScore, 0, 100),
        blockingMetrics: readMetricKeyArray(value['blockingMetrics'], fallback.blockingMetrics),
        riskyPathPatterns: readStringArray(value['riskyPathPatterns'], fallback.riskyPathPatterns),
        humanReviewLabels: readStringArray(value['humanReviewLabels'], fallback.humanReviewLabels),
        weights: parseWeights(value['weights'], fallback.weights),
    };
};

/** Parses project settings from JSON, falling back to safe defaults for unknown or missing values. */
export const parseProjectSettings = (value: unknown): ProjectSettings => {
    if (!isRecord(value)) {
        return {
            schemaVersion: DEFAULT_PROJECT_SETTINGS.schemaVersion,
            investigator: {
                projectDescriptionFile: DEFAULT_PROJECT_SETTINGS.investigator.projectDescriptionFile,
                contextCollection: parseContextCollection(undefined),
                autoFixability: parseAutoFixability(undefined),
            },
            planner: { notes: cloneStringArray(DEFAULT_PROJECT_SETTINGS.planner.notes) },
            implementer: { notes: cloneStringArray(DEFAULT_PROJECT_SETTINGS.implementer.notes) },
        };
    }

    const investigator = isRecord(value['investigator']) ? value['investigator'] : undefined;
    const planner = isRecord(value['planner']) ? value['planner'] : undefined;
    const implementer = isRecord(value['implementer']) ? value['implementer'] : undefined;

    return {
        schemaVersion: readNumber(value['schemaVersion'], DEFAULT_PROJECT_SETTINGS.schemaVersion, 1, 999),
        investigator: {
            projectDescriptionFile: readString(
                investigator?.['projectDescriptionFile'],
                DEFAULT_PROJECT_SETTINGS.investigator.projectDescriptionFile,
            ),
            contextCollection: parseContextCollection(investigator?.['contextCollection']),
            autoFixability: parseAutoFixability(investigator?.['autoFixability']),
        },
        planner: {
            notes: readStringArray(planner?.['notes'], DEFAULT_PROJECT_SETTINGS.planner.notes),
        },
        implementer: {
            notes: readStringArray(implementer?.['notes'], DEFAULT_PROJECT_SETTINGS.implementer.notes),
        },
    };
};

/** Renders investigator settings into a prompt-friendly string. */
export const formatInvestigatorSettingsContext = (settings: InvestigatorProjectSettings): string => [
    'Investigator settings:',
    `- Minimum auto-fix score: ${settings.autoFixability.minimumScore}`,
    `- Minimum blocking-metric score: ${settings.autoFixability.minimumMetricScore}`,
    `- Blocking metrics: ${settings.autoFixability.blockingMetrics.join(', ') || 'none'}`,
    `- Human-review labels: ${settings.autoFixability.humanReviewLabels.join(', ') || 'none'}`,
    `- Risky path patterns: ${settings.autoFixability.riskyPathPatterns.join(', ') || 'none'}`,
    `- Context max files: ${settings.contextCollection.maxFiles}`,
    `- Context max file chars: ${settings.contextCollection.maxFileChars}`,
].join('\n');


