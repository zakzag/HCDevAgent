import { injectable, inject } from 'inversify';
import type { IssueReader, Issue, ConfigProvider, Logger } from '@hcdevagent/shared';
import { SYMBOLS, IntegrationError } from '@hcdevagent/shared';

/**
 * Reads issues from the Jira REST API.
 */
@injectable()
export class JiraIssueReader implements IssueReader {
  private readonly baseUrl: string;
  private readonly authHeader: string;

  constructor(
    @inject(SYMBOLS.ConfigProvider) configProvider: ConfigProvider,
    @inject(SYMBOLS.Logger) private readonly logger: Logger,
  ) {
    this.baseUrl = configProvider.getRequired('JIRA_BASE_URL');
    const email = configProvider.getRequired('JIRA_USER_EMAIL');
    const token = configProvider.getRequired('JIRA_API_TOKEN');
    this.authHeader = `Basic ${Buffer.from(`${email}:${token}`).toString('base64')}`;
  }

  /** Fetches a single issue by key from Jira. */
  public async getIssue(issueKey: string): Promise<Issue> {
    this.logger.debug('Fetching issue from Jira', { issueKey });
    try {
      const response = await fetch(`${this.baseUrl}/rest/api/3/issue/${issueKey}`, {
        headers: {
          Authorization: this.authHeader,
          Accept: 'application/json',
        },
      });
      if (!response.ok) {
        throw new IntegrationError(`Jira API returned ${response.status}`, {
          issueKey,
          status: response.status,
        });
      }
      const data = (await response.json()) as Record<string, unknown>;
      return this.mapToIssue(data);
    } catch (error) {
      if (error instanceof IntegrationError) throw error;
      throw new IntegrationError('Failed to fetch issue from Jira', {
        issueKey,
        originalError: String(error),
      });
    }
  }

  /** Fetches issues matching a JQL query from Jira. */
  public async getIssues(query: string): Promise<ReadonlyArray<Issue>> {
    this.logger.debug('Searching issues in Jira', { query });
    try {
      const response = await fetch(
        `${this.baseUrl}/rest/api/3/search?jql=${encodeURIComponent(query)}`,
        {
          headers: {
            Authorization: this.authHeader,
            Accept: 'application/json',
          },
        },
      );
      if (!response.ok) {
        throw new IntegrationError(`Jira search API returned ${response.status}`, {
          query,
          status: response.status,
        });
      }
      const data = (await response.json()) as { issues: ReadonlyArray<Record<string, unknown>> };
      return data.issues.map((issue) => this.mapToIssue(issue));
    } catch (error) {
      if (error instanceof IntegrationError) throw error;
      throw new IntegrationError('Failed to search issues in Jira', {
        query,
        originalError: String(error),
      });
    }
  }

  /** Maps raw Jira API response to the Issue domain type. */
  private mapToIssue(data: Record<string, unknown>): Issue {
    const fields = data['fields'] as Record<string, unknown> | undefined;
    return {
      id: String(data['id'] ?? ''),
      key: String(data['key'] ?? ''),
      summary: String(fields?.['summary'] ?? ''),
      description: String(fields?.['description'] ?? ''),
      status: String((fields?.['status'] as Record<string, unknown>)?.['name'] ?? ''),
      assignee: fields?.['assignee']
        ? String((fields['assignee'] as Record<string, unknown>)['displayName'])
        : null,
      labels: (fields?.['labels'] as ReadonlyArray<string>) ?? [],
      comments: [],
      createdAt: String(fields?.['created'] ?? ''),
      updatedAt: String(fields?.['updated'] ?? ''),
    };
  }
}

