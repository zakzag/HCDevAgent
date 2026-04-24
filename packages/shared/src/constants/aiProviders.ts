/**
 * Valid values for the AI_PROVIDER environment variable.
 * Use these constants everywhere instead of magic strings.
 */
export const AI_PROVIDERS = {
    /** OpenAI GPT models via api.openai.com */
    OPENAI: 'openai',
    /** GitHub Copilot via api.githubcopilot.com — uses GITHUB_TOKEN */
    COPILOT: 'copilot',
    /** GitHub Copilot via the local `copilot` CLI — uses the CLI's OAuth session */
    COPILOT_CLI: 'copilot-cli',
} as const;

/** Union type of all supported AI provider identifiers. */
export type AiProvider = (typeof AI_PROVIDERS)[keyof typeof AI_PROVIDERS];

