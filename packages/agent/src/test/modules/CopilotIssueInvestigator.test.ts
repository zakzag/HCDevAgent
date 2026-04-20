import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { AiClient, Logger } from '@hcdevagent/shared';
import { IntegrationError } from '@hcdevagent/shared';
import { CopilotIssueInvestigator } from '../../modules/investigation/CopilotIssueInvestigator.js';
import type { Issue } from '@hcdevagent/shared';
import { createMockPromptRegistry } from '../mocks/MockPromptRegistry.js';

const createMockAiClient = (): AiClient => ({
    complete: vi.fn(),
});

const createMockLogger = (): Logger => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    child: vi.fn().mockReturnThis(),
});

const makeIssue = (overrides: Partial<Issue> = {}): Issue => ({
    id: '1',
    key: 'TEST-1',
    summary: 'Add user authentication',
    description: 'Implement OAuth2 login with GitHub provider.',
    status: 'Selected for Triage',
    assignee: null,
    labels: [],
    comments: [],
    customFields: {},
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    ...overrides,
});

const makeReadyResponse = () => JSON.stringify({
    ready: true,
    descriptionForAi: '## Summary\nAdd OAuth2 login.\n\n## Goal\nUsers can log in.\n\n## Requirements\n- OAuth2\n\n## Acceptance Criteria\n- [ ] Login works\n\n## Constraints\nNone.\n\n## Context\nNew feature.',
    clarificationQuestions: null,
    qualityReport: {
        clarity: { passed: true, summary: 'Clear' },
        completeness: { passed: true, summary: 'Complete' },
        ambiguity: { passed: true, summary: 'No ambiguity' },
        specificity: { passed: true, summary: 'Specific' },
        conflictDetection: { passed: true, summary: 'No conflicts' },
        scope: { passed: true, summary: 'Well-scoped' },
    },
});

const makeNotReadyResponse = () => JSON.stringify({
    ready: false,
    descriptionForAi: null,
    clarificationQuestions: ['Which OAuth provider?', 'What user data to store?'],
    qualityReport: {
        clarity: { passed: true, summary: 'Clear' },
        completeness: { passed: false, summary: 'Missing provider details' },
        ambiguity: { passed: true, summary: 'No ambiguity' },
        specificity: { passed: false, summary: 'Provider not specified' },
        conflictDetection: { passed: true, summary: 'No conflicts' },
        scope: { passed: true, summary: 'Well-scoped' },
    },
});

describe('CopilotIssueInvestigator', () => {
    let aiClient: AiClient;
    let investigator: CopilotIssueInvestigator;

    beforeEach(() => {
        aiClient = createMockAiClient();
        investigator = new CopilotIssueInvestigator(aiClient, createMockLogger(), createMockPromptRegistry());
    });

    describe('investigate — ready issue', () => {
        it('returns ready=true with descriptionForAi', async () => {
            vi.mocked(aiClient.complete).mockResolvedValue(makeReadyResponse());

            const result = await investigator.investigate(makeIssue());

            expect(result.ready).toBe(true);
            expect(result.descriptionForAi).toContain('## Summary');
            expect(result.clarificationQuestions).toBeNull();
        });

        it('populates all qualityReport fields', async () => {
            vi.mocked(aiClient.complete).mockResolvedValue(makeReadyResponse());

            const result = await investigator.investigate(makeIssue());

            expect(result.qualityReport.clarity.passed).toBe(true);
            expect(result.qualityReport.completeness.passed).toBe(true);
            expect(result.qualityReport.ambiguity.passed).toBe(true);
            expect(result.qualityReport.specificity.passed).toBe(true);
            expect(result.qualityReport.conflictDetection.passed).toBe(true);
            expect(result.qualityReport.scope.passed).toBe(true);
        });
    });

    describe('investigate — not ready issue', () => {
        it('returns ready=false with clarificationQuestions', async () => {
            vi.mocked(aiClient.complete).mockResolvedValue(makeNotReadyResponse());

            const result = await investigator.investigate(makeIssue());

            expect(result.ready).toBe(false);
            expect(result.descriptionForAi).toBeNull();
            expect(result.clarificationQuestions).toHaveLength(2);
        });

        it('sets failing quality checks correctly', async () => {
            vi.mocked(aiClient.complete).mockResolvedValue(makeNotReadyResponse());

            const result = await investigator.investigate(makeIssue());

            expect(result.qualityReport.completeness.passed).toBe(false);
            expect(result.qualityReport.specificity.passed).toBe(false);
        });
    });

    describe('investigate — AI response handling', () => {
        it('strips markdown code fences from response', async () => {
            const fenced = '```json\n' + makeReadyResponse() + '\n```';
            vi.mocked(aiClient.complete).mockResolvedValue(fenced);

            const result = await investigator.investigate(makeIssue());

            expect(result.ready).toBe(true);
        });

        it('includes relatedIssues in the prompt when provided', async () => {
            vi.mocked(aiClient.complete).mockResolvedValue(makeReadyResponse());
            const related = [makeIssue({ key: 'TEST-2', summary: 'Related issue' })];

            await investigator.investigate(makeIssue(), related);

            const userPrompt = vi.mocked(aiClient.complete).mock.calls[0][1] as string;
            expect(userPrompt).toContain('TEST-2');
        });

        it('includes issue comments in the prompt', async () => {
            vi.mocked(aiClient.complete).mockResolvedValue(makeReadyResponse());
            const issue = makeIssue({
                comments: [{ id: 'c1', author: 'Alice', body: 'Please clarify scope.', createdAt: '2026-01-01' }],
            });

            await investigator.investigate(issue);

            const userPrompt = vi.mocked(aiClient.complete).mock.calls[0][1] as string;
            expect(userPrompt).toContain('Please clarify scope.');
        });
    });

    describe('investigate — error handling', () => {
        it('throws IntegrationError when AI returns invalid JSON', async () => {
            vi.mocked(aiClient.complete).mockResolvedValue('not json at all');

            await expect(investigator.investigate(makeIssue())).rejects.toThrow(IntegrationError);
        });

        it('throws IntegrationError when AI response is missing qualityReport', async () => {
            vi.mocked(aiClient.complete).mockResolvedValue(JSON.stringify({ ready: true }));

            await expect(investigator.investigate(makeIssue())).rejects.toThrow(IntegrationError);
        });

        it('throws IntegrationError when AI client throws', async () => {
            vi.mocked(aiClient.complete).mockRejectedValue(new Error('Network error'));

            await expect(investigator.investigate(makeIssue())).rejects.toThrow();
        });
    });
});

