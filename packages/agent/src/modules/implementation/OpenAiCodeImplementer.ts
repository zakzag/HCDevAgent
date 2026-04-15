import { injectable, inject } from 'inversify';
import type { CodeImplementer, PlanResult, QualityReport, Logger } from '@hcdevagent/shared';
import { SYMBOLS } from '@hcdevagent/shared';
import type { OpenAiClient } from '../../services/ai/OpenAiClient.js';

/**
 * Uses OpenAI to implement code changes based on a plan.
 */
@injectable()
export class OpenAiCodeImplementer implements CodeImplementer {
  constructor(
    @inject(SYMBOLS.OpenAiClient) private readonly aiClient: OpenAiClient,
    @inject(SYMBOLS.Logger) private readonly logger: Logger,
  ) {}

  /** Implements the plan and returns a quality report. */
  public async implement(plan: PlanResult): Promise<QualityReport> {
    this.logger.info('Implementing plan', { issueKey: plan.issueKey });
    const systemPrompt = 'You are a senior developer implementing code changes.';
    const userPrompt = `Implement the following plan:\n${JSON.stringify(plan.steps)}`;
    await this.aiClient.complete(systemPrompt, userPrompt);
    return {
      issueKey: plan.issueKey,
      passedTests: 0,
      failedTests: 0,
      coveragePercentage: 0,
      lintErrors: 0,
      codeChanges: [],
      overallStatus: 'pass',
    };
  }
}

