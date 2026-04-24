import { ContainerModule } from 'inversify';
import type { interfaces } from 'inversify';
import type { AiClient, ConfigProvider, ProcessRunner } from '@hcdevagent/shared';
import { SYMBOLS, AI_PROVIDERS, ConfigError } from '@hcdevagent/shared';
import { OpenAiClient } from './OpenAiClient.js';
import { GitHubCopilotClient } from './GitHubCopilotClient.js';
import { CopilotCliClient } from './CopilotCliClient.js';
import { NodeProcessRunner } from './processRunner/index.js';

/**
 * Maps each AI_PROVIDER value to its concrete client class.
 * To add a new provider: add one entry here. Nothing else changes.
 */
const CLIENT_REGISTRY: Readonly<Record<string, interfaces.Newable<AiClient>>> = {
    [AI_PROVIDERS.OPENAI]: OpenAiClient,
    [AI_PROVIDERS.COPILOT]: GitHubCopilotClient,
    [AI_PROVIDERS.COPILOT_CLI]: CopilotCliClient,
};

/**
 * DI module for AI clients.
 * Binds SYMBOLS.AiClient to the implementation selected by AI_PROVIDER env var.
 * Both concrete clients are also bound to themselves so the factory can resolve
 * them with full InversifyJS DI support (constructor injection, singleton scope).
 */
export const aiModule = new ContainerModule((bind) => {
    bind<ProcessRunner>(SYMBOLS.ProcessRunner).to(NodeProcessRunner).inSingletonScope();

    bind(OpenAiClient).toSelf().inSingletonScope();
    bind(GitHubCopilotClient).toSelf().inSingletonScope();
    bind(CopilotCliClient).toSelf().inSingletonScope();

    bind(SYMBOLS.AiClient)
        .toDynamicValue((ctx) => {
            const config = ctx.container.get<ConfigProvider>(SYMBOLS.ConfigProvider);
            const provider = config.getOptional('AI_PROVIDER') ?? AI_PROVIDERS.OPENAI;
            const ClientClass = CLIENT_REGISTRY[provider];

            if (ClientClass === undefined) {
                const valid = Object.keys(CLIENT_REGISTRY).join(', ');
                throw new ConfigError(
                    `Unknown AI_PROVIDER: "${provider}". Valid values: ${valid}.`,
                    { provider },
                );
            }

            return ctx.container.get<AiClient>(ClientClass);
        })
        .inSingletonScope();
});
