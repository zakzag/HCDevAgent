import 'reflect-metadata';

export { container } from './container.js';
export {
  EnvConfigProvider,
  configModule,
  PinoLogger,
  loggingModule,
  InProcessEventBus,
  eventBusModule,
  JiraIssueReader,
  JiraIssueWriter,
  issueTrackerModule,
  GitHubGitProvider,
  LocalGitRepository,
  LocalGitVersionControl,
  versionControlModule,
  MongoStorageAdapter,
  storageModule,
  OpenAiClient,
  aiModule,
} from './services/index.js';
export type { GitProvider, GitRepository } from './services/index.js';
export {
  IssueTrackerModule,
  issueTrackerModuleModule,
  StubIssueInvestigator,
  CopilotIssueInvestigator,
  investigationModule,
  CopilotPlanGenerator,
  planningModule,
  CopilotCodeImplementer,
  implementationModule,
} from './modules/index.js';
export { Conductor, conductorModule } from './conductor/index.js';

