import { ContainerModule } from 'inversify';
import { SYMBOLS } from '@hcdevagent/shared';
import { CopilotCodeImplementer } from './CopilotCodeImplementer.js';

/** DI module that binds the CodeImplementer interface. */
export const implementationModule = new ContainerModule((bind) => {
    bind(SYMBOLS.CodeImplementer).to(CopilotCodeImplementer).inSingletonScope();
});
