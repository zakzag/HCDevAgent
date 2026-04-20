import { ContainerModule } from 'inversify';
import { SYMBOLS } from '@hcdevagent/shared';
import { InMemoryPromptRegistry } from './InMemoryPromptRegistry.js';
import type { PromptRegistry } from '@hcdevagent/shared';

/**
 * Binds PromptRegistry to InMemoryPromptRegistry in the DI container.
 */
export const promptsModule = new ContainerModule((bind) => {
    bind<PromptRegistry>(SYMBOLS.PromptRegistry).to(InMemoryPromptRegistry).inSingletonScope();
});

