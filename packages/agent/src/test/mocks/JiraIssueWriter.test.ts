import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ConfigProvider, Logger } from '@hcdevagent/shared';
import { IntegrationError, JIRA_CUSTOM_FIELDS } from '@hcdevagent/shared';
import { JiraIssueWriter } from '../../services/issueTracker/JiraIssueWriter.js';

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

describe('JiraIssueWriter', () => {
    let writer: JiraIssueWriter;
    let fetchMock: ReturnType<typeof vi.fn>;

    beforeEach(() => {
        fetchMock = vi.fn();
        global.fetch = fetchMock;
        writer = new JiraIssueWriter(createMockConfig(), createMockLogger());
    });

    describe('transitionStatus', () => {
        it('should look up transition ID and call transitions API', async () => {
            // First call: get transitions
            fetchMock.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve({
                    transitions: [
                        { id: '31', name: 'To Investigation', to: { name: 'Issue Investigation' } },
                        { id: '41', name: 'To Plan', to: { name: 'Plan' } },
                    ],
                }),
            });
            // Second call: post transition
            fetchMock.mockResolvedValueOnce({ ok: true });

            await writer.transitionStatus('TEST-1', 'Issue Investigation');

            expect(fetchMock).toHaveBeenCalledTimes(2);
            const secondCall = fetchMock.mock.calls[1];
            const body = JSON.parse(secondCall[1].body as string);
            expect(body.transition.id).toBe('31');
        });

        it('should throw IntegrationError when no matching transition found', async () => {
            fetchMock.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve({
                    transitions: [{ id: '31', name: 'Other', to: { name: 'Other Status' } }],
                }),
            });

            await expect(writer.transitionStatus('TEST-1', 'Nonexistent Status'))
                .rejects.toThrow(IntegrationError);
        });

        it('should throw IntegrationError on API failure', async () => {
            fetchMock.mockResolvedValueOnce({ ok: false, status: 500 });
            await expect(writer.transitionStatus('TEST-1', 'Plan')).rejects.toThrow(IntegrationError);
        });

        it('should match transition by case-insensitive name', async () => {
            fetchMock.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve({
                    transitions: [{ id: '31', name: 'Start Investigation', to: { name: 'issue investigation' } }],
                }),
            });
            fetchMock.mockResolvedValueOnce({ ok: true });

            await expect(writer.transitionStatus('TEST-1', 'Issue Investigation')).resolves.not.toThrow();
        });
    });

    describe('addComment', () => {
        it('should post a comment in ADF format', async () => {
            fetchMock.mockResolvedValue({ ok: true });

            await writer.addComment('TEST-1', 'Hello world');

            expect(fetchMock).toHaveBeenCalledTimes(1);
            const [url, options] = fetchMock.mock.calls[0];
            expect(url).toContain('/rest/api/3/issue/TEST-1/comment');
            expect(options.method).toBe('POST');
            const body = JSON.parse(options.body as string);
            expect(body.body.type).toBe('doc');
            expect(body.body.content[0].content[0].text).toBe('Hello world');
        });

        it('should throw IntegrationError on failure', async () => {
            fetchMock.mockResolvedValue({ ok: false, status: 400 });
            await expect(writer.addComment('TEST-1', 'fail')).rejects.toThrow(IntegrationError);
        });

        it('should throw IntegrationError on network error', async () => {
            fetchMock.mockRejectedValue(new Error('Network error'));
            await expect(writer.addComment('TEST-1', 'fail')).rejects.toThrow(IntegrationError);
        });
    });

    describe('updateCustomField', () => {
        it('should send PUT request with field value', async () => {
            fetchMock.mockResolvedValue({ ok: true });

            await writer.updateCustomField('TEST-1', JIRA_CUSTOM_FIELDS.DESCRIPTION_FOR_AI, 'AI desc');

            expect(fetchMock).toHaveBeenCalledTimes(1);
            const [url, options] = fetchMock.mock.calls[0];
            expect(url).toContain('/rest/api/3/issue/TEST-1');
            expect(options.method).toBe('PUT');
            const body = JSON.parse(options.body as string);
            expect(body.fields[JIRA_CUSTOM_FIELDS.DESCRIPTION_FOR_AI]).toBe('AI desc');
        });

        it('should throw IntegrationError on failure', async () => {
            fetchMock.mockResolvedValue({ ok: false, status: 400 });
            await expect(writer.updateCustomField('TEST-1', 'field', 'value')).rejects.toThrow(IntegrationError);
        });

        it('should throw IntegrationError on network error', async () => {
            fetchMock.mockRejectedValue(new Error('Network error'));
            await expect(writer.updateCustomField('TEST-1', 'field', 'value')).rejects.toThrow(IntegrationError);
        });
    });
});

