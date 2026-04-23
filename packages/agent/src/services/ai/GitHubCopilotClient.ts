import { injectable, inject } from 'inversify';
import type { AiClient, ConfigProvider, Logger } from '@hcdevagent/shared';
import { SYMBOLS, IntegrationError } from '@hcdevagent/shared';

const DEFAULT_COPILOT_API_URL = 'https://models.inference.ai.azure.com';
const DEFAULT_COPILOT_MODEL = 'gpt-4o';

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

interface GitHubModelsErrorResponse {
    readonly error?: {
        readonly code?: string;
        readonly message?: string;
        readonly details?: string;
    };
}

const stripUtf8Bom = (value: string): string => value.replace(/^\uFEFF/, '');

const parseGitHubModelsError = (body: string): GitHubModelsErrorResponse | null => {
    const normalized = stripUtf8Bom(body).trim();
    if (normalized === '') {
        return null;
    }

    try {
        return JSON.parse(normalized) as GitHubModelsErrorResponse;
    } catch {
        return null;
    }
};

const isUnknownModelError = (status: number, body: string): boolean => {
    if (status !== 400) {
        return false;
    }

    const parsed = parseGitHubModelsError(body);
    if (parsed?.error?.code === 'unknown_model') {
        return true;
    }

    return body.includes('Unknown model:');
};

/**
 * AI client targeting the GitHub Models chat completions endpoint.
 * Uses the OpenAI-compatible REST API authenticated via a GitHub PAT.
 *
 * The default endpoint is GitHub Models (https://models.inference.ai.azure.com),
 * which accepts a standard GitHub Personal Access Token with the `models:read` scope.
 *
 * NOTE: The Copilot endpoint (https://api.githubcopilot.com) does NOT accept PATs —
 * it requires an OAuth token from the Copilot extension flow. Use the GitHub Models
 * endpoint for PAT-based access.
 *
 * Config keys:
 *   GITHUB_TOKEN      (required) — PAT with `models:read` scope
 *   COPILOT_API_URL   (optional, default: https://models.inference.ai.azure.com)
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
        this.apiUrl = configProvider.getOptional('COPILOT_API_URL') ?? DEFAULT_COPILOT_API_URL;
        this.model = configProvider.getOptional('COPILOT_MODEL') ?? DEFAULT_COPILOT_MODEL;
        this.authHeader = `Bearer ${token}`;
    }

    /**
     * Sends a prompt pair to the GitHub Copilot completions endpoint
     * and returns the raw response text.
     */
    public async complete(systemPrompt: string, userPrompt: string): Promise<string> {
        this.logger.debug('Sending completion request to GitHub Models', { model: this.model });

        return this.completeWithModel(this.model, systemPrompt, userPrompt, false);
    }

    private async completeWithModel(
        model: string,
        systemPrompt: string,
        userPrompt: string,
        hasRetriedWithDefaultModel: boolean,
    ): Promise<string> {
        this.logger.debug('Sending completion request to GitHub Models', {
            model,
            retriedWithDefaultModel: hasRetriedWithDefaultModel,
        });

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
                body: JSON.stringify({ model, messages }),
            });
        } catch (error) {
            throw new IntegrationError('Failed to reach GitHub Models API', {
                url,
                originalError: String(error),
            });
        }

        if (!response.ok) {
            const body = await response.text().catch(() => '');

            if (!hasRetriedWithDefaultModel && model !== DEFAULT_COPILOT_MODEL && isUnknownModelError(response.status, body)) {
                this.logger.warn('Configured COPILOT_MODEL is not recognized by GitHub Models; retrying with default model', {
                    configuredModel: model,
                    fallbackModel: DEFAULT_COPILOT_MODEL,
                    status: response.status,
                });
                return this.completeWithModel(DEFAULT_COPILOT_MODEL, systemPrompt, userPrompt, true);
            }

            throw new IntegrationError(`GitHub Models API returned ${response.status}`, {
                url,
                status: response.status,
                body,
                model,
            });
        }

        const data = (await response.json()) as ChatCompletionsResponse;
        const content = data.choices[0]?.message.content ?? '';

        this.logger.debug('Received response from GitHub Models', { model });

        return content;
    }
}

