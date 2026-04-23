import { describe, expect, it } from 'vitest';
import type { AutoFixabilityMetrics, InvestigationContext, InvestigatorAutomationSettings, Issue } from '@hcdevagent/shared';
import { scoreAutoFixability } from '../../modules/investigation/scoreAutoFixability.js';

const testMetrics: AutoFixabilityMetrics = {
    acceptanceCriteriaCoverage: { score: 90, summary: 'Good coverage' },
    reproductionClarity: { score: 88, summary: 'Clear' },
    codeContextCoverage: { score: 82, summary: 'Anchored in code' },
    changeLocality: { score: 80, summary: 'Localized' },
    dependencyConfidence: { score: 86, summary: 'Dependencies known' },
    testability: { score: 91, summary: 'Testable' },
    blastRadiusConfidence: { score: 84, summary: 'Low blast radius' },
    humanDecisionIndependence: { score: 89, summary: 'No extra decisions needed' },
};

const testSettings: InvestigatorAutomationSettings = {
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
};

const testIssue: Issue = {
    id: '1',
    key: 'TEST-1',
    summary: 'Add endpoint',
    description: 'Add an endpoint for health checks',
    status: 'Issue Investigation',
    assignee: null,
    labels: [],
    comments: [],
    customFields: {},
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
};

const testContext: InvestigationContext = {
    projectDescription: 'Project description',
    codeChunksContext: 'File: src/health.ts',
    investigatorSettingsContext: 'Settings',
    relevantFiles: ['src/health.ts'],
};

describe('scoreAutoFixability', () => {
    it('marks ready issues as auto-fixable when metrics and settings pass', () => {
        const result = scoreAutoFixability({
            ready: true,
            metrics: testMetrics,
            automationSettings: testSettings,
            issue: testIssue,
            contextUsed: testContext,
            assumptions: [],
            suggestedFollowUp: [],
        });

        expect(result.decision).toBe('autoFixable');
        expect(result.score).toBeGreaterThanOrEqual(72);
        expect(result.blockingReasons).toHaveLength(0);
    });

    it('forces human review when risky files are involved', () => {
        const result = scoreAutoFixability({
            ready: true,
            metrics: testMetrics,
            automationSettings: {
                ...testSettings,
                riskyPathPatterns: ['src/health.ts'],
            },
            issue: testIssue,
            contextUsed: testContext,
            assumptions: [],
            suggestedFollowUp: [],
        });

        expect(result.decision).toBe('needsHumanReview');
        expect(result.blockingReasons[0]).toContain('risky paths');
    });

    it('forces clarification when the investigation is not ready', () => {
        const result = scoreAutoFixability({
            ready: false,
            metrics: testMetrics,
            automationSettings: testSettings,
            issue: testIssue,
            contextUsed: testContext,
            assumptions: ['Missing error details'],
            suggestedFollowUp: ['Ask for the failing request payload'],
        });

        expect(result.decision).toBe('needsHumanClarification');
        expect(result.blockingReasons[0]).toContain('not ready');
        expect(result.assumptions).toContain('Missing error details');
    });
});

