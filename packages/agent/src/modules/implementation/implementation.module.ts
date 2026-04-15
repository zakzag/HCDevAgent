import { ContainerModule } from 'inversify';
import { SYMBOLS } from '@hcdevagent/shared';
import { OpenAiCodeImplementer } from './OpenAiCodeImplementer.js';

/** DI module that binds the CodeImplementer interface. */
export const implementationModule = new ContainerModule((bind) => {
  bind(SYMBOLS.CodeImplementer).to(OpenAiCodeImplementer).inSingletonScope();
});

