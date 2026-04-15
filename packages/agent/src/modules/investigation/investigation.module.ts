import { ContainerModule } from 'inversify';
import { SYMBOLS } from '@hcdevagent/shared';
import { OpenAiIssueInvestigator } from './OpenAiIssueInvestigator.js';

/** DI module that binds the IssueInvestigator interface. */
export const investigationModule = new ContainerModule((bind) => {
  bind(SYMBOLS.IssueInvestigator).to(OpenAiIssueInvestigator).inSingletonScope();
});

