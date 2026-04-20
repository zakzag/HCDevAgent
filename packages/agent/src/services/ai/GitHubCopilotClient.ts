import { injectable, inject } from 'inversify';
import type { AiClient, ConfigProvider, Logger } from '@hcdevagent/shared';
import { SYMBOLS, IntegrationError } from '@hcdevagent/shared';

/** Shape of a single chat message in the OpenAI-compatible API. */
interface ChatMessage {
    readonly role: 'system' | 'user' | 'assistant';
    readonly content: string;
}

/** Shape of the chat completions response. */
interface ChatCompletionsResponse {
    readonly choices: ReadonlyArray<{
        readonly message: { readonly content: string };
    }>;
}

/**
 * AI client targeting the GitHub Copilot chat completions endpoint.
 * Uses the OpenAI-compatible REST API authenticated via a GitHub PAT.
 *
 * Config keys:
 *   GITHUB_TOKEN      (required) — PAT with Copilot access
 *   COPILOT_API_URL   (optional, default: https://api.githubcopilot.com)
 *   COPILOT_MODEL     (optional, default: gpt-4o)
 */
@injectable()
export class GitHubCopilotClient implements AiClient {
    private readonly apiUrl: string;
    private readonly model: string;
    private readonly authHeader: string;

    public constructor(
        @inject(SYMBOLS.ConfigProvider) configProvider: ConfigProvider,
        @inject(SYMBOLS.Logger) private readonly logger: Logger,
    ) {
        const token = configProvider.getRequired('GITHUB_TOKEN');
        this.apiUrl = configProvider.getOptional('COPILOT_API_URL') ?? 'https://api.githubcopilot.com';
        this.model = configProvider.getOptional('COPILOT_MODEL') ?? 'gpt-4o';
        this.authHeader = `Bearer ${token}`;
    }

    /**
     * Sends a prompt pair to the GitHub Copilot completions endpoint
     * and returns the raw response text.
     */
    public async complete(systemPrompt: string, userPrompt: string): Promise<string> {
        this.logger.debug('Sending completion request to GitHub Copilot', { model: this.model });

        const url = `${this.apiUrl}/chat/completions`;
        const messages: ReadonlyArray<ChatMessage> = [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
        ];

        let response: Response;
        try {
            response = await fetch(url, {
                method: 'POST',
                headers: {
                    Authorization: this.authHeader,
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                },
                body: JSON.stringify({ model: this.model, messages }),
            });
        } catch (error) {
            throw new IntegrationError('Failed to reach GitHub Copilot API', {
                url,
                originalError: String(error),
            });
        }

        if (!response.ok) {
            const body = await response.text().catch(() => '');
            throw new IntegrationError(`GitHub Copilot API returned ${response.status}`, {
                url,
                status: response.status,
                body,
            });
        }

        const data = (await response.json()) as ChatCompletionsResponse;
        const content = data.choices[0]?.message.content ?? '';

        this.logger.debug('Received response from GitHub Copilot');

        return content;
    }
}

