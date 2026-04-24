import { injectable, inject } from 'inversify';
import type {
    AiClient,
    CodeImplementer,
    CodeChanges,
    CodebaseContext,
    Logger,
    PromptRegistry,
} from '@hcdevagent/shared';
import { SYMBOLS, IntegrationError } from '@hcdevagent/shared';

/** Raw shape expected from the AI JSON response for code implementation. */
interface CodeChangesAiResponse {
    readonly filePath: string;
    readonly diff: string;
    readonly language: string;
}


const buildCodebaseContext = (codebase: CodebaseContext): string => {
    const lines = [`Codebase structure:\n${codebase.structure}`];
    for (const file of codebase.files) {
        lines.push(`\nFile: ${file.path}\n\`\`\`\n${file.content}\n\`\`\``);
    }
    return lines.join('\n');
};

/**
 * Validates that a parsed AI response conforms to CodeChangesAiResponse.
 */
const isValidCodeResponse = (value: unknown): value is CodeChangesAiResponse => {
    if (typeof value !== 'object' || value === null) return false;
    const v = value as Record<string, unknown>;
    return (
        typeof v['filePath'] === 'string' &&
        typeof v['diff'] === 'string' &&
        typeof v['language'] === 'string'
    );
};

/**
 * Strips markdown code fences from AI response if present.
 */
const stripCodeFences = (raw: string): string => {
    const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
    return fenced ? fenced[1].trim() : raw.trim();
};

/**
 * Parses and validates the AI response into CodeChanges.
 */
const parseResponse = (raw: string, context: string): CodeChanges => {
    const cleaned = stripCodeFences(raw);
    let parsed: unknown;
    try {
        parsed = JSON.parse(cleaned);
    } catch {
        throw new IntegrationError('AI returned invalid JSON during implementation', {
            context,
            raw: cleaned.slice(0, 500),
        });
    }
    if (!isValidCodeResponse(parsed)) {
        throw new IntegrationError('AI implementation response has unexpected shape', {
            context,
            raw: cleaned.slice(0, 500),
        });
    }
    return { filePath: parsed.filePath, diff: parsed.diff, language: parsed.language };
};

/**
 * Generates code changes based on an approved machine-readable plan
 * and the current codebase context.
 */
@injectable()
export class CopilotCodeImplementer implements CodeImplementer {
    public constructor(
        @inject(SYMBOLS.AiClient) private readonly aiClient: AiClient,
        @inject(SYMBOLS.Logger) private readonly logger: Logger,
        @inject(SYMBOLS.PromptRegistry) private readonly prompts: PromptRegistry,
    ) {}

    /** Generates code changes for the full plan. */
    public async implementPlan(planForAi: string, codebase: CodebaseContext): Promise<CodeChanges> {
        this.logger.debug('Implementing plan');

        const systemPrompt = this.prompts.getPrompt('implementation.system', {});
        const userPrompt = this.prompts.getPrompt('implementation.user', {
            planForAi,
            codebaseContext: buildCodebaseContext(codebase),
        });

        const raw = await this.aiClient.complete(systemPrompt, userPrompt, { role: 'implementation' });
        const result = parseResponse(raw, 'implementPlan');

        this.logger.debug('Implementation complete', { filePath: result.filePath });
        return result;
    }

    /** Re-generates code incorporating PR review feedback. */
    public async applyPrFeedback(
        planForAi: string,
        codebase: CodebaseContext,
        reviewComments: string,
    ): Promise<CodeChanges> {
        this.logger.debug('Applying PR review feedback to implementation');

        const systemPrompt = this.prompts.getPrompt('implementation.system', {});
        const userPrompt = this.prompts.getPrompt('implementation.pr-feedback.user', {
            planForAi,
            reviewComments,
            codebaseContext: buildCodebaseContext(codebase),
        });

        const raw = await this.aiClient.complete(systemPrompt, userPrompt, { role: 'implementation' });
        const result = parseResponse(raw, 'applyPrFeedback');

        this.logger.debug('PR feedback applied', { filePath: result.filePath });
        return result;
    }

    /** Continues implementation after human clarification. */
    public async answerClarification(
        planForAi: string,
        codebase: CodebaseContext,
        clarification: string,
    ): Promise<CodeChanges> {
        this.logger.debug('Incorporating clarification into implementation');

        const systemPrompt = this.prompts.getPrompt('implementation.system', {});
        const userPrompt = this.prompts.getPrompt('implementation.clarification.user', {
            planForAi,
            clarification,
            codebaseContext: buildCodebaseContext(codebase),
        });

        const raw = await this.aiClient.complete(systemPrompt, userPrompt, { role: 'implementation' });
        const result = parseResponse(raw, 'answerClarification');

        this.logger.debug('Clarification incorporated', { filePath: result.filePath });
        return result;
    }
}

