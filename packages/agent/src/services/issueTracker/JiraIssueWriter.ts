import { injectable, inject } from 'inversify';
import type { IssueWriter, ConfigProvider, Logger } from '@hcdevagent/shared';
import { SYMBOLS, IntegrationError } from '@hcdevagent/shared';

/** Shape of a Jira transition object. */
interface JiraTransition {
    readonly id: string;
    readonly name: string;
    readonly to: { readonly name: string };
}

/** Shape of the Jira transitions response. */
interface JiraTransitionsResponse {
    readonly transitions: ReadonlyArray<JiraTransition>;
}

/**
 * Writes updates to the Jira Cloud REST API v3.
 * Implements all 3 methods from 3-interfaces.md §2.
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

    /** Move the issue to a new workflow status by name. Looks up the transition ID first. */
    public async transitionStatus(issueKey: string, statusName: string): Promise<void> {
        this.logger.info('Transitioning issue', { issueKey, statusName });
        const transitionId = await this.findTransitionId(issueKey, statusName);
        await this.jiraPost(
            `/rest/api/3/issue/${issueKey}/transitions`,
            { transition: { id: transitionId } },
        );
    }

    /** Post a comment on the issue in ADF format. */
    public async addComment(issueKey: string, body: string): Promise<void> {
        this.logger.debug('Adding comment to issue', { issueKey });
        await this.jiraPost(
            `/rest/api/3/issue/${issueKey}/comment`,
            {
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
            },
        );
    }

    /** Write a value to a custom Jira field. */
    public async updateCustomField(issueKey: string, fieldName: string, value: string): Promise<void> {
        this.logger.debug('Updating custom field', { issueKey, fieldName });
        await this.jiraPut(
            `/rest/api/3/issue/${issueKey}`,
            { fields: { [fieldName]: value } },
        );
    }

    /** Looks up the transition ID for a target status name. */
    private async findTransitionId(issueKey: string, statusName: string): Promise<string> {
        const response = await this.jiraGet<JiraTransitionsResponse>(
            `/rest/api/3/issue/${issueKey}/transitions`,
        );
        const transition = response.transitions.find(
            (t) => t.to.name.toLowerCase() === statusName.toLowerCase()
                || t.name.toLowerCase() === statusName.toLowerCase(),
        );
        if (!transition) {
            throw new IntegrationError(
                `No transition found to status "${statusName}"`,
                { issueKey, statusName, available: response.transitions.map((t) => t.to.name) },
            );
        }
        return transition.id;
    }

    /** Generic GET request to Jira API. */
    private async jiraGet<T>(path: string): Promise<T> {
        try {
            const response = await fetch(`${this.baseUrl}${path}`, {
                headers: {
                    Authorization: this.authHeader,
                    Accept: 'application/json',
                },
            });
            if (!response.ok) {
                throw new IntegrationError(`Jira API returned ${response.status}`, {
                    path,
                    status: response.status,
                });
            }
            return (await response.json()) as T;
        } catch (error) {
            if (error instanceof IntegrationError) throw error;
            throw new IntegrationError('Jira API request failed', { path, originalError: String(error) });
        }
    }

    /** Generic POST request to Jira API. */
    private async jiraPost(path: string, body: unknown): Promise<void> {
        try {
            const response = await fetch(`${this.baseUrl}${path}`, {
                method: 'POST',
                headers: {
                    Authorization: this.authHeader,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(body),
            });
            if (!response.ok) {
                throw new IntegrationError(`Jira API POST returned ${response.status}`, {
                    path,
                    status: response.status,
                });
            }
        } catch (error) {
            if (error instanceof IntegrationError) throw error;
            throw new IntegrationError('Jira API POST request failed', { path, originalError: String(error) });
        }
    }

    /** Generic PUT request to Jira API. */
    private async jiraPut(path: string, body: unknown): Promise<void> {
        try {
            const response = await fetch(`${this.baseUrl}${path}`, {
                method: 'PUT',
                headers: {
                    Authorization: this.authHeader,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(body),
            });
            if (!response.ok) {
                throw new IntegrationError(`Jira API PUT returned ${response.status}`, {
                    path,
                    status: response.status,
                });
            }
        } catch (error) {
            if (error instanceof IntegrationError) throw error;
            throw new IntegrationError('Jira API PUT request failed', { path, originalError: String(error) });
        }
    }
}
