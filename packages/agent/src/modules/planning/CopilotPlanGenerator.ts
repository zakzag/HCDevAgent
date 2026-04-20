import { injectable, inject } from 'inversify';
import type { AiClient, PlanGenerator, PlanResult, Logger, PromptRegistry } from '@hcdevagent/shared';
import { SYMBOLS, IntegrationError } from '@hcdevagent/shared';

/** Raw shape expected from the AI JSON response for planning. */
interface PlanAiResponse {
    readonly plan: string;
    readonly planForAi: string;
}


/**
 * Validates that a parsed AI response conforms to PlanAiResponse.
 */
const isValidPlanResponse = (value: unknown): value is PlanAiResponse => {
    if (typeof value !== 'object' || value === null) return false;
    const v = value as Record<string, unknown>;
    return typeof v['plan'] === 'string' && typeof v['planForAi'] === 'string';
};

/**
 * Strips markdown code fences from AI response if present.
 */
const stripCodeFences = (raw: string): string => {
    const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
    return fenced ? fenced[1].trim() : raw.trim();
};

/**
 * Parses and validates the AI response into a PlanResult.
 */
const parseResponse = (raw: string): PlanResult => {
    const cleaned = stripCodeFences(raw);
    let parsed: unknown;
    try {
        parsed = JSON.parse(cleaned);
    } catch {
        throw new IntegrationError('AI returned invalid JSON during planning', {
            raw: cleaned.slice(0, 500),
        });
    }
    if (!isValidPlanResponse(parsed)) {
        throw new IntegrationError('AI planning response has unexpected shape', {
            raw: cleaned.slice(0, 500),
        });
    }
    return { plan: parsed.plan, planForAi: parsed.planForAi };
};

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

    /** Generates both plan formats from the enhanced description. */
    public async generatePlan(descriptionForAi: string, feedback?: string): Promise<PlanResult> {
        this.logger.debug('Generating implementation plan');

        const systemPrompt = this.prompts.getPrompt('planning.system', {});
        const userPrompt = this.prompts.getPrompt('planning.user', {
            descriptionForAi,
            feedbackSection: feedback ? `\n\nAdditional feedback:\n${feedback}` : '',
        });

        const raw = await this.aiClient.complete(systemPrompt, userPrompt);
        const result = parseResponse(raw);

        this.logger.debug('Plan generation complete');
        return result;
    }

    /** Re-generates both plans incorporating rejection feedback. */
    public async refinePlan(existingPlanForAi: string, rejectionComment: string): Promise<PlanResult> {
        this.logger.debug('Refining implementation plan based on feedback');

        const systemPrompt = this.prompts.getPrompt('planning.refine.system', {});
        const userPrompt = this.prompts.getPrompt('planning.refine.user', {
            existingPlanForAi,
            rejectionComment,
        });

        const raw = await this.aiClient.complete(systemPrompt, userPrompt);
        const result = parseResponse(raw);

        this.logger.debug('Plan refinement complete');
        return result;
    }
}

