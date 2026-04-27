import { injectable, inject } from 'inversify';
import type { AiClient, AiCompletionOptions, ConfigProvider, Logger } from '@hcdevagent/shared';
import { SYMBOLS } from '@hcdevagent/shared';
import { AiModelSelector } from './AiModelSelector.js';
import { DEFAULT_OPENAI_MODEL, OPENAI_CHAT_COMPLETIONS_URL } from './constants/openAi.constants.js';
import { logSelectedAiModel } from './logSelectedAiModel.js';

/**
 * Client for communicating with the OpenAI API.
 * Implements AiClient so it is interchangeable with GitHubCopilotClient.
 */
@injectable()
export class OpenAiClient implements AiClient {
  private readonly apiKey: string;
  private readonly model: string;
  private readonly modelSelector: AiModelSelector;

  constructor(
    @inject(SYMBOLS.ConfigProvider) configProvider: ConfigProvider,
    @inject(SYMBOLS.Logger) private readonly logger: Logger,
  ) {
    this.apiKey = configProvider.getRequired('OPENAI_API_KEY');
    this.model = configProvider.getOptional('OPENAI_MODEL') ?? DEFAULT_OPENAI_MODEL;
    this.modelSelector = new AiModelSelector(configProvider);
  }

  /**
   * Sends a prompt to the OpenAI completions API and returns the response text.
   */
  public async complete(
    systemPrompt: string,
    userPrompt: string,
    options?: AiCompletionOptions,
  ): Promise<string> {
    const model = this.modelSelector.resolveModel(this.model, options) ?? this.model;
    logSelectedAiModel({
      logger: this.logger,
      provider: 'openai',
      model,
      role: options?.role,
    });
    this.logger.debug('Sending completion request to OpenAI', { model, role: options?.role });
    const response = await fetch(OPENAI_CHAT_COMPLETIONS_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
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
