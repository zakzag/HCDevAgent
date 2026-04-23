import { injectable } from 'inversify';
import type { IssueInvestigator, Issue, InvestigationResult } from '@hcdevagent/shared';

/** All-passed quality report used by the stub. */
const STUB_QUALITY_REPORT = {
    clarity: { passed: true, summary: 'Stub: assumed clear' },
    completeness: { passed: true, summary: 'Stub: assumed complete' },
    ambiguity: { passed: true, summary: 'Stub: no ambiguity assumed' },
    specificity: { passed: true, summary: 'Stub: assumed specific' },
    conflictDetection: { passed: true, summary: 'Stub: no conflicts assumed' },
    scope: { passed: true, summary: 'Stub: assumed well-scoped' },
} as const;

/** All-high auto-fixability metrics used by the stub. */
const STUB_AUTO_FIXABILITY_METRICS = {
    acceptanceCriteriaCoverage: { score: 100, summary: 'Stub: fully covered' },
    reproductionClarity: { score: 100, summary: 'Stub: fully reproducible' },
    codeContextCoverage: { score: 100, summary: 'Stub: context assumed sufficient' },
    changeLocality: { score: 100, summary: 'Stub: assumed localized' },
    dependencyConfidence: { score: 100, summary: 'Stub: dependencies assumed known' },
    testability: { score: 100, summary: 'Stub: assumed testable' },
    blastRadiusConfidence: { score: 100, summary: 'Stub: low-risk change assumed' },
    humanDecisionIndependence: { score: 100, summary: 'Stub: no human decision needed' },
} as const;

/**
 * Stub implementation of IssueInvestigator that always returns ready.
 * Used during Step 2 to prove the Conductor flow before the real AI investigator is built.
 * Will be replaced by OpenAiIssueInvestigator in Step 3.
 */
@injectable()
export class StubIssueInvestigator implements IssueInvestigator {
    /** Always returns ready with a placeholder Description For AI. */
    public async investigate(issue: Issue, _relatedIssues?: ReadonlyArray<Issue>): Promise<InvestigationResult> {
        const descriptionForAi = [
            '## Summary',
            issue.summary,
            '',
            '## Goal',
            'Implement the changes described in this issue.',
            '',
            '## Requirements',
            `- ${issue.description || 'See original issue description'}`,
            '',
            '## Acceptance Criteria',
            '- [ ] Implementation matches the issue description',
            '- [ ] All tests pass',
            '',
            '## Constraints',
            'None identified (stub investigation).',
            '',
            '## Context',
            `Original issue: ${issue.key}`,
        ].join('\n');

        return {
            ready: true,
            descriptionForAi,
            clarificationQuestions: null,
            qualityReport: STUB_QUALITY_REPORT,
            contextUsed: {
                projectDescription: 'Stub project description',
                codeChunksContext: 'Stub code context',
                investigatorSettingsContext: 'Stub investigator settings',
                relevantFiles: [],
            },
            autoFixabilityReport: {
                decision: 'autoFixable',
                score: 100,
                threshold: 72,
                blockingReasons: [],
                assumptions: ['Stub investigator assumes all required details are present.'],
                suggestedFollowUp: [],
                metrics: STUB_AUTO_FIXABILITY_METRICS,
            },
        };
    }
}
