import { describe, it, expect } from 'vitest';
import type { Comment, InvestigationContext, InvestigatorBypassSettings, Issue } from '@hcdevagent/shared';
import {
    buildBypassedInvestigationResult,
    detectInvestigationBypass,
} from '../../modules/investigation/investigationBypass.js';

const makeComment = (overrides: Partial<Comment> = {}): Comment => ({
    id: 'c1',
    author: 'Alice',
    body: 'Some comment text',
    createdAt: '2026-01-01T00:00:00Z',
    ...overrides,
});

const makeIssue = (overrides: Partial<Issue> = {}): Issue => ({
    id: '1',
    key: 'TEST-1',
    summary: 'Setup repository',
    description: 'Create a monorepo layout.',
    status: 'Selected for Triage',
    assignee: null,
    labels: [],
    comments: [],
    customFields: {},
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    ...overrides,
});

const makeBypassSettings = (overrides: Partial<InvestigatorBypassSettings> = {}): InvestigatorBypassSettings => ({
    enabled: true,
    triggerPhrases: ['!bypass-investigation', 'skip investigation'],
    ...overrides,
});

const makeContext = (): InvestigationContext => ({
    projectDescription: 'A test project',
    codeChunksContext: 'File: src/index.ts\n```\nconst x = 1;\n```',
    investigatorSettingsContext: 'Settings: defaults',
    relevantFiles: ['src/index.ts'],
});

describe('detectInvestigationBypass', () => {
    describe('when bypass is disabled', () => {
        it('returns bypassed=false even when a matching comment exists', () => {
            const issue = makeIssue({
                comments: [makeComment({ body: '!bypass-investigation please' })],
            });
            const result = detectInvestigationBypass(issue, makeBypassSettings({ enabled: false }));
            expect(result.bypassed).toBe(false);
        });
    });

    describe('when triggerPhrases is empty', () => {
        it('returns bypassed=false', () => {
            const issue = makeIssue({
                comments: [makeComment({ body: '!bypass-investigation' })],
            });
            const result = detectInvestigationBypass(issue, makeBypassSettings({ triggerPhrases: [] }));
            expect(result.bypassed).toBe(false);
        });
    });

    describe('when issue has no comments', () => {
        it('returns bypassed=false', () => {
            const result = detectInvestigationBypass(makeIssue(), makeBypassSettings());
            expect(result.bypassed).toBe(false);
        });
    });

    describe('when no comment matches any trigger phrase', () => {
        it('returns bypassed=false', () => {
            const issue = makeIssue({
                comments: [
                    makeComment({ id: 'c1', body: 'Please clarify the scope.' }),
                    makeComment({ id: 'c2', body: 'I agree with the above.' }),
                ],
            });
            const result = detectInvestigationBypass(issue, makeBypassSettings());
            expect(result.bypassed).toBe(false);
        });
    });

    describe('when a comment matches a trigger phrase', () => {
        it('returns bypassed=true with the matching comment', () => {
            const bypassComment = makeComment({ id: 'c2', body: 'Please !bypass-investigation and proceed.' });
            const issue = makeIssue({
                comments: [makeComment({ id: 'c1', body: 'First comment' }), bypassComment],
            });

            const result = detectInvestigationBypass(issue, makeBypassSettings());

            expect(result.bypassed).toBe(true);
            if (!result.bypassed) return;
            expect(result.triggeringComment.id).toBe('c2');
        });

        it('is case-insensitive', () => {
            const issue = makeIssue({
                comments: [makeComment({ body: 'SKIP INVESTIGATION please' })],
            });

            const result = detectInvestigationBypass(issue, makeBypassSettings());

            expect(result.bypassed).toBe(true);
        });

        it('returns the first matching comment when multiple comments match', () => {
            const first = makeComment({ id: 'first', body: '!bypass-investigation' });
            const second = makeComment({ id: 'second', body: 'skip investigation too' });
            const issue = makeIssue({ comments: [first, second] });

            const result = detectInvestigationBypass(issue, makeBypassSettings());

            expect(result.bypassed).toBe(true);
            if (!result.bypassed) return;
            expect(result.triggeringComment.id).toBe('first');
        });

        it('matches a trigger phrase embedded inside a longer comment body', () => {
            const issue = makeIssue({
                comments: [makeComment({ body: 'I would like to skip investigation for this one, thanks.' })],
            });

            const result = detectInvestigationBypass(issue, makeBypassSettings());

            expect(result.bypassed).toBe(true);
        });
    });
});

