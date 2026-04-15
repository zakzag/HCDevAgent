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
        };
    }
}
