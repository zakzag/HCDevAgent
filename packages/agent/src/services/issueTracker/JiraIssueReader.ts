import { injectable, inject } from 'inversify';
import type { IssueReader, Issue, Comment, ConfigProvider, Logger } from '@hcdevagent/shared';
import { SYMBOLS, IntegrationError, JIRA_CUSTOM_FIELDS } from '@hcdevagent/shared';
import { JqlBuilder } from './JqlBuilder.js';

/** Shape of a raw Jira issue from the API. */
interface JiraIssueRaw {
    readonly id: string;
    readonly key: string;
    readonly fields: Record<string, unknown>;
}

/** Shape of a raw Jira comment from the API. */
interface JiraCommentRaw {
    readonly id: string;
    readonly author?: { readonly displayName?: string };
    readonly body?: unknown;
    readonly created?: string;
}

/** Shape of the Jira search response. */
interface JiraSearchResponse {
    readonly issues: ReadonlyArray<JiraIssueRaw>;
    readonly isLast?: boolean;
    readonly nextPageToken?: string;
    readonly total?: number;
}

/** Shape of the Jira comments response. */
interface JiraCommentsResponse {
    readonly comments: ReadonlyArray<JiraCommentRaw>;
}

/**
 * Reads issues from the Jira Cloud REST API v3.
 * Implements all 6 methods from 3-interfaces.md §1.
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

    /** Fetch all issues currently in the given workflow status. */
    public async fetchIssuesByStatus(statusName: string): Promise<ReadonlyArray<Issue>> {
        this.logger.debug('Fetching issues by status', { statusName });
        const jql = new JqlBuilder()
            .status(statusName)
            .orderBy('created', 'ASC')
            .build();
        const issues: JiraIssueRaw[] = [];
        let nextPageToken: string | undefined;
        let isLast = false;

        do {
            const page = await this.jiraSearchPost<JiraSearchResponse>(jql, nextPageToken);
            issues.push(...page.issues);
            isLast = page.isLast ?? page.nextPageToken == null;
            nextPageToken = page.nextPageToken;
        } while (!isLast && nextPageToken != null);

        return issues.map((raw) => this.mapToIssue(raw));
    }

    /** Fetch full issue details by key. */
    public async getIssue(issueKey: string): Promise<Issue> {
        this.logger.debug('Fetching issue', { issueKey });
        const raw = await this.jiraGet<JiraIssueRaw>(`/rest/api/3/issue/${issueKey}?fields=*all`);
        return this.mapToIssue(raw);
    }

    /** Fetch all comments on an issue, ordered chronologically. */
    public async getComments(issueKey: string): Promise<ReadonlyArray<Comment>> {
        this.logger.debug('Fetching comments', { issueKey });
        const response = await this.jiraGet<JiraCommentsResponse>(
            `/rest/api/3/issue/${issueKey}/comment?orderBy=created`,
        );
        return response.comments.map((raw) => this.mapToComment(raw));
    }

    /** Fetch the most recent comment. */
    public async getLatestComment(issueKey: string): Promise<Comment | null> {
        const comments = await this.getComments(issueKey);
        return comments.length > 0 ? comments[comments.length - 1] : null;
    }

    /** Read the value of a custom field. */
    public async getCustomField(issueKey: string, fieldName: string): Promise<string | null> {
        this.logger.debug('Reading custom field', { issueKey, fieldName });
        const issue = await this.getIssue(issueKey);
        return issue.customFields[fieldName] ?? null;
    }

    /** Read the current workflow status of an issue. */
    public async getStatus(issueKey: string): Promise<string> {
        this.logger.debug('Reading status', { issueKey });
        const issue = await this.getIssue(issueKey);
        return issue.status;
    }

    /**
     * POST to the enhanced JQL search endpoint `/rest/api/3/search/jql`.
     * Atlassian removed the legacy GET `/rest/api/3/search` endpoint (HTTP 410).
     */
    private async jiraSearchPost<T>(jql: string, nextPageToken?: string): Promise<T> {
        const path = '/rest/api/3/search/jql';
        const body = JSON.stringify({
            jql,
            fields: ['*all'],
            ...(nextPageToken != null ? { nextPageToken } : {}),
        });
        try {
            const response = await fetch(`${this.baseUrl}${path}`, {
                method: 'POST',
                headers: {
                    Authorization: this.authHeader,
                    Accept: 'application/json',
                    'Content-Type': 'application/json',
                },
                body,
            });
            if (!response.ok) {
                const text = await response.text().catch(() => '');
                throw new IntegrationError(`Jira API returned ${response.status}`, {
                    path,
                    status: response.status,
                    body: text,
                });
            }
            return (await response.json()) as T;
        } catch (error) {
            if (error instanceof IntegrationError) throw error;
            throw new IntegrationError('Failed to communicate with Jira API', {
                path,
                originalError: String(error),
            });
        }
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
            throw new IntegrationError('Failed to communicate with Jira API', {
                path,
                originalError: String(error),
            });
        }
    }

    /** Maps raw Jira API response to the Issue domain type. */
    private mapToIssue(raw: JiraIssueRaw): Issue {
        const fields = raw.fields;
        const statusObj = fields['status'] as Record<string, unknown> | undefined;
        const assigneeObj = fields['assignee'] as Record<string, unknown> | undefined;
        const commentObj = fields['comment'] as JiraCommentsResponse | undefined;

        // Extract description text from ADF or plain text
        const descriptionRaw = fields['description'];
        const description = typeof descriptionRaw === 'string'
            ? descriptionRaw
            : this.extractTextFromAdf(descriptionRaw);

        // Build custom fields map from known field keys
        const customFields: Record<string, string | null> = {};
        for (const fieldKey of Object.values(JIRA_CUSTOM_FIELDS)) {
            const value = fields[fieldKey];
            customFields[fieldKey] = typeof value === 'string' ? value : null;
        }

        return {
            id: String(raw.id),
            key: String(raw.key),
            summary: String(fields['summary'] ?? ''),
            description,
            status: String(statusObj?.['name'] ?? ''),
            assignee: assigneeObj ? String(assigneeObj['displayName'] ?? '') : null,
            labels: (fields['labels'] as ReadonlyArray<string>) ?? [],
            comments: commentObj?.comments
                ? commentObj.comments.map((c) => this.mapToComment(c))
                : [],
            customFields,
            createdAt: String(fields['created'] ?? ''),
            updatedAt: String(fields['updated'] ?? ''),
        };
    }

    /** Maps a raw Jira comment to the Comment domain type. */
    private mapToComment(raw: JiraCommentRaw): Comment {
        const bodyRaw = raw.body;
        const body = typeof bodyRaw === 'string'
            ? bodyRaw
            : this.extractTextFromAdf(bodyRaw);

        return {
            id: String(raw.id),
            author: String(raw.author?.displayName ?? 'Unknown'),
            body,
            createdAt: String(raw.created ?? ''),
        };
    }

    /** Extracts plain text from an ADF (Atlassian Document Format) object. */
    private extractTextFromAdf(adf: unknown): string {
        if (!adf || typeof adf !== 'object') return '';
        const node = adf as Record<string, unknown>;
        if (node['type'] === 'text' && typeof node['text'] === 'string') {
            return node['text'];
        }
        const content = node['content'] as ReadonlyArray<unknown> | undefined;
        if (Array.isArray(content)) {
            return content.map((child) => this.extractTextFromAdf(child)).join('');
        }
        return '';
    }
}
