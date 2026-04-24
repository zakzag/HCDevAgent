import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { AiClient, Logger, PreparedInvestigationContext } from '@hcdevagent/shared';
import { IntegrationError } from '@hcdevagent/shared';
import { CopilotIssueInvestigator } from '../../modules/investigation/CopilotIssueInvestigator.js';
import type { Issue } from '@hcdevagent/shared';
import { createMockPromptRegistry } from '../mocks/MockPromptRegistry.js';
import {
    createMockInvestigationContextProvider,
    DEFAULT_PREPARED_INVESTIGATION_CONTEXT,
} from '../mocks/MockInvestigationContextProvider.js';

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
    autoFixabilityMetrics: {
        acceptanceCriteriaCoverage: { score: 90, summary: 'Acceptance criteria are explicit enough.' },
        reproductionClarity: { score: 80, summary: 'Expected behavior is clear.' },
        codeContextCoverage: { score: 85, summary: 'Code context points to the right area.' },
        changeLocality: { score: 78, summary: 'Change appears localized.' },
        dependencyConfidence: { score: 88, summary: 'Dependencies are known.' },
        testability: { score: 92, summary: 'Tests are straightforward.' },
        blastRadiusConfidence: { score: 83, summary: 'Low risk of regressions.' },
        humanDecisionIndependence: { score: 86, summary: 'No additional product decisions required.' },
    },
    assumptions: ['GitHub is the only OAuth provider in scope.'],
    suggestedFollowUp: ['Proceed directly to planning and implementation.'],
});

const makeStructuredReadyResponse = () => JSON.stringify({
    ready: true,
    descriptionForAi: {
        summary: 'Initialize the monorepo structure with required components.',
        goal: 'Provide the frontend and backend baseline for future implementation work.',
        requirements: [
            'Create frontend/ and backend/ folders',
            'Add repository documentation',
        ],
        acceptanceCriteria: [
            'The monorepo contains the expected top-level folders',
            'Documentation explains how to work with the repository',
        ],
        constraints: 'Keep the existing monorepo and toolchain decisions intact.',
        context: 'This task bootstraps the repository for later feature work.',
    },
    clarificationQuestions: null,
    qualityReport: {
        clarity: { passed: true, summary: 'Clear' },
        completeness: { passed: true, summary: 'Complete' },
        ambiguity: { passed: true, summary: 'No ambiguity' },
        specificity: { passed: true, summary: 'Specific' },
        conflictDetection: { passed: true, summary: 'No conflicts' },
        scope: { passed: true, summary: 'Well-scoped' },
    },
    autoFixabilityMetrics: {
        acceptanceCriteriaCoverage: { score: 90, summary: 'Acceptance criteria are explicit enough.' },
        reproductionClarity: { score: 80, summary: 'Expected behavior is clear.' },
        codeContextCoverage: { score: 85, summary: 'Code context points to the right area.' },
        changeLocality: { score: 78, summary: 'Change appears localized.' },
        dependencyConfidence: { score: 88, summary: 'Dependencies are known.' },
        testability: { score: 92, summary: 'Tests are straightforward.' },
        blastRadiusConfidence: { score: 83, summary: 'Low risk of regressions.' },
        humanDecisionIndependence: { score: 86, summary: 'No additional product decisions required.' },
    },
    assumptions: ['This is the initial repository bootstrap.'],
    suggestedFollowUp: ['Proceed directly to planning and implementation.'],
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
    autoFixabilityMetrics: {
        acceptanceCriteriaCoverage: { score: 25, summary: 'Acceptance criteria are missing.' },
        reproductionClarity: { score: 40, summary: 'Expected behavior is only partially described.' },
        codeContextCoverage: { score: 60, summary: 'Some relevant code is available.' },
        changeLocality: { score: 65, summary: 'Likely localized.' },
        dependencyConfidence: { score: 35, summary: 'Provider dependency is missing.' },
        testability: { score: 45, summary: 'Tests cannot be derived yet.' },
        blastRadiusConfidence: { score: 60, summary: 'Risk is unclear.' },
        humanDecisionIndependence: { score: 30, summary: 'Needs a product decision.' },
    },
    assumptions: ['The provider could be GitHub or Google.'],
    suggestedFollowUp: ['Ask which OAuth provider is required.'],
});

