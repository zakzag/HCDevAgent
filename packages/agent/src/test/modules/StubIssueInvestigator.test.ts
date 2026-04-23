import { describe, it, expect } from 'vitest';
import { StubIssueInvestigator } from '../../modules/investigation/OpenAiIssueInvestigator.js';
import { testIssue } from '../fixtures/testIssue.fixture.js';

describe('StubIssueInvestigator', () => {
    const investigator = new StubIssueInvestigator();

    it('should always return ready: true', async () => {
        const result = await investigator.investigate(testIssue);
        expect(result.ready).toBe(true);
    });

    it('should return a non-null descriptionForAi', async () => {
        const result = await investigator.investigate(testIssue);
        expect(result.descriptionForAi).toBeTruthy();
        expect(typeof result.descriptionForAi).toBe('string');
    });

    it('should return null clarificationQuestions', async () => {
        const result = await investigator.investigate(testIssue);
        expect(result.clarificationQuestions).toBeNull();
    });

    it('should return an all-passed quality report', async () => {
        const result = await investigator.investigate(testIssue);
        const { qualityReport } = result;
        expect(qualityReport.clarity.passed).toBe(true);
        expect(qualityReport.completeness.passed).toBe(true);
        expect(qualityReport.ambiguity.passed).toBe(true);
        expect(qualityReport.specificity.passed).toBe(true);
        expect(qualityReport.conflictDetection.passed).toBe(true);
        expect(qualityReport.scope.passed).toBe(true);
    });

    it('should include the issue summary in the description', async () => {
        const result = await investigator.investigate(testIssue);
        expect(result.descriptionForAi).toContain(testIssue.summary);
    });

    it('should include the issue key in the description', async () => {
        const result = await investigator.investigate(testIssue);
        expect(result.descriptionForAi).toContain(testIssue.key);
    });

    it('should work with relatedIssues parameter', async () => {
        const result = await investigator.investigate(testIssue, [testIssue]);
        expect(result.ready).toBe(true);
    });

    it('should return a default context payload', async () => {
        const result = await investigator.investigate(testIssue);
        expect(result.contextUsed.projectDescription).toContain('Stub');
        expect(result.contextUsed.codeChunksContext).toContain('Stub');
    });

    it('should mark the stub result as auto-fixable', async () => {
        const result = await investigator.investigate(testIssue);
        expect(result.autoFixabilityReport.decision).toBe('autoFixable');
        expect(result.autoFixabilityReport.score).toBe(100);
    });
});

