import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ConfigProvider, Logger } from '@hcdevagent/shared';
import { IntegrationError, JIRA_CUSTOM_FIELDS } from '@hcdevagent/shared';
import { JiraIssueReader } from '../../services/issueTracker/JiraIssueReader.js';

/** Creates a mock ConfigProvider with Jira config. */
const createMockConfig = (): ConfigProvider => ({
    getRequired: vi.fn().mockImplementation((key: string) => {
        const map: Record<string, string> = {
            JIRA_BASE_URL: 'https://test.atlassian.net',
            JIRA_USER_EMAIL: 'test@example.com',
            JIRA_API_TOKEN: 'test-token',
        };
        return map[key] ?? 'default';
    }),
    getOptional: vi.fn(),
    getRequiredNumber: vi.fn(),
    getOptionalNumber: vi.fn(),
});

/** Creates a mock Logger. */
const createMockLogger = (): Logger => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    child: vi.fn().mockReturnThis(),
});

/** Sample Jira issue response. */
const sampleJiraIssue = {
    id: '10001',
    key: 'TEST-1',
    fields: {
        summary: 'Test issue',
        description: 'A test description',
        status: { name: 'Selected for Triage' },
        assignee: { displayName: 'Test User' },
        labels: ['bug'],
        created: '2026-01-01T00:00:00.000Z',
        updated: '2026-01-02T00:00:00.000Z',
        comment: {
            comments: [
                {
                    id: 'c1',
                    author: { displayName: 'Author' },
                    body: 'A comment',
                    created: '2026-01-01T12:00:00.000Z',
                },
            ],
        },
        [JIRA_CUSTOM_FIELDS.DESCRIPTION_FOR_AI]: 'AI description',
    },
};