describe('CopilotIssueInvestigator', () => {
    let aiClient: AiClient;
    let investigator: CopilotIssueInvestigator;
    let preparedContext: PreparedInvestigationContext;

    beforeEach(() => {
        aiClient = createMockAiClient();
        preparedContext = DEFAULT_PREPARED_INVESTIGATION_CONTEXT;
        investigator = new CopilotIssueInvestigator(
            aiClient,
            createMockLogger(),
            createMockPromptRegistry(),
            createMockInvestigationContextProvider(preparedContext),
        );
    });

    describe('investigate — ready issue', () => {
        it('returns ready=true with descriptionForAi', async () => {
            vi.mocked(aiClient.complete).mockResolvedValue(makeReadyResponse());

            const result = await investigator.investigate(makeIssue());

            expect(result.ready).toBe(true);
            expect(result.descriptionForAi).toContain('## Summary');
            expect(result.clarificationQuestions).toBeNull();
            expect(result.autoFixabilityReport.decision).toBe('autoFixable');
            expect(aiClient.complete).toHaveBeenCalledWith(expect.any(String), expect.any(String), { role: 'investigation' });
        });

        it('normalizes structured descriptionForAi objects into markdown', async () => {
            vi.mocked(aiClient.complete).mockResolvedValue(makeStructuredReadyResponse());

            const result = await investigator.investigate(makeIssue());

            expect(result.ready).toBe(true);
            expect(result.descriptionForAi).toContain('## Summary');
            expect(result.descriptionForAi).toContain('Initialize the monorepo structure with required components.');
            expect(result.descriptionForAi).toContain('- Create frontend/ and backend/ folders');
            expect(result.descriptionForAi).toContain('- [ ] The monorepo contains the expected top-level folders');
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

        it('returns the repository context used during investigation', async () => {
            vi.mocked(aiClient.complete).mockResolvedValue(makeReadyResponse());

            const result = await investigator.investigate(makeIssue());

            expect(result.contextUsed.projectDescription).toContain('Project description');
            expect(result.contextUsed.codeChunksContext).toContain('src/index.ts');
            expect(result.contextUsed.relevantFiles).toContain('src/index.ts');
        });
    });

    describe('investigate — not ready issue', () => {
        it('returns ready=false with clarificationQuestions', async () => {
            vi.mocked(aiClient.complete).mockResolvedValue(makeNotReadyResponse());

            const result = await investigator.investigate(makeIssue());

            expect(result.ready).toBe(false);
            expect(result.descriptionForAi).toBeNull();
            expect(result.clarificationQuestions).toHaveLength(2);
            expect(result.autoFixabilityReport.decision).toBe('needsHumanClarification');
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

        it('includes project description and code chunks in the prompt', async () => {
            vi.mocked(aiClient.complete).mockResolvedValue(makeReadyResponse());

            await investigator.investigate(makeIssue());

            const userPrompt = vi.mocked(aiClient.complete).mock.calls[0][1] as string;
            expect(userPrompt).toContain('Project description for tests');
            expect(userPrompt).toContain('File: src/index.ts');
            expect(userPrompt).toContain('Investigator settings: test defaults');
        });

        it('downgrades ready issues to human review when repo settings flag risky files', async () => {
            const riskyPreparedContext: PreparedInvestigationContext = {
                ...DEFAULT_PREPARED_INVESTIGATION_CONTEXT,
                contextUsed: {
                    ...DEFAULT_PREPARED_INVESTIGATION_CONTEXT.contextUsed,
                    relevantFiles: ['src/index.ts'],
                },
                automationSettings: {
                    ...DEFAULT_PREPARED_INVESTIGATION_CONTEXT.automationSettings,
                    riskyPathPatterns: ['src/index.ts'],
                },
            };
            investigator = new CopilotIssueInvestigator(
                aiClient,
                createMockLogger(),
                createMockPromptRegistry(),
                createMockInvestigationContextProvider(riskyPreparedContext),
            );
            vi.mocked(aiClient.complete).mockResolvedValue(makeReadyResponse());

            const result = await investigator.investigate(makeIssue());

            expect(result.ready).toBe(true);
            expect(result.autoFixabilityReport.decision).toBe('needsHumanReview');
            expect(result.autoFixabilityReport.blockingReasons[0]).toContain('risky paths');
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

