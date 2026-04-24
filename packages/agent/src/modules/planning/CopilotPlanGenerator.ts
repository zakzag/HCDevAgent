import { injectable, inject } from 'inversify';
import type { AiClient, PlanGenerator, Logger, PromptRegistry } from '@hcdevagent/shared';
import { SYMBOLS, IntegrationError } from '@hcdevagent/shared';

/** Raw shape expected from the AI JSON response for the reviewer-facing plan. */
interface HumanPlanAiResponse {
    readonly plan: string;
}

/** Raw shape expected from the AI JSON response for the machine-readable plan. */
interface PlanForAiResponse {
    readonly planForAi: string;
}


/**
 * Validates that a parsed AI response conforms to HumanPlanAiResponse.
 */
const isValidHumanPlanResponse = (value: unknown): value is HumanPlanAiResponse => {
    if (typeof value !== 'object' || value === null) return false;
    const v = value as Record<string, unknown>;
    return typeof v['plan'] === 'string';
};

/**
 * Validates that a parsed AI response conforms to PlanForAiResponse.
 */
const isValidPlanForAiResponse = (value: unknown): value is PlanForAiResponse => {
    if (typeof value !== 'object' || value === null) return false;
    const v = value as Record<string, unknown>;
    return typeof v['planForAi'] === 'string';
};

/**
 * Strips markdown code fences from AI response if present.
 */
const stripCodeFences = (raw: string): string => {
    const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
    return fenced ? fenced[1].trim() : raw.trim();
};

/**
 * Parses and validates the AI response into a reviewer-facing plan.
 */
const parseHumanPlanResponse = (raw: string): string => {
    const cleaned = stripCodeFences(raw);
    let parsed: unknown;
    try {
        parsed = JSON.parse(cleaned);
    } catch {
        throw new IntegrationError('AI returned invalid JSON during planning', {
            raw: cleaned.slice(0, 500),
        });
    }
    if (!isValidHumanPlanResponse(parsed)) {
        throw new IntegrationError('AI planning response has unexpected shape', {
            raw: cleaned.slice(0, 500),
        });
    }
    return parsed.plan;
};

/**
 * Parses and validates the AI response into a machine-readable plan.
 */
const parsePlanForAiResponse = (raw: string): string => {
    const cleaned = stripCodeFences(raw);
    let parsed: unknown;
    try {
        parsed = JSON.parse(cleaned);
    } catch {
        throw new IntegrationError('AI returned invalid JSON during plan-for-AI generation', {
            raw: cleaned.slice(0, 500),
        });
    }
    if (!isValidPlanForAiResponse(parsed)) {
        throw new IntegrationError('AI plan-for-AI response has unexpected shape', {
            raw: cleaned.slice(0, 500),
        });
    }
    return parsed.planForAi;
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