describe('JiraIssueReader', () => {
    let reader: JiraIssueReader;
    let fetchMock: ReturnType<typeof vi.fn>;

    beforeEach(() => {
        fetchMock = vi.fn();
        global.fetch = fetchMock as typeof fetch;
        reader = new JiraIssueReader(createMockConfig(), createMockLogger());
    });

    describe('fetchIssuesByStatus', () => {
        it('should use POST to /rest/api/3/search/jql endpoint', async () => {
            fetchMock.mockResolvedValue({
                ok: true,
                json: () => Promise.resolve({ issues: [sampleJiraIssue], isLast: true }),
            });

            await reader.fetchIssuesByStatus('Selected for Triage');

            expect(fetchMock).toHaveBeenCalledWith(
                expect.stringContaining('/rest/api/3/search/jql'),
                expect.objectContaining({ method: 'POST' }),
            );
        });

        it('should return mapped issues from search API', async () => {
            fetchMock.mockResolvedValue({
                ok: true,
                json: () => Promise.resolve({ issues: [sampleJiraIssue], isLast: true }),
            });

            const issues = await reader.fetchIssuesByStatus('Selected for Triage');
            expect(issues).toHaveLength(1);
            expect(issues[0].key).toBe('TEST-1');
            expect(issues[0].summary).toBe('Test issue');
        });

        it('should follow pagination using nextPageToken', async () => {
            const secondIssue = { ...sampleJiraIssue, id: '10002', key: 'TEST-2' };
            fetchMock
                .mockResolvedValueOnce({
                    ok: true,
                    json: () => Promise.resolve({ issues: [sampleJiraIssue], isLast: false, nextPageToken: 'page2' }),
                })
                .mockResolvedValueOnce({
                    ok: true,
                    json: () => Promise.resolve({ issues: [secondIssue], isLast: true }),
                });

            const issues = await reader.fetchIssuesByStatus('Selected for Triage');
            expect(issues).toHaveLength(2);
            expect(issues[1].key).toBe('TEST-2');
        });

        it('should return empty array when no issues found', async () => {
            fetchMock.mockResolvedValue({
                ok: true,
                json: () => Promise.resolve({ issues: [], isLast: true }),
            });

            const issues = await reader.fetchIssuesByStatus('Selected for Triage');
            expect(issues).toHaveLength(0);
        });

        it('should throw IntegrationError on non-OK response', async () => {
            fetchMock.mockResolvedValue({
                ok: false,
                status: 500,
                text: () => Promise.resolve('Internal Server Error'),
            });
            await expect(reader.fetchIssuesByStatus('Selected for Triage')).rejects.toThrow(IntegrationError);
        });

        it('should throw IntegrationError on network failure', async () => {
            fetchMock.mockRejectedValue(new Error('Network error'));
            await expect(reader.fetchIssuesByStatus('Selected for Triage')).rejects.toThrow(IntegrationError);
        });
    });

    describe('getIssue', () => {
        it('should return a mapped issue', async () => {
            fetchMock.mockResolvedValue({
                ok: true,
                json: () => Promise.resolve(sampleJiraIssue),
            });

            const issue = await reader.getIssue('TEST-1');
            expect(issue.key).toBe('TEST-1');
            expect(issue.status).toBe('Selected for Triage');
            expect(issue.assignee).toBe('Test User');
        });

        it('should map custom fields correctly', async () => {
            fetchMock.mockResolvedValue({
                ok: true,
                json: () => Promise.resolve(sampleJiraIssue),
            });

            const issue = await reader.getIssue('TEST-1');
            expect(issue.customFields[JIRA_CUSTOM_FIELDS.DESCRIPTION_FOR_AI]).toBe('AI description');
        });

        it('should handle null assignee', async () => {
            const issueNoAssignee = {
                ...sampleJiraIssue,
                fields: { ...sampleJiraIssue.fields, assignee: null },
            };
            fetchMock.mockResolvedValue({
                ok: true,
                json: () => Promise.resolve(issueNoAssignee),
            });

            const issue = await reader.getIssue('TEST-1');
            expect(issue.assignee).toBeNull();
        });

        it('should throw IntegrationError on failure', async () => {
            fetchMock.mockResolvedValue({ ok: false, status: 404 });
            await expect(reader.getIssue('MISSING-1')).rejects.toThrow(IntegrationError);
        });
    });

    describe('getComments', () => {
        it('should return mapped comments', async () => {
            fetchMock.mockResolvedValue({
                ok: true,
                json: () => Promise.resolve({
                    comments: [
                        { id: 'c1', author: { displayName: 'User' }, body: 'Hello', created: '2026-01-01' },
                    ],
                }),
            });

            const comments = await reader.getComments('TEST-1');
            expect(comments).toHaveLength(1);
            expect(comments[0].author).toBe('User');
            expect(comments[0].body).toBe('Hello');
        });

        it('should return empty array when no comments', async () => {
            fetchMock.mockResolvedValue({
                ok: true,
                json: () => Promise.resolve({ comments: [] }),
            });

            const comments = await reader.getComments('TEST-1');
            expect(comments).toHaveLength(0);
        });
    });

    describe('getLatestComment', () => {
        it('should return the last comment', async () => {
            fetchMock.mockResolvedValue({
                ok: true,
                json: () => Promise.resolve({
                    comments: [
                        { id: 'c1', author: { displayName: 'User' }, body: 'First', created: '2026-01-01' },
                        { id: 'c2', author: { displayName: 'User' }, body: 'Last', created: '2026-01-02' },
                    ],
                }),
            });

            const comment = await reader.getLatestComment('TEST-1');
            expect(comment).not.toBeNull();
            expect(comment!.body).toBe('Last');
        });

        it('should return null when no comments', async () => {
            fetchMock.mockResolvedValue({
                ok: true,
                json: () => Promise.resolve({ comments: [] }),
            });

            const comment = await reader.getLatestComment('TEST-1');
            expect(comment).toBeNull();
        });
    });

    describe('getCustomField', () => {
        it('should return the custom field value', async () => {
            fetchMock.mockResolvedValue({
                ok: true,
                json: () => Promise.resolve(sampleJiraIssue),
            });

            const value = await reader.getCustomField('TEST-1', JIRA_CUSTOM_FIELDS.DESCRIPTION_FOR_AI);
            expect(value).toBe('AI description');
        });

        it('should return null for missing custom field', async () => {
            fetchMock.mockResolvedValue({
                ok: true,
                json: () => Promise.resolve(sampleJiraIssue),
            });

            const value = await reader.getCustomField('TEST-1', JIRA_CUSTOM_FIELDS.BRANCH_NAME);
            expect(value).toBeNull();
        });
    });

    describe('getStatus', () => {
        it('should return the issue status name', async () => {
            fetchMock.mockResolvedValue({
                ok: true,
                json: () => Promise.resolve(sampleJiraIssue),
            });

            const status = await reader.getStatus('TEST-1');
            expect(status).toBe('Selected for Triage');
        });
    });
});

