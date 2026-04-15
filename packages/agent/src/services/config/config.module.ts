import { ContainerModule } from 'inversify';
import { SYMBOLS } from '@hcdevagent/shared';
import { EnvConfigProvider } from './EnvConfigProvider.js';

/** DI module that binds the ConfigProvider interface. */
export const configModule = new ContainerModule((bind) => {
  bind(SYMBOLS.ConfigProvider).to(EnvConfigProvider).inSingletonScope();
});

