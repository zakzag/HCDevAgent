import { ContainerModule } from 'inversify';
import { SYMBOLS } from '@hcdevagent/shared';
import { Conductor } from './Conductor.js';

/** DI module that binds the Conductor. */
export const conductorModule = new ContainerModule((bind) => {
  bind(SYMBOLS.Conductor).to(Conductor).inSingletonScope();
});