describe('buildBypassedInvestigationResult', () => {
    it('returns ready=true', () => {
        const result = buildBypassedInvestigationResult(makeIssue(), makeContext(), makeComment());
        expect(result.ready).toBe(true);
    });

    it('sets clarificationQuestions to null', () => {
        const result = buildBypassedInvestigationResult(makeIssue(), makeContext(), makeComment());
        expect(result.clarificationQuestions).toBeNull();
    });

    it('builds descriptionForAi from issue summary and description', () => {
        const issue = makeIssue({ summary: 'Setup repo', description: 'Create monorepo.' });
        const result = buildBypassedInvestigationResult(issue, makeContext(), makeComment());

        expect(result.descriptionForAi).toContain('## Summary');
        expect(result.descriptionForAi).toContain('Setup repo');
        expect(result.descriptionForAi).toContain('## Description');
        expect(result.descriptionForAi).toContain('Create monorepo.');
    });

    it('falls back to "(no description provided)" when description is empty', () => {
        const issue = makeIssue({ description: '' });
        const result = buildBypassedInvestigationResult(issue, makeContext(), makeComment());
        expect(result.descriptionForAi).toContain('(no description provided)');
    });

    it('sets all qualityReport dimensions to passed=true', () => {
        const result = buildBypassedInvestigationResult(makeIssue(), makeContext(), makeComment());

        expect(result.qualityReport.clarity.passed).toBe(true);
        expect(result.qualityReport.completeness.passed).toBe(true);
        expect(result.qualityReport.ambiguity.passed).toBe(true);
        expect(result.qualityReport.specificity.passed).toBe(true);
        expect(result.qualityReport.conflictDetection.passed).toBe(true);
        expect(result.qualityReport.scope.passed).toBe(true);
    });

    it('sets autoFixabilityReport decision to autoFixable with score 100', () => {
        const result = buildBypassedInvestigationResult(makeIssue(), makeContext(), makeComment());

        expect(result.autoFixabilityReport.decision).toBe('autoFixable');
        expect(result.autoFixabilityReport.score).toBe(100);
        expect(result.autoFixabilityReport.blockingReasons).toHaveLength(0);
    });

    it('records the triggering comment author and body in assumptions', () => {
        const comment = makeComment({ author: 'Bob', body: 'skip investigation plz' });
        const result = buildBypassedInvestigationResult(makeIssue(), makeContext(), comment);

        expect(result.autoFixabilityReport.assumptions[0]).toContain('Bob');
        expect(result.autoFixabilityReport.assumptions[0]).toContain('skip investigation plz');
    });

    it('passes through the contextUsed from the prepared context', () => {
        const context = makeContext();
        const result = buildBypassedInvestigationResult(makeIssue(), context, makeComment());
        expect(result.contextUsed).toBe(context);
    });

    it('sets all auto-fixability metric scores to 100', () => {
        const result = buildBypassedInvestigationResult(makeIssue(), makeContext(), makeComment());
        const { metrics } = result.autoFixabilityReport;

        expect(metrics.acceptanceCriteriaCoverage.score).toBe(100);
        expect(metrics.reproductionClarity.score).toBe(100);
        expect(metrics.codeContextCoverage.score).toBe(100);
        expect(metrics.changeLocality.score).toBe(100);
        expect(metrics.dependencyConfidence.score).toBe(100);
        expect(metrics.testability.score).toBe(100);
        expect(metrics.blastRadiusConfidence.score).toBe(100);
        expect(metrics.humanDecisionIndependence.score).toBe(100);
    });
});

