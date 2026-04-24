/**
 * Abstraction over any AI chat-completion backend.
 * Concrete implementations: OpenAiClient, GitHubCopilotClient.
 * All agent modules depend on this interface, never on a specific client.
 */
export type AiModelRole =
    | 'investigation'
    | 'planning'
    | 'implementation'
    | 'commentSummary'
    | 'descriptionForAi';

/** Optional completion settings for role-aware model selection. */
export interface AiCompletionOptions {
    /** Logical role used to resolve a role-specific model from configuration. */
    readonly role?: AiModelRole;
    /** Explicit per-request model override. Takes precedence over role defaults. */
    readonly model?: string;
}

export interface AiClient {
    /**
     * Sends a system + user prompt to the AI backend and returns the raw response text.
     * @param systemPrompt - Instructions that set the AI's role and output contract.
     * @param userPrompt   - The concrete input to process.
     * @param options      - Optional role/model hints for model selection.
     */
    complete(systemPrompt: string, userPrompt: string, options?: AiCompletionOptions): Promise<string>;
}

