import { injectable, inject } from 'inversify';
import type { IssueInvestigator, Issue, InvestigationResult, Logger } from '@hcdevagent/shared';
import { SYMBOLS } from '@hcdevagent/shared';
import type { OpenAiClient } from '../../services/ai/OpenAiClient.js';

/**
 * Uses OpenAI to analyze an issue and produce investigation results.
 */
@injectable()
export class OpenAiIssueInvestigator implements IssueInvestigator {
  constructor(
    @inject(SYMBOLS.OpenAiClient) private readonly aiClient: OpenAiClient,
    @inject(SYMBOLS.Logger) private readonly logger: Logger,
  ) {}

  /** Investigates an issue using AI analysis. */
  public async investigate(issue: Issue): Promise<InvestigationResult> {
    this.logger.info('Investigating issue', { issueKey: issue.key });
    const systemPrompt = 'You are a senior software engineer analyzing a Jira issue.';
    const userPrompt = `Analyze the following issue:\nTitle: ${issue.summary}\nDescription: ${issue.description}\n\nProvide: analysis, acceptance criteria, and suggested approach.`;
    const response = await this.aiClient.complete(systemPrompt, userPrompt);
    return {
      issueKey: issue.key,
      summary: issue.summary,
      analysis: response,
      acceptanceCriteria: [],
      suggestedApproach: response,
    };
  }
}

