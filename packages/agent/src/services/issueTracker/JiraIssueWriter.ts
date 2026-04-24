import { injectable, inject } from 'inversify';
import type { IssueWriter, ConfigProvider, Logger } from '@hcdevagent/shared';
import { SYMBOLS, IntegrationError, JIRA_CUSTOM_FIELDS } from '@hcdevagent/shared';

/** Shape of a Jira transition object. */
interface JiraTransition {
    readonly id: string;
    readonly name: string;
    readonly to: { readonly name: string };
}

/** Serialized transition details included in transition lookup errors. */
interface AvailableJiraTransition {
    readonly id: string;
    readonly name: string;
    readonly toStatusName: string;
}

/** Shape of the Jira transitions response. */
interface JiraTransitionsResponse {
    readonly transitions: ReadonlyArray<JiraTransition>;
}

/** Shape of Jira edit metadata for a single field. */
interface JiraEditMetaFieldSchema {
    readonly type?: string;
    readonly custom?: string;
}

/** Shape of Jira edit metadata for a single field. */
interface JiraEditMetaField {
    readonly name?: string;
    readonly schema?: JiraEditMetaFieldSchema;
}

/** Shape of the Jira edit metadata response. */
interface JiraEditMetaResponse {
    readonly fields: Readonly<Record<string, JiraEditMetaField>>;
}

/** Parsed Jira API error payload. */
interface JiraErrorResponse {
    readonly errorMessages?: ReadonlyArray<string>;
    readonly errors?: Readonly<Record<string, string>>;
}

/** Serialized Jira error details attached to integration errors. */
interface JiraErrorDetails {
    readonly errorMessages?: ReadonlyArray<string>;
    readonly errors?: Readonly<Record<string, string>>;
    readonly rawBody?: string;
}

/** Minimal ADF text node. */
interface AdfTextNode {
    readonly type: 'text';
    readonly text: string;
}

/** Minimal ADF hard break node. */
interface AdfHardBreakNode {
    readonly type: 'hardBreak';
}

/** Minimal ADF paragraph node. */
interface AdfParagraphNode {
    readonly type: 'paragraph';
    readonly content?: ReadonlyArray<AdfTextNode | AdfHardBreakNode>;
}

/** Minimal ADF document. */
interface AdfDocument {
    readonly type: 'doc';
    readonly version: 1;
    readonly content: ReadonlyArray<AdfParagraphNode>;
}

