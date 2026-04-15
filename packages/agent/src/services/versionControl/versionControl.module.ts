import { ContainerModule } from 'inversify';
import { SYMBOLS } from '@hcdevagent/shared';
import { GitHubVersionControl } from './GitHubVersionControl.js';

/** DI module that binds the VersionControl interface. */
export const versionControlModule = new ContainerModule((bind) => {
  bind(SYMBOLS.VersionControl).to(GitHubVersionControl).inSingletonScope();
});

