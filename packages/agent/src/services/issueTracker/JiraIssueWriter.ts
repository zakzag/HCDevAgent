import { injectable, inject } from 'inversify';
import type { IssueWriter, ConfigProvider, Logger } from '@hcdevagent/shared';
import { SYMBOLS, IntegrationError } from '@hcdevagent/shared';

/**
 * Writes updates to the Jira REST API.
 */
@injectable()
export class JiraIssueWriter implements IssueWriter {
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

  /** Transitions an issue to a new status. */
  public async transitionIssue(issueKey: string, targetStatus: string): Promise<void> {
    this.logger.info('Transitioning issue', { issueKey, targetStatus });
    try {
      const response = await fetch(
        `${this.baseUrl}/rest/api/3/issue/${issueKey}/transitions`,
        {
          method: 'POST',
          headers: {
            Authorization: this.authHeader,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            transition: { id: targetStatus },
          }),
        },
      );
      if (!response.ok) {
        throw new IntegrationError(`Jira transition API returned ${response.status}`, {
          issueKey,
          targetStatus,
          status: response.status,
        });
      }
    } catch (error) {
      if (error instanceof IntegrationError) throw error;
      throw new IntegrationError('Failed to transition issue in Jira', {
        issueKey,
        targetStatus,
        originalError: String(error),
      });
    }
  }

  /** Adds a comment to an issue in Jira. */
  public async addComment(issueKey: string, body: string): Promise<void> {
    this.logger.debug('Adding comment to issue', { issueKey });
    try {
      const response = await fetch(
        `${this.baseUrl}/rest/api/3/issue/${issueKey}/comment`,
        {
          method: 'POST',
          headers: {
            Authorization: this.authHeader,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            body: {
              type: 'doc',
              version: 1,
              content: [
                {
                  type: 'paragraph',
                  content: [{ type: 'text', text: body }],
                },
              ],
            },
          }),
        },
      );
      if (!response.ok) {
        throw new IntegrationError(`Jira comment API returned ${response.status}`, {
          issueKey,
          status: response.status,
        });
      }
    } catch (error) {
      if (error instanceof IntegrationError) throw error;
      throw new IntegrationError('Failed to add comment in Jira', {
        issueKey,
        originalError: String(error),
      });
    }
  }

  /** Updates custom fields on an issue. */
  public async updateFields(
    issueKey: string,
    fields: Record<string, unknown>,
  ): Promise<void> {
    this.logger.debug('Updating issue fields', { issueKey, fields });
    try {
      const response = await fetch(
        `${this.baseUrl}/rest/api/3/issue/${issueKey}`,
        {
          method: 'PUT',
          headers: {
            Authorization: this.authHeader,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ fields }),
        },
      );
      if (!response.ok) {
        throw new IntegrationError(`Jira update API returned ${response.status}`, {
          issueKey,
          status: response.status,
        });
      }
    } catch (error) {
      if (error instanceof IntegrationError) throw error;
      throw new IntegrationError('Failed to update issue fields in Jira', {
        issueKey,
        originalError: String(error),
      });
    }
  }
}

