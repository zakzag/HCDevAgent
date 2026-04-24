import { beforeEach, describe, expect, it, vi } from 'vitest';
import { OpenAiClient } from '../../../services/ai/OpenAiClient.js';
import { createMockConfigProvider } from '../../mocks/createMockConfigProvider.js';
import { createFetchResponse } from '../../mocks/createFetchResponse.js';
import { createMockLogger } from '../../mocks/createMockLogger.js';

describe('OpenAiClient', () => {
    let fetchMock: ReturnType<typeof vi.fn>;

    beforeEach(() => {
        fetchMock = vi.fn();
        global.fetch = fetchMock as typeof fetch;
    });

    it('logs the selected model and role when AI is called', async () => {
        const logger = createMockLogger();
        const client = new OpenAiClient(createMockConfigProvider({
            OPENAI_API_KEY: 'sk-test',
            OPENAI_MODEL: 'gpt-5.4',
        }), logger);
        fetchMock.mockResolvedValue(createFetchResponse(true, {
            choices: [{ message: { content: 'Hello from OpenAI' } }],
        }));

        await client.complete('system', 'user', { role: 'planning' });

        expect(logger.info).toHaveBeenCalledWith('AI request model selected', {
            provider: 'openai',
            model: 'gpt-5.4',
            role: 'planning',
        });
    });

    it('uses a role-specific env model override in the request body', async () => {
        const logger = createMockLogger();
        const client = new OpenAiClient(createMockConfigProvider({
            OPENAI_API_KEY: 'sk-test',
            OPENAI_MODEL: 'gpt-5.4',
            AI_MODEL_IMPLEMENTATION: 'gpt-4.1',
        }), logger);
        fetchMock.mockResolvedValue(createFetchResponse(true, {
            choices: [{ message: { content: 'Hello from OpenAI' } }],
        }));

        await client.complete('system', 'user', { role: 'implementation' });

        const [, callOptions] = fetchMock.mock.calls[0] as [string, RequestInit];
        const callBody = JSON.parse(callOptions.body as string) as { model: string };
        expect(callBody.model).toBe('gpt-4.1');
    });
});
