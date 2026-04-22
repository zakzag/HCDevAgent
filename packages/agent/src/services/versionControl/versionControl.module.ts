import { ContainerModule } from 'inversify';
import { SYMBOLS } from '@hcdevagent/shared';
import { LocalGitVersionControl } from './LocalGitVersionControl.js';

/** DI module that binds the VersionControl interface. */
export const versionControlModule = new ContainerModule((bind) => {
  bind(SYMBOLS.VersionControl).to(LocalGitVersionControl).inSingletonScope();
});

