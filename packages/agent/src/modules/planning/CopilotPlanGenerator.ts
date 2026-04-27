import { injectable, inject } from 'inversify';
import type { AiClient, PlanGenerator, Logger, PromptRegistry } from '@hcdevagent/shared';
import { SYMBOLS } from '@hcdevagent/shared';
import { parseHumanPlanResponse, parsePlanForAiResponse } from './planResponseParser.js';

/**
 * Generates human-readable and machine-readable implementation plans
 * from the "Description For AI" produced by the investigation phase.
 */
@injectable()
export class CopilotPlanGenerator implements PlanGenerator {
    public constructor(
        @inject(SYMBOLS.AiClient) private readonly aiClient: AiClient,
        @inject(SYMBOLS.Logger) private readonly logger: Logger,
        @inject(SYMBOLS.PromptRegistry) private readonly prompts: PromptRegistry,
    ) {}

    /** Generates the reviewer-facing plan from the enhanced description. */
    public async generatePlan(descriptionForAi: string, feedback?: string): Promise<string> {
        this.logger.debug('Generating reviewer-facing implementation plan');

        const systemPrompt = this.prompts.getPrompt('planning.system', {});
        const userPrompt = this.prompts.getPrompt('planning.user', {
            descriptionForAi,
            feedbackSection: feedback ? `\n\nAdditional feedback:\n${feedback}` : '',
        });

        const raw = await this.aiClient.complete(systemPrompt, userPrompt, { role: 'planning' });
        const result = parseHumanPlanResponse(raw);

        this.logger.debug('Reviewer-facing plan generation complete');
        return result;
    }

    /** Re-generates the reviewer-facing plan incorporating rejection feedback. */
    public async refinePlan(existingPlan: string, rejectionComment: string, descriptionForAi: string): Promise<string> {
        this.logger.debug('Refining reviewer-facing implementation plan based on feedback');

        const systemPrompt = this.prompts.getPrompt('planning.refine.system', {});
        const userPrompt = this.prompts.getPrompt('planning.refine.user', {
            existingPlan,
            rejectionComment,
            descriptionForAi,
        });

        const raw = await this.aiClient.complete(systemPrompt, userPrompt, { role: 'planning' });
        const result = parseHumanPlanResponse(raw);

        this.logger.debug('Reviewer-facing plan refinement complete');
        return result;
    }

    /** Generates the machine-readable plan after human approval. */
    public async generatePlanForAi(descriptionForAi: string, approvedPlan: string): Promise<string> {
        this.logger.debug('Generating implementation plan for AI from approved plan');

        const systemPrompt = this.prompts.getPrompt('planning.approved.system', {});
        const userPrompt = this.prompts.getPrompt('planning.approved.user', {
            descriptionForAi,
            approvedPlan,
        });

        const raw = await this.aiClient.complete(systemPrompt, userPrompt, { role: 'planning' });
        const result = parsePlanForAiResponse(raw);

        this.logger.debug('Implementation plan for AI generation complete');
        return result;
    }
}

