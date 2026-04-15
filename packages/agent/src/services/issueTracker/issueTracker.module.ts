import { ContainerModule } from 'inversify';
import { SYMBOLS } from '@hcdevagent/shared';
import { JiraIssueReader } from './JiraIssueReader.js';
import { JiraIssueWriter } from './JiraIssueWriter.js';

/** DI module that binds issue tracker interfaces. */
export const issueTrackerModule = new ContainerModule((bind) => {
  bind(SYMBOLS.IssueReader).to(JiraIssueReader).inSingletonScope();
  bind(SYMBOLS.IssueWriter).to(JiraIssueWriter).inSingletonScope();
});

