import { describe, it, expect } from 'vitest';
import { IntegrationError } from '@hcdevagent/shared';
import {
    parseInvestigationResponse,
    renderDescriptionForAi,
    type DescriptionForAiSections,
} from '../../modules/investigation/parseInvestigationResponse.js';

const makeBaseResponse = (descriptionForAi: string | DescriptionForAiSections | null) => JSON.stringify({
    ready: true,
    descriptionForAi,
    clarificationQuestions: null,
    qualityReport: {
        clarity: { passed: true, summary: 'Clear' },
        completeness: { passed: true, summary: 'Complete' },
        ambiguity: { passed: true, summary: 'Unambiguous' },
        specificity: { passed: true, summary: 'Specific' },
        conflictDetection: { passed: true, summary: 'No conflicts' },
        scope: { passed: true, summary: 'Scoped' },
    },
    autoFixabilityMetrics: {
        acceptanceCriteriaCoverage: { score: 90, summary: 'Covered' },
        reproductionClarity: { score: 90, summary: 'Clear' },
        codeContextCoverage: { score: 90, summary: 'Anchored' },
        changeLocality: { score: 90, summary: 'Localized' },
        dependencyConfidence: { score: 90, summary: 'Known' },
        testability: { score: 90, summary: 'Testable' },
        blastRadiusConfidence: { score: 90, summary: 'Low risk' },
        humanDecisionIndependence: { score: 90, summary: 'Independent' },
    },
    assumptions: [],
    suggestedFollowUp: [],
});

describe('parseInvestigationResponse', () => {
    it('should preserve string descriptionForAi responses', () => {
        const response = parseInvestigationResponse(makeBaseResponse('## Summary\nExisting markdown'), 'TEST-1');

        expect(response.descriptionForAi).toBe('## Summary\nExisting markdown');
    });

    it('should normalize structured descriptionForAi objects into markdown', () => {
        const sections: DescriptionForAiSections = {
            summary: 'Initialize the monorepo structure.',
            goal: 'Create a clean frontend/backend repository baseline.',
            requirements: ['Create frontend/ and backend/ folders', 'Add a README'],
            acceptanceCriteria: ['Repository contains both folders', 'README explains setup'],
            constraints: 'Use the existing monorepo tooling decisions.',
            context: 'This is the first repository bootstrap task.',
        };

        const response = parseInvestigationResponse(makeBaseResponse(sections), 'TEST-1');

        expect(response.descriptionForAi).toBe(renderDescriptionForAi(sections));
        expect(response.descriptionForAi).toContain('## Summary');
        expect(response.descriptionForAi).toContain('- Create frontend/ and backend/ folders');
        expect(response.descriptionForAi).toContain('- [ ] Repository contains both folders');
    });

    it('should normalize empty structured arrays with explicit placeholders', () => {
        const sections: DescriptionForAiSections = {
            summary: 'Summary',
            goal: 'Goal',
            requirements: [],
            acceptanceCriteria: [],
            constraints: 'Constraints',
            context: 'Context',
        };

        const response = parseInvestigationResponse(makeBaseResponse(sections), 'TEST-1');

        expect(response.descriptionForAi).toContain('- None specified');
        expect(response.descriptionForAi).toContain('- [ ] None specified');
    });

    it('should parse fenced JSON responses', () => {
        const raw = `\`\`\`json\n${makeBaseResponse('## Summary\nFenced')}\n\`\`\``;

        const response = parseInvestigationResponse(raw, 'TEST-1');

        expect(response.descriptionForAi).toBe('## Summary\nFenced');
    });

    it('should throw when descriptionForAi object is malformed', () => {
        const raw = JSON.stringify({
            ready: true,
            descriptionForAi: {
                summary: 'Summary only',
            },
            clarificationQuestions: null,
            qualityReport: {
                clarity: { passed: true, summary: 'Clear' },
                completeness: { passed: true, summary: 'Complete' },
                ambiguity: { passed: true, summary: 'Unambiguous' },
                specificity: { passed: true, summary: 'Specific' },
                conflictDetection: { passed: true, summary: 'No conflicts' },
                scope: { passed: true, summary: 'Scoped' },
            },
            autoFixabilityMetrics: {
                acceptanceCriteriaCoverage: { score: 90, summary: 'Covered' },
                reproductionClarity: { score: 90, summary: 'Clear' },
                codeContextCoverage: { score: 90, summary: 'Anchored' },
                changeLocality: { score: 90, summary: 'Localized' },
                dependencyConfidence: { score: 90, summary: 'Known' },
                testability: { score: 90, summary: 'Testable' },
                blastRadiusConfidence: { score: 90, summary: 'Low risk' },
                humanDecisionIndependence: { score: 90, summary: 'Independent' },
            },
            assumptions: [],
            suggestedFollowUp: [],
        });

        expect(() => parseInvestigationResponse(raw, 'TEST-1')).toThrow(IntegrationError);
    });
});

