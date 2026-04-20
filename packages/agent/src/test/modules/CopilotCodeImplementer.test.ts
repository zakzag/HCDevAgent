import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { AiClient, Logger, CodebaseContext } from '@hcdevagent/shared';
import { IntegrationError } from '@hcdevagent/shared';
import { CopilotCodeImplementer } from '../../modules/implementation/CopilotCodeImplementer.js';
import { createMockPromptRegistry } from '../mocks/MockPromptRegistry.js';

const createMockAiClient = (): AiClient => ({ complete: vi.fn() });
const createMockLogger = (): Logger => ({
    info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn(),
    child: vi.fn().mockReturnThis(),
});

const makeCodebase = (): CodebaseContext => ({
    structure: 'src/\n  index.ts',
    files: [{ path: 'src/index.ts', content: 'export const hello = () => "hello";' }],
});

const makeCodeResponse = () => JSON.stringify({
    filePath: 'src/auth.ts',
    diff: '--- /dev/null\n+++ b/src/auth.ts\n@@ -0,0 +1,3 @@\n+export const auth = () => {};',
    language: 'typescript',
});

describe('CopilotCodeImplementer', () => {
    let aiClient: AiClient;
    let implementer: CopilotCodeImplementer;

    beforeEach(() => {
        aiClient = createMockAiClient();
        implementer = new CopilotCodeImplementer(aiClient, createMockLogger(), createMockPromptRegistry());
    });

    describe('implementPlan', () => {
        it('returns CodeChanges from AI response', async () => {
            vi.mocked(aiClient.complete).mockResolvedValue(makeCodeResponse());

            const result = await implementer.implementPlan('## PLAN', makeCodebase());

            expect(result.filePath).toBe('src/auth.ts');
            expect(result.diff).toContain('src/auth.ts');
            expect(result.language).toBe('typescript');
        });

        it('includes plan and codebase context in prompt', async () => {
            vi.mocked(aiClient.complete).mockResolvedValue(makeCodeResponse());

            await implementer.implementPlan('## PLAN\nStep 1', makeCodebase());

            const userPrompt = vi.mocked(aiClient.complete).mock.calls[0][1] as string;
            expect(userPrompt).toContain('## PLAN');
            expect(userPrompt).toContain('src/index.ts');
        });

        it('strips code fences from AI response', async () => {
            vi.mocked(aiClient.complete).mockResolvedValue('```json\n' + makeCodeResponse() + '\n```');

            const result = await implementer.implementPlan('plan', makeCodebase());

            expect(result.filePath).toBe('src/auth.ts');
        });

        it('throws IntegrationError on invalid JSON', async () => {
            vi.mocked(aiClient.complete).mockResolvedValue('not json');

            await expect(implementer.implementPlan('plan', makeCodebase())).rejects.toThrow(IntegrationError);
        });

        it('throws IntegrationError when response is missing required fields', async () => {
            vi.mocked(aiClient.complete).mockResolvedValue(JSON.stringify({ filePath: 'only-path' }));

            await expect(implementer.implementPlan('plan', makeCodebase())).rejects.toThrow(IntegrationError);
        });
    });

    describe('applyPrFeedback', () => {
        it('includes review comments in prompt', async () => {
            vi.mocked(aiClient.complete).mockResolvedValue(makeCodeResponse());

            await implementer.applyPrFeedback('plan', makeCodebase(), 'Add null checks');

            const userPrompt = vi.mocked(aiClient.complete).mock.calls[0][1] as string;
            expect(userPrompt).toContain('Add null checks');
        });

        it('returns valid CodeChanges', async () => {
            vi.mocked(aiClient.complete).mockResolvedValue(makeCodeResponse());

            const result = await implementer.applyPrFeedback('plan', makeCodebase(), 'feedback');

            expect(result.filePath).toBeTruthy();
            expect(result.diff).toBeTruthy();
        });
    });

    describe('answerClarification', () => {
        it('includes clarification in prompt', async () => {
            vi.mocked(aiClient.complete).mockResolvedValue(makeCodeResponse());

            await implementer.answerClarification('plan', makeCodebase(), 'Use JWT tokens');

            const userPrompt = vi.mocked(aiClient.complete).mock.calls[0][1] as string;
            expect(userPrompt).toContain('Use JWT tokens');
        });

        it('returns valid CodeChanges', async () => {
            vi.mocked(aiClient.complete).mockResolvedValue(makeCodeResponse());

            const result = await implementer.answerClarification('plan', makeCodebase(), 'clarification');

            expect(result.language).toBe('typescript');
        });
    });
});

