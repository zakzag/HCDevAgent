import { injectable, inject } from 'inversify';
import type { AiClient, ConfigProvider, Logger } from '@hcdevagent/shared';
import { SYMBOLS } from '@hcdevagent/shared';

/**
 * Client for communicating with the OpenAI API.
 * Implements AiClient so it is interchangeable with GitHubCopilotClient.
 */
@injectable()
export class OpenAiClient implements AiClient {
  private readonly apiKey: string;
  private readonly model: string;

  constructor(
    @inject(SYMBOLS.ConfigProvider) configProvider: ConfigProvider,
    @inject(SYMBOLS.Logger) private readonly logger: Logger,
  ) {
    this.apiKey = configProvider.getRequired('OPENAI_API_KEY');
    this.model = configProvider.getOptional('OPENAI_MODEL') ?? 'gpt-4';
  }

  /**
   * Sends a prompt to the OpenAI completions API and returns the response text.
   */
  public async complete(systemPrompt: string, userPrompt: string): Promise<string> {
    this.logger.debug('Sending completion request to OpenAI', { model: this.model });
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: this.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
      }),
    });
    if (!response.ok) {
      throw new Error(`OpenAI API returned ${response.status}`);
    }
    const data = (await response.json()) as {
      choices: ReadonlyArray<{ message: { content: string } }>;
    };
    return data.choices[0]?.message.content ?? '';
  }
}
