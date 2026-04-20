import { ContainerModule } from 'inversify';
import { SYMBOLS } from '@hcdevagent/shared';
import { CopilotIssueInvestigator } from './CopilotIssueInvestigator.js';

/** DI module that binds the IssueInvestigator interface. */
export const investigationModule = new ContainerModule((bind) => {
    bind(SYMBOLS.IssueInvestigator).to(CopilotIssueInvestigator).inSingletonScope();
});
