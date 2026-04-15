import { ContainerModule } from 'inversify';
import { SYMBOLS } from '@hcdevagent/shared';
import { OpenAiPlanGenerator } from './OpenAiPlanGenerator.js';

/** DI module that binds the PlanGenerator interface. */
export const planningModule = new ContainerModule((bind) => {
  bind(SYMBOLS.PlanGenerator).to(OpenAiPlanGenerator).inSingletonScope();
});