const MULTI_LINE_CUSTOM_FIELDS = new Set<string>([
    JIRA_CUSTOM_FIELDS.DESCRIPTION_FOR_AI,
    JIRA_CUSTOM_FIELDS.IMPLEMENTATION_PLAN,
    JIRA_CUSTOM_FIELDS.IMPLEMENTATION_PLAN_FOR_AI,
    JIRA_CUSTOM_FIELDS.FAILURE_REASON,
]);

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
        const fieldMetadata = await this.getEditableFieldMetadata(issueKey, fieldName);

        const requestBody = {
            fields: {
                [fieldName]: this.serializeCustomFieldValue(fieldName, value, fieldMetadata),
            },
        };
        await this.jiraPut(
            `/rest/api/3/issue/${issueKey}`,
            requestBody,
        );
    }

    /** Looks up the transition ID for a target status name. */
    private async findTransitionId(issueKey: string, statusName: string): Promise<string> {
        const response = await this.jiraGet<JiraTransitionsResponse>(
            `/rest/api/3/issue/${issueKey}/transitions`,
        );
        const availableTransitions: ReadonlyArray<AvailableJiraTransition> = response.transitions.map((transition) => ({
            id: transition.id,
            name: transition.name,
            toStatusName: transition.to.name,
        }));
        const transition = response.transitions.find(
            (t) => t.to.name.toLowerCase() === statusName.toLowerCase()
                || t.name.toLowerCase() === statusName.toLowerCase(),
        );
        if (!transition) {
            throw new IntegrationError(
                `No transition found to status "${statusName}"`,
                { issueKey, statusName, availableTransitions },
            );
        }
        return transition.id;
    }

    /** Ensures Jira exposes the requested field as editable for the issue. */
    private async getEditableFieldMetadata(issueKey: string, fieldName: string): Promise<JiraEditMetaField> {
        const response = await this.jiraGet<JiraEditMetaResponse>(
            `/rest/api/3/issue/${issueKey}/editmeta`,
        );
        const fieldMetadata = response.fields[fieldName];

        if (!fieldMetadata) {
            throw new IntegrationError('Jira custom field is not editable for this issue', {
                issueKey,
                fieldName,
                availableFieldKeys: Object.keys(response.fields),
                suggestedCauses: [
                    'The custom field ID is incorrect or stale.',
                    'The field is not available for this project or issue type context.',
                    'The field is missing from the Jira edit screen for the current status.',
                ],
            });
        }

        return fieldMetadata;
    }

    /** Serializes a Jira custom field value based on edit metadata. */
    private serializeCustomFieldValue(fieldName: string, value: string, fieldMetadata: JiraEditMetaField): string | AdfDocument {
        if (this.requiresAtlassianDocument(fieldName, fieldMetadata)) {
            return this.buildAdfDocument(value);
        }

        return value;
    }

    /** Determines whether Jira expects the custom field value in ADF format. */
    private requiresAtlassianDocument(fieldName: string, fieldMetadata: JiraEditMetaField): boolean {
        const customType = fieldMetadata.schema?.custom?.toLowerCase();
        const schemaType = fieldMetadata.schema?.type?.toLowerCase();

        if (customType?.includes(':textarea') || schemaType === 'textarea') {
            return true;
        }

        return MULTI_LINE_CUSTOM_FIELDS.has(fieldName);
    }

    /** Builds a minimal Atlassian Document Format payload from plain text. */
    private buildAdfDocument(value: string): AdfDocument {
        const normalized = value.replace(/\r\n/g, '\n');
        const lines = normalized.split('\n');
        const paragraphs: Array<AdfParagraphNode> = [];
        let currentParagraphLines: Array<string> = [];

        const pushParagraph = (): void => {
            if (currentParagraphLines.length === 0) {
                return;
            }

            paragraphs.push({
                type: 'paragraph',
                content: this.buildParagraphContent(currentParagraphLines),
            });
            currentParagraphLines = [];
        };

        for (const line of lines) {
            if (line === '') {
                pushParagraph();
                continue;
            }

            currentParagraphLines.push(line);
        }

        pushParagraph();

        if (paragraphs.length === 0) {
            paragraphs.push({ type: 'paragraph' });
        }

        return {
            type: 'doc',
            version: 1,
            content: paragraphs,
        };
    }

    /** Builds the inline paragraph content for a minimal ADF paragraph. */
    private buildParagraphContent(lines: ReadonlyArray<string>): ReadonlyArray<AdfTextNode | AdfHardBreakNode> {
        const content: Array<AdfTextNode | AdfHardBreakNode> = [];

        lines.forEach((line, index) => {
            if (line.length > 0) {
                content.push({ type: 'text', text: line });
            }

            if (index < lines.length - 1) {
                content.push({ type: 'hardBreak' });
            }
        });

        return content;
    }

    /** Generic GET request to Jira API. */
    private async jiraGet<T>(path: string): Promise<T> {
        let response: Response;
        try {
            response = await fetch(`${this.baseUrl}${path}`, {
                headers: {
                    Authorization: this.authHeader,
                    Accept: 'application/json',
                },
            });
        } catch (error) {
            throw new IntegrationError('Jira API request failed', { path, originalError: String(error) });
        }

        if (!response.ok) {
            throw await this.createJiraResponseError(`Jira API returned ${response.status}`, response, { path });
        }

        return (await response.json()) as T;
    }

    /** Generic POST request to Jira API. */
    private async jiraPost(path: string, body: unknown): Promise<void> {
        let response: Response;
        try {
            response = await fetch(`${this.baseUrl}${path}`, {
                method: 'POST',
                headers: {
                    Authorization: this.authHeader,
                    Accept: 'application/json',
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(body),
            });
        } catch (error) {
            throw new IntegrationError('Jira API POST request failed', { path, originalError: String(error) });
        }

        if (!response.ok) {
            throw await this.createJiraResponseError(`Jira API POST returned ${response.status}`, response, {
                path,
                requestBody: body,
            });
        }
    }

    /** Generic PUT request to Jira API. */
    private async jiraPut(path: string, body: unknown): Promise<void> {
        let response: Response;
        try {
            response = await fetch(`${this.baseUrl}${path}`, {
                method: 'PUT',
                headers: {
                    Authorization: this.authHeader,
                    Accept: 'application/json',
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(body),
            });
        } catch (error) {
            throw new IntegrationError('Jira API PUT request failed', { path, originalError: String(error) });
        }

        if (!response.ok) {
            throw await this.createJiraResponseError(`Jira API PUT returned ${response.status}`, response, {
                path,
                requestBody: body,
            });
        }
    }

    /** Builds a structured integration error from a failed Jira HTTP response. */
    private async createJiraResponseError(
        message: string,
        response: Response,
        baseContext: Record<string, unknown>,
    ): Promise<IntegrationError> {
        const jiraError = await this.readJiraErrorDetails(response);

        return new IntegrationError(message, {
            ...baseContext,
            status: response.status,
            jiraError,
        });
    }

    /** Reads and parses Jira error details from a non-success HTTP response. */
    private async readJiraErrorDetails(response: Response): Promise<JiraErrorDetails> {
        const rawBody = typeof response.text === 'function'
            ? await response.text()
            : '';

        if (rawBody.length === 0) {
            return {};
        }

        try {
            const parsedBody = JSON.parse(rawBody) as JiraErrorResponse;

            return {
                errorMessages: parsedBody.errorMessages,
                errors: parsedBody.errors,
                rawBody,
            };
        } catch {
            return { rawBody };
        }
    }
}
