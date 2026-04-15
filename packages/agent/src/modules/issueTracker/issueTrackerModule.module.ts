import { ContainerModule } from 'inversify';
import { SYMBOLS } from '@hcdevagent/shared';
import { IssueTrackerModule } from './IssueTrackerModule.js';

/** DI module that binds the IssueTrackerModule. */
export const issueTrackerModuleModule = new ContainerModule((bind) => {
  bind(SYMBOLS.IssueTrackerOperations).to(IssueTrackerModule).inSingletonScope();
});

