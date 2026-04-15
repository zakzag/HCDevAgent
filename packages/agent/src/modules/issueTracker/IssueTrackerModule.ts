import { injectable, inject } from 'inversify';
import type { IssueReader, IssueWriter, Issue, Logger } from '@hcdevagent/shared';
import { SYMBOLS } from '@hcdevagent/shared';

/**
 * High-level module that coordinates issue tracker read/write operations.
 */
@injectable()
export class IssueTrackerModule {
  constructor(
    @inject(SYMBOLS.IssueReader) private readonly issueReader: IssueReader,
    @inject(SYMBOLS.IssueWriter) private readonly issueWriter: IssueWriter,
    @inject(SYMBOLS.Logger) private readonly logger: Logger,
  ) {}

  /** Fetches an issue by key. */
  public async fetchIssue(issueKey: string): Promise<Issue> {
    this.logger.info('Fetching issue', { issueKey });
    return this.issueReader.getIssue(issueKey);
  }

  /** Fetches issues using a JQL query. */
  public async searchIssues(query: string): Promise<ReadonlyArray<Issue>> {
    this.logger.info('Searching issues', { query });
    return this.issueReader.getIssues(query);
  }

  /** Transitions an issue and adds a comment. */
  public async transitionWithComment(
    issueKey: string,
    targetStatus: string,
    comment: string,
  ): Promise<void> {
    this.logger.info('Transitioning issue with comment', { issueKey, targetStatus });
    await this.issueWriter.transitionIssue(issueKey, targetStatus);
    await this.issueWriter.addComment(issueKey, comment);
  }
}

