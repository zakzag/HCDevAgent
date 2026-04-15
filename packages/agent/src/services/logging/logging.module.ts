import { ContainerModule } from 'inversify';
import { SYMBOLS } from '@hcdevagent/shared';
import { PinoLogger } from './PinoLogger.js';

/** DI module that binds the Logger interface. */
export const loggingModule = new ContainerModule((bind) => {
  bind(SYMBOLS.Logger).to(PinoLogger).inSingletonScope();
});

