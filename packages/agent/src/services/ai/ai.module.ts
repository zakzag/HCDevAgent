import { ContainerModule } from 'inversify';
import { SYMBOLS } from '@hcdevagent/shared';
import { OpenAiClient } from './OpenAiClient.js';

/** DI module that binds the OpenAiClient. */
export const aiModule = new ContainerModule((bind) => {
  bind(SYMBOLS.OpenAiClient).to(OpenAiClient).inSingletonScope();
});

