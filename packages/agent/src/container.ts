import 'reflect-metadata';
import { Container } from 'inversify';
import { configModule } from './services/config/config.module.js';
import { loggingModule } from './services/logging/logging.module.js';
import { eventBusModule } from './services/eventBus/eventBus.module.js';
import { investigationContextModule } from './services/investigationContext/investigationContext.module.js';
import { issueTrackerModule } from './services/issueTracker/issueTracker.module.js';
import { storageModule } from './services/storage/storage.module.js';
import { versionControlModule } from './services/versionControl/versionControl.module.js';
import { aiModule } from './services/ai/ai.module.js';
import { promptsModule } from './services/prompts/prompts.module.js';
import { issueTrackerModuleModule } from './modules/issueTracker/issueTrackerModule.module.js';
import { investigationModule } from './modules/investigation/investigation.module.js';
import { planningModule } from './modules/planning/planning.module.js';
import { implementationModule } from './modules/implementation/implementation.module.js';
import { conductorModule } from './conductor/conductor.module.js';

/**
 * Root DI container — single composition root for the agent package.
 */
const container = new Container();

container.load(
    // Core services
    configModule,
    loggingModule,
    eventBusModule,
    investigationContextModule,
    storageModule,
    versionControlModule,

    // AI client (must come before any module that injects AiClient)
    aiModule,

    // Prompt registry (must come before any module that injects PromptRegistry)
    promptsModule,

    // Low-level adapters
    issueTrackerModule,

    // High-level modules
    issueTrackerModuleModule,
    investigationModule,
    planningModule,
    implementationModule,

    // Orchestrator
    conductorModule,
);

export { container };

