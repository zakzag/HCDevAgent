/**
 * Abstraction over any AI chat-completion backend.
 * Concrete implementations: OpenAiClient, GitHubCopilotClient.
 * All agent modules depend on this interface, never on a specific client.
 */
export interface AiClient {
    /**
     * Sends a system + user prompt to the AI backend and returns the raw response text.
     * @param systemPrompt - Instructions that set the AI's role and output contract.
     * @param userPrompt   - The concrete input to process.
     */
    complete(systemPrompt: string, userPrompt: string): Promise<string>;
}

