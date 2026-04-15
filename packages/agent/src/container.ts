import 'reflect-metadata';
import { Container } from 'inversify';
import { configModule } from './services/config/config.module.js';
import { loggingModule } from './services/logging/logging.module.js';
import { eventBusModule } from './services/eventBus/eventBus.module.js';
import { issueTrackerModule } from './services/issueTracker/issueTracker.module.js';
import { versionControlModule } from './services/versionControl/versionControl.module.js';
import { storageModule } from './services/storage/storage.module.js';
import { aiModule } from './services/ai/ai.module.js';
import { issueTrackerModuleModule } from './modules/issueTracker/issueTrackerModule.module.js';
import { investigationModule } from './modules/investigation/investigation.module.js';
import { planningModule } from './modules/planning/planning.module.js';
import { implementationModule } from './modules/implementation/implementation.module.js';
import { conductorModule } from './conductor/conductor.module.js';

/**
 * Root DI container — single composition root for the agent package.
 * Loads all ContainerModules.
 */
const container = new Container();

container.load(
  configModule,
  loggingModule,
  eventBusModule,
  issueTrackerModule,
  versionControlModule,
  storageModule,
  aiModule,
  issueTrackerModuleModule,
  investigationModule,
  planningModule,
  implementationModule,
  conductorModule,
);

export { container };

