import { ContainerModule } from 'inversify';
import { SYMBOLS } from '@hcdevagent/shared';
import { InProcessEventBus } from './InProcessEventBus.js';

/** DI module that binds the EventBus interface. */
export const eventBusModule = new ContainerModule((bind) => {
  bind(SYMBOLS.EventBus).to(InProcessEventBus).inSingletonScope();
});

