import { injectable, inject } from 'inversify';
import type { PlanGenerator, InvestigationResult, PlanResult, Logger } from '@hcdevagent/shared';
import { SYMBOLS } from '@hcdevagent/shared';
import type { OpenAiClient } from '../../services/ai/OpenAiClient.js';

/**
 * Uses OpenAI to generate an implementation plan from investigation results.
 */
@injectable()
export class OpenAiPlanGenerator implements PlanGenerator {
  constructor(
    @inject(SYMBOLS.OpenAiClient) private readonly aiClient: OpenAiClient,
    @inject(SYMBOLS.Logger) private readonly logger: Logger,
  ) {}

  /** Generates a plan from investigation results using AI. */
  public async generatePlan(investigation: InvestigationResult): Promise<PlanResult> {
    this.logger.info('Generating plan', { issueKey: investigation.issueKey });
    const systemPrompt = 'You are a senior software architect creating an implementation plan.';
    const userPrompt = `Create a plan for:\n${investigation.analysis}\nSuggested approach: ${investigation.suggestedApproach}`;
    const response = await this.aiClient.complete(systemPrompt, userPrompt);
    return {
      issueKey: investigation.issueKey,
      steps: [
        {
          order: 1,
          description: response,
          filePath: null,
          estimatedComplexity: 'medium',
        },
      ],
      estimatedFiles: [],
      testStrategy: 'Unit tests for all new code',
    };
  }
}

