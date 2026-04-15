import { ContainerModule } from 'inversify';
import { SYMBOLS } from '@hcdevagent/shared';
import { MongoStorageAdapter } from './MongoStorageAdapter.js';

/** DI module that binds the StorageAdapter interface. */
export const storageModule = new ContainerModule((bind) => {
  bind(SYMBOLS.StorageAdapter).to(MongoStorageAdapter).inSingletonScope();
});

