import { ContainerModule } from 'inversify';
import { SYMBOLS } from '@hcdevagent/shared';
import { StubIssueInvestigator } from './OpenAiIssueInvestigator.js';

/** DI module that binds the IssueInvestigator interface (stub for Step 2). */
export const investigationModule = new ContainerModule((bind) => {
    bind(SYMBOLS.IssueInvestigator).to(StubIssueInvestigator).inSingletonScope();
});
