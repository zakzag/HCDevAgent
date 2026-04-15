import 'reflect-metadata';
import { Container } from 'inversify';
import { configModule } from './services/config/config.module.js';
import { loggingModule } from './services/logging/logging.module.js';
import { eventBusModule } from './services/eventBus/eventBus.module.js';
import { issueTrackerModule } from './services/issueTracker/issueTracker.module.js';
import { storageModule } from './services/storage/storage.module.js';
import { issueTrackerModuleModule } from './modules/issueTracker/issueTrackerModule.module.js';
import { investigationModule } from './modules/investigation/investigation.module.js';
import { conductorModule } from './conductor/conductor.module.js';

/**
 * Root DI container — single composition root for the agent package.
 * Loads only the modules needed for the current step.
 */
const container = new Container();

container.load(
    // Core services
    configModule,
    loggingModule,
    eventBusModule,
    storageModule,

    // Low-level adapters
    issueTrackerModule,

    // High-level modules
    issueTrackerModuleModule,
    investigationModule,

    // Orchestrator
    conductorModule,
);

export { container };

