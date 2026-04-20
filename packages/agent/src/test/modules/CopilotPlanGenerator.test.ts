import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { AiClient, Logger } from '@hcdevagent/shared';
import { IntegrationError } from '@hcdevagent/shared';
import { CopilotPlanGenerator } from '../../modules/planning/CopilotPlanGenerator.js';
import { createMockPromptRegistry } from '../mocks/MockPromptRegistry.js';

const createMockAiClient = (): AiClient => ({ complete: vi.fn() });
const createMockLogger = (): Logger => ({
    info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn(),
    child: vi.fn().mockReturnThis(),
});

const makePlanResponse = () => JSON.stringify({
    plan: '## Summary\nImplement auth.\n\n## Approach\nOAuth2.\n\n## Steps\n1. **Add route** — Add /auth route.\n\n## Files Affected\n- `src/auth.ts` — new file\n\n## Testing Strategy\nUnit tests.\n\n## Risks & Open Questions\nNone.\n\n## Checklist\n- [ ] All steps implemented',
    planForAi: '## META\n- issueKey: TEST-1\n- baseBranch: main\n- targetBranch: agent/TEST-1\n- estimatedFiles: 1\n- estimatedSteps: 1\n\n## DESCRIPTION\nImplement OAuth2.\n\n## STEPS\n### STEP 1: Add auth route\n- action: create\n- file: src/auth.ts\n- description: Create auth route.\n- dependencies: []\n- verification: Route returns 200.\n\n## TESTS\n### TEST 1: Auth route test\n- file: src/auth.test.ts\n- covers: [STEP 1]\n- cases:\n  - happy path: returns token\n  - error case: invalid credentials\n\n## VERIFICATION\n- [ ] All steps produce compilable code\n- [ ] All tests pass',
});

describe('CopilotPlanGenerator', () => {
    let aiClient: AiClient;
    let generator: CopilotPlanGenerator;

    beforeEach(() => {
        aiClient = createMockAiClient();
        generator = new CopilotPlanGenerator(aiClient, createMockLogger(), createMockPromptRegistry());
    });

    describe('generatePlan', () => {
        it('returns plan and planForAi from AI response', async () => {
            vi.mocked(aiClient.complete).mockResolvedValue(makePlanResponse());

            const result = await generator.generatePlan('## Summary\nAdd auth.');

            expect(result.plan).toContain('## Summary');
            expect(result.planForAi).toContain('## META');
        });

        it('includes feedback in user prompt when provided', async () => {
            vi.mocked(aiClient.complete).mockResolvedValue(makePlanResponse());

            await generator.generatePlan('description', 'Please add error handling');

            const userPrompt = vi.mocked(aiClient.complete).mock.calls[0][1] as string;
            expect(userPrompt).toContain('Please add error handling');
        });

        it('does not include feedback section when feedback is undefined', async () => {
            vi.mocked(aiClient.complete).mockResolvedValue(makePlanResponse());

            await generator.generatePlan('description');

            const userPrompt = vi.mocked(aiClient.complete).mock.calls[0][1] as string;
            expect(userPrompt).not.toContain('Additional feedback');
        });

        it('strips code fences from AI response', async () => {
            vi.mocked(aiClient.complete).mockResolvedValue('```json\n' + makePlanResponse() + '\n```');

            const result = await generator.generatePlan('description');

            expect(result.plan).toBeTruthy();
        });

        it('throws IntegrationError on invalid JSON', async () => {
            vi.mocked(aiClient.complete).mockResolvedValue('not json');

            await expect(generator.generatePlan('description')).rejects.toThrow(IntegrationError);
        });

        it('throws IntegrationError when response is missing planForAi', async () => {
            vi.mocked(aiClient.complete).mockResolvedValue(JSON.stringify({ plan: 'only plan' }));

            await expect(generator.generatePlan('description')).rejects.toThrow(IntegrationError);
        });
    });

    describe('refinePlan', () => {
        it('returns updated plan incorporating rejection feedback', async () => {
            vi.mocked(aiClient.complete).mockResolvedValue(makePlanResponse());

            const result = await generator.refinePlan('existing plan for ai', 'Missing tests');

            expect(result.plan).toBeTruthy();
            expect(result.planForAi).toBeTruthy();
        });

        it('includes existing plan and rejection comment in user prompt', async () => {
            vi.mocked(aiClient.complete).mockResolvedValue(makePlanResponse());

            await generator.refinePlan('existing plan for ai', 'Missing error handling');

            const userPrompt = vi.mocked(aiClient.complete).mock.calls[0][1] as string;
            expect(userPrompt).toContain('existing plan for ai');
            expect(userPrompt).toContain('Missing error handling');
        });

        it('throws IntegrationError on invalid AI response', async () => {
            vi.mocked(aiClient.complete).mockResolvedValue('{}');

            await expect(generator.refinePlan('plan', 'feedback')).rejects.toThrow(IntegrationError);
        });
    });
});
