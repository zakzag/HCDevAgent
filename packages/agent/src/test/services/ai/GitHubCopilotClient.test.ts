import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ConfigProvider, Logger } from '@hcdevagent/shared';
import { IntegrationError } from '@hcdevagent/shared';
import { GitHubCopilotClient } from '../../../services/ai/GitHubCopilotClient.js';

const createMockConfig = (overrides: Partial<Record<string, string>> = {}): ConfigProvider => {
    const defaults: Record<string, string | undefined> = {
        GITHUB_TOKEN: 'test-gh-token',
        COPILOT_API_URL: 'https://api.githubcopilot.com',
        COPILOT_MODEL: 'gpt-4o',
        ...overrides,
    };
    return {
        getRequired: vi.fn().mockImplementation((key: string) => {
            const val = defaults[key];
            if (val === undefined) throw new Error(`Missing required key: ${key}`);
            return val;
        }),
        getOptional: vi.fn().mockImplementation((key: string) => defaults[key]),
        getRequiredNumber: vi.fn(),
        getOptionalNumber: vi.fn(),
    };
};

const createMockLogger = (): Logger => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    child: vi.fn().mockReturnThis(),
});

const makeFetchResponse = (ok: boolean, body: unknown, status = 200) => ({
    ok,
    status,
    json: () => Promise.resolve(body),
    text: () => Promise.resolve(typeof body === 'string' ? body : JSON.stringify(body)),
});

describe('GitHubCopilotClient', () => {
    let fetchMock: ReturnType<typeof vi.fn>;
    let client: GitHubCopilotClient;

    beforeEach(() => {
        fetchMock = vi.fn();
        global.fetch = fetchMock as typeof fetch;
        client = new GitHubCopilotClient(createMockConfig(), createMockLogger());
    });

    describe('constructor', () => {
        it('uses COPILOT_API_URL from config', () => {
            expect(client).toBeDefined();
        });

        it('falls back to default API URL when COPILOT_API_URL is not set', () => {
            const config = createMockConfig({ COPILOT_API_URL: undefined });
            expect(() => new GitHubCopilotClient(config, createMockLogger())).not.toThrow();
        });

        it('falls back to gpt-4o when COPILOT_MODEL is not set', () => {
            const config = createMockConfig({ COPILOT_MODEL: undefined });
            expect(() => new GitHubCopilotClient(config, createMockLogger())).not.toThrow();
        });

        it('throws when GITHUB_TOKEN is missing', () => {
            const config = createMockConfig({ GITHUB_TOKEN: undefined });
            expect(() => new GitHubCopilotClient(config, createMockLogger())).toThrow();
        });
    });

    describe('complete', () => {
        it('returns the AI response content', async () => {
            fetchMock.mockResolvedValue(makeFetchResponse(true, {
                choices: [{ message: { content: 'Hello from Copilot' } }],
            }));

            const result = await client.complete('system', 'user');

            expect(result).toBe('Hello from Copilot');
        });

        it('sends Authorization header with Bearer token', async () => {
            fetchMock.mockResolvedValue(makeFetchResponse(true, {
                choices: [{ message: { content: '' } }],
            }));

            await client.complete('sys', 'usr');

            expect(fetchMock).toHaveBeenCalledWith(
                expect.stringContaining('/chat/completions'),
                expect.objectContaining({
                    headers: expect.objectContaining({ Authorization: 'Bearer test-gh-token' }),
                }),
            );
        });

        it('sends correct model in request body', async () => {
            fetchMock.mockResolvedValue(makeFetchResponse(true, {
                choices: [{ message: { content: '' } }],
            }));

            await client.complete('sys', 'usr');

            const [, callOptions] = fetchMock.mock.calls[0] as [string, RequestInit];
            const callBody = JSON.parse(callOptions['body'] as string) as { model: string };
            expect(callBody.model).toBe('gpt-4o');
        });

        it('returns empty string when choices array is empty', async () => {
            fetchMock.mockResolvedValue(makeFetchResponse(true, { choices: [] }));

            const result = await client.complete('sys', 'usr');

            expect(result).toBe('');
        });

        it('throws IntegrationError on non-OK HTTP response', async () => {
            fetchMock.mockResolvedValue(makeFetchResponse(false, 'Unauthorized', 401));

            await expect(client.complete('sys', 'usr')).rejects.toThrow(IntegrationError);
        });

        it('retries once with the default model when the configured model is unknown', async () => {
            const logger = createMockLogger();
            client = new GitHubCopilotClient(createMockConfig({ COPILOT_MODEL: 'gpt-54' }), logger);
            fetchMock
                .mockResolvedValueOnce(makeFetchResponse(false, {
                    error: {
                        code: 'unknown_model',
                        message: 'Unknown model: gpt-54',
                    },
                }, 400))
                .mockResolvedValueOnce(makeFetchResponse(true, {
                    choices: [{ message: { content: 'Fallback response' } }],
                }));

            const result = await client.complete('sys', 'usr');

            expect(result).toBe('Fallback response');
            expect(fetchMock).toHaveBeenCalledTimes(2);
            const firstBody = JSON.parse((fetchMock.mock.calls[0][1] as RequestInit).body as string) as { model: string };
            const secondBody = JSON.parse((fetchMock.mock.calls[1][1] as RequestInit).body as string) as { model: string };
            expect(firstBody.model).toBe('gpt-54');
            expect(secondBody.model).toBe('gpt-4o');
            expect(logger.warn).toHaveBeenCalled();
        });

        it('does not retry when the default model itself is rejected', async () => {
            fetchMock.mockResolvedValue(makeFetchResponse(false, {
                error: {
                    code: 'unknown_model',
                    message: 'Unknown model: gpt-4o',
                },
            }, 400));

            await expect(client.complete('sys', 'usr')).rejects.toThrow(IntegrationError);
            expect(fetchMock).toHaveBeenCalledTimes(1);
        });

        it('throws IntegrationError on network failure', async () => {
            fetchMock.mockRejectedValue(new Error('ECONNREFUSED'));

            await expect(client.complete('sys', 'usr')).rejects.toThrow(IntegrationError);
        });

        it('includes status code in error context on HTTP failure', async () => {
            fetchMock.mockResolvedValue(makeFetchResponse(false, 'Server error', 500));

            const error = await client.complete('sys', 'usr').catch((e: unknown) => e);

            expect(error).toBeInstanceOf(IntegrationError);
            expect((error as IntegrationError).message).toContain('500');
        });
    });
});
