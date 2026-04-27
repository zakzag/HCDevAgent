import { vi } from 'vitest';
import type { InvestigationContextProvider, PreparedInvestigationContext } from '@hcdevagent/shared';

/** Default prepared investigation context used across tests. */
export const DEFAULT_PREPARED_INVESTIGATION_CONTEXT: PreparedInvestigationContext = {
    contextUsed: {
        projectDescription: 'Project description for tests',
        codeChunksContext: 'File: src/index.ts\n```\nexport const app = {};\n```',
        investigatorSettingsContext: 'Investigator settings: test defaults',
        relevantFiles: ['src/index.ts'],
    },
    automationSettings: {
        minimumScore: 72,
        minimumMetricScore: 55,
        blockingMetrics: ['dependencyConfidence', 'blastRadiusConfidence', 'humanDecisionIndependence'],
        riskyPathPatterns: ['src/server.ts'],
        humanReviewLabels: ['needs-product-decision'],
        weights: {
            acceptanceCriteriaCoverage: 0.2,
            reproductionClarity: 0.1,
            codeContextCoverage: 0.15,
            changeLocality: 0.1,
            dependencyConfidence: 0.15,
            testability: 0.1,
            blastRadiusConfidence: 0.1,
            humanDecisionIndependence: 0.1,
        },
    },
    bypassSettings: {
        enabled: false,
        triggerPhrases: ['!bypass-investigation'],
    },
};

/** Creates a mock InvestigationContextProvider backed by a prepared result. */
export const createMockInvestigationContextProvider = (
    preparedContext: PreparedInvestigationContext = DEFAULT_PREPARED_INVESTIGATION_CONTEXT,
): InvestigationContextProvider => ({
    loadContext: vi.fn().mockResolvedValue(preparedContext),
});


