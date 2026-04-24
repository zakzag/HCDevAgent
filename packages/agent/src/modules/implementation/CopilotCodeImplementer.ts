import { injectable, inject } from 'inversify';
import type {
    AiClient,
    CodeImplementer,
    CodeChanges,
    CodebaseContext,
    Logger,
    PromptRegistry,
} from '@hcdevagent/shared';
import { SYMBOLS } from '@hcdevagent/shared';
import { buildCodebaseContext } from './buildCodebaseContext.js';
import { parseImplementationResponse } from './implementationResponseParser.js';

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
        const result = parseImplementationResponse(raw, 'implementPlan');

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
        const result = parseImplementationResponse(raw, 'applyPrFeedback');

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
        const result = parseImplementationResponse(raw, 'answerClarification');

        this.logger.debug('Clarification incorporated', { filePath: result.filePath });
        return result;
    }
}

