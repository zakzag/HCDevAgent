import { ContainerModule } from 'inversify';
import type { InvestigationContextProvider } from '@hcdevagent/shared';
import { SYMBOLS } from '@hcdevagent/shared';
import { WorkspaceInvestigationContextProvider } from './WorkspaceInvestigationContextProvider.js';

/** Binds the repository-backed InvestigationContextProvider implementation. */
export const investigationContextModule = new ContainerModule((bind) => {
    bind<InvestigationContextProvider>(SYMBOLS.InvestigationContextProvider)
        .to(WorkspaceInvestigationContextProvider)
        .inSingletonScope();
});

