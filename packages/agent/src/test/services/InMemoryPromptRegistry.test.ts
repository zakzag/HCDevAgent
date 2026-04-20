import { describe, it, expect, beforeEach } from 'vitest';
import { ConfigError } from '@hcdevagent/shared';
import { InMemoryPromptRegistry } from '../../services/prompts/InMemoryPromptRegistry.js';

describe('InMemoryPromptRegistry', () => {
    let registry: InMemoryPromptRegistry;

    beforeEach(() => {
        registry = new InMemoryPromptRegistry();
    });

    describe('getPrompt — known static keys (no placeholders)', () => {
        it('returns a non-empty string for investigation.system', () => {
            const result = registry.getPrompt('investigation.system', {});
            expect(typeof result).toBe('string');
            expect(result.length).toBeGreaterThan(0);
        });

        it('returns a non-empty string for planning.system', () => {
            const result = registry.getPrompt('planning.system', {});
            expect(result.length).toBeGreaterThan(0);
        });

        it('returns a non-empty string for planning.refine.system', () => {
            const result = registry.getPrompt('planning.refine.system', {});
            expect(result.length).toBeGreaterThan(0);
        });

        it('returns a non-empty string for implementation.system', () => {
            const result = registry.getPrompt('implementation.system', {});
            expect(result.length).toBeGreaterThan(0);
        });
    });

    describe('getPrompt — user prompts with variables', () => {
        it('resolves investigation.user with all required variables', () => {
            const result = registry.getPrompt('investigation.user', {
                issueKey: 'TEST-1',
                summary: 'Some summary',
                description: 'Some description',
                status: 'Open',
                labels: 'backend',
                commentsSection: '',
                relatedIssuesSection: '',
            });
            expect(result).toContain('TEST-1');
            expect(result).toContain('Some summary');
            expect(result).toContain('Some description');
        });

        it('includes commentsSection verbatim in investigation.user', () => {
            const result = registry.getPrompt('investigation.user', {
                issueKey: 'TEST-1',
                summary: 'summary',
                description: 'desc',
                status: 'Open',
                labels: 'none',
                commentsSection: '\n\nComments:\n  [Alice]: hello',
                relatedIssuesSection: '',
            });
            expect(result).toContain('[Alice]: hello');
        });

        it('resolves planning.user with descriptionForAi and no feedback', () => {
            const result = registry.getPrompt('planning.user', {
                descriptionForAi: '## Summary\nDo stuff.',
                feedbackSection: '',
            });
            expect(result).toContain('## Summary');
            expect(result).not.toContain('Additional feedback');
        });

        it('resolves planning.user with feedback section', () => {
            const result = registry.getPrompt('planning.user', {
                descriptionForAi: '## Summary\nDo stuff.',
                feedbackSection: '\n\nAdditional feedback:\nFix the tests.',
            });
            expect(result).toContain('Fix the tests.');
        });

        it('resolves planning.refine.user with both variables', () => {
            const result = registry.getPrompt('planning.refine.user', {
                existingPlanForAi: '## META\n- issueKey: TEST-1',
                rejectionComment: 'Missing tests',
            });
            expect(result).toContain('TEST-1');
            expect(result).toContain('Missing tests');
        });

        it('resolves implementation.user with plan and codebase', () => {
            const result = registry.getPrompt('implementation.user', {
                planForAi: '## STEPS\n### STEP 1',
                codebaseContext: 'File: src/index.ts',
            });
            expect(result).toContain('## STEPS');
            expect(result).toContain('src/index.ts');
        });

        it('resolves implementation.pr-feedback.user with review comments', () => {
            const result = registry.getPrompt('implementation.pr-feedback.user', {
                planForAi: 'plan',
                reviewComments: 'Add null checks',
                codebaseContext: 'context',
            });
            expect(result).toContain('Add null checks');
        });

        it('resolves implementation.clarification.user with clarification', () => {
            const result = registry.getPrompt('implementation.clarification.user', {
                planForAi: 'plan',
                clarification: 'Use JWT tokens',
                codebaseContext: 'context',
            });
            expect(result).toContain('Use JWT tokens');
        });
    });

    describe('getPrompt — error handling', () => {
        it('throws ConfigError for an unknown prompt key', () => {
            expect(() =>
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                (registry as any).getPrompt('unknown.key', {}),
            ).toThrow(ConfigError);
        });

        it('includes the unknown key in the error message', () => {
            expect(() =>
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                (registry as any).getPrompt('totally.unknown', {}),
            ).toThrow('totally.unknown');
        });
    });
});

