import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Logger } from '@hcdevagent/shared';
import { IntegrationError } from '@hcdevagent/shared';
import { CopilotCliClient } from '../../../services/ai/CopilotCliClient.js';
import { createMockConfigProvider } from '../../mocks/createMockConfigProvider.js';
import {
    createMockProcessRunner,
    type MockProcessRunner,
} from '../../mocks/createMockProcessRunner.js';

const createLogger = (): Logger => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    child: vi.fn().mockReturnThis(),
});

const buildClient = (overrides: Partial<Record<string, string>> = {}) => {
    const config = createMockConfigProvider({
        COPILOT_CLI_BIN: 'copilot',
        COPILOT_CLI_MODEL: 'gpt-5.4',
        COPILOT_CLI_TIMEOUT_MS: '5000',
        COPILOT_CLI_ALLOW_TOOLS: 'false',
        WORKSPACE_PATH: 'C:/work',
        ...overrides,
    });
    const runner: MockProcessRunner = createMockProcessRunner();
    const logger = createLogger();
    const client = new CopilotCliClient(config, logger, runner);
    return { client, runner, logger, config };
};

describe('CopilotCliClient', () => {
    let baseline: ReturnType<typeof buildClient>;

    beforeEach(() => {
        baseline = buildClient();
    });

    describe('argument construction', () => {
        it('includes --model when configured', async () => {
            baseline.runner.queueResult({ stdout: 'Hello result' });
            await baseline.client.complete('sys', 'usr');
            const [bin, args] = baseline.runner.run.mock.calls[0] as [string, ReadonlyArray<string>];
            expect(bin).toBe('copilot');
            expect(args).toContain('--model');
            expect(args[args.indexOf('--model') + 1]).toBe('gpt-5.4');
        });

        it('omits --model when not configured', async () => {
            const { client, runner } = buildClient({
                COPILOT_CLI_MODEL: undefined,
                COPILOT_MODEL: undefined,
            });
            runner.queueResult({ stdout: 'Hello result' });
            await client.complete('sys', 'usr');
            const [, args] = runner.run.mock.calls[0] as [string, ReadonlyArray<string>];
            expect(args).not.toContain('--model');
        });

        it('falls back to COPILOT_MODEL when COPILOT_CLI_MODEL is missing', async () => {
            const { client, runner } = buildClient({
                COPILOT_CLI_MODEL: undefined,
                COPILOT_MODEL: 'gpt-4.1',
            });
            runner.queueResult({ stdout: 'Hello result' });
            await client.complete('sys', 'usr');
            const [, args] = runner.run.mock.calls[0] as [string, ReadonlyArray<string>];
            expect(args[args.indexOf('--model') + 1]).toBe('gpt-4.1');
        });

        it('always passes --no-color', async () => {
            baseline.runner.queueResult({ stdout: 'Hello result' });
            await baseline.client.complete('sys', 'usr');
            const [, args] = baseline.runner.run.mock.calls[0] as [string, ReadonlyArray<string>];
            expect(args).toContain('--no-color');
        });

        it('passes --allow-all-tools only when COPILOT_CLI_ALLOW_TOOLS is truthy', async () => {
            baseline.runner.queueResult({ stdout: 'Hello result' });
            await baseline.client.complete('sys', 'usr');
            let [, args] = baseline.runner.run.mock.calls[0] as [string, ReadonlyArray<string>];
            expect(args).not.toContain('--allow-all-tools');

            const enabled = buildClient({ COPILOT_CLI_ALLOW_TOOLS: 'true' });
            enabled.runner.queueResult({ stdout: 'Hello result' });
            await enabled.client.complete('sys', 'usr');
            [, args] = enabled.runner.run.mock.calls[0] as [string, ReadonlyArray<string>];
            expect(args).toContain('--allow-all-tools');
        });

        it('sends the combined system + user prompt via -p', async () => {
            baseline.runner.queueResult({ stdout: 'Hello result' });
            await baseline.client.complete('SYS-CONTENT', 'USR-CONTENT');
            const [, args] = baseline.runner.run.mock.calls[0] as [string, ReadonlyArray<string>];
            const pIndex = args.indexOf('-p');
            expect(pIndex).toBeGreaterThanOrEqual(0);
            const prompt = args[pIndex + 1] ?? '';
            expect(prompt).toContain('SYS-CONTENT');
            expect(prompt).toContain('USR-CONTENT');
            expect(prompt).toContain('<<SYSTEM>>');
            expect(prompt).toContain('<<USER>>');
        });

        it('appends COPILOT_CLI_EXTRA_ARGS tokens', async () => {
            const { client, runner } = buildClient({
                COPILOT_CLI_EXTRA_ARGS: '--foo bar --baz',
            });
            runner.queueResult({ stdout: 'Hello result' });
            await client.complete('sys', 'usr');
            const [, args] = runner.run.mock.calls[0] as [string, ReadonlyArray<string>];
            expect(args).toContain('--foo');
            expect(args).toContain('bar');
            expect(args).toContain('--baz');
        });

        it('uses custom binary path when COPILOT_CLI_BIN is set', async () => {
            const { client, runner } = buildClient({ COPILOT_CLI_BIN: 'C:/tools/copilot.exe' });
            runner.queueResult({ stdout: 'Hello result' });
            await client.complete('sys', 'usr');
            const [bin] = runner.run.mock.calls[0] as [string, ReadonlyArray<string>];
            expect(bin).toBe('C:/tools/copilot.exe');
        });

        it('passes cwd from COPILOT_CLI_WORKING_DIR or WORKSPACE_PATH and NO_COLOR env', async () => {
            baseline.runner.queueResult({ stdout: 'Hello result' });
            await baseline.client.complete('sys', 'usr');
            const call = baseline.runner.run.mock.calls[0] as [
                string,
                ReadonlyArray<string>,
                { cwd?: string; env?: Record<string, string>; timeoutMs?: number },
            ];
            expect(call[2].cwd).toBe('C:/work');
            expect(call[2].env?.NO_COLOR).toBe('1');
            expect(call[2].env?.TERM).toBe('dumb');
            expect(call[2].timeoutMs).toBe(5_000);
        });
    });

    describe('success paths', () => {
        it('returns parsed assistant text from stdout', async () => {
            baseline.runner.queueResult({
                stdout: '⠋ thinking\nHello from Copilot CLI\nSession ended',
            });
            const result = await baseline.client.complete('sys', 'usr');
            expect(result).toBe('Hello from Copilot CLI');
        });

        it('preserves JSON inside fenced code blocks for downstream parsers', async () => {
            const stdout = [
                'Using model: gpt-5.4',
                '```json',
                '{ "ready": true, "descriptionForAi": "go" }',
                '```',
            ].join('\n');
            baseline.runner.queueResult({ stdout });
            const result = await baseline.client.complete('sys', 'usr');
            expect(result).toContain('```json');
            expect(result).toContain('"ready": true');
        });
    });

    describe('error handling', () => {
        it('throws IntegrationError with install hint when binary is missing', async () => {
            const err = Object.assign(new Error('spawn copilot ENOENT'), { code: 'ENOENT' });
            baseline.runner.queueError(err);
            baseline.runner.queueError(err);
            await expect(baseline.client.complete('s', 'u')).rejects.toBeInstanceOf(IntegrationError);
            await expect(baseline.client.complete('s', 'u')).rejects.toMatchObject({
                message: expect.stringContaining('not found'),
            });
        });

        it('throws IntegrationError on generic spawn failure', async () => {
            baseline.runner.queueError(new Error('kaboom'));
            await expect(baseline.client.complete('s', 'u')).rejects.toBeInstanceOf(IntegrationError);
        });

        it('detects auth failures from stderr and surfaces remediation message', async () => {
            baseline.runner.queueResult({
                stdout: '',
                stderr: 'Error: not logged in. Run `copilot auth login`.',
                exitCode: 1,
            });
            await expect(baseline.client.complete('s', 'u')).rejects.toMatchObject({
                message: expect.stringContaining('not authenticated'),
            });
        });

        it('detects rate-limit messages from stderr', async () => {
            baseline.runner.queueResult({
                stdout: '',
                stderr: 'rate limit exceeded, try again later',
                exitCode: 1,
            });
            await expect(baseline.client.complete('s', 'u')).rejects.toMatchObject({
                message: expect.stringContaining('rate limited'),
            });
        });

        it('throws on timeout', async () => {
            baseline.runner.queueResult({
                stdout: '',
                stderr: '',
                exitCode: null,
                signal: 'SIGTERM',
                timedOut: true,
            });
            await expect(baseline.client.complete('s', 'u')).rejects.toMatchObject({
                message: expect.stringContaining('timed out'),
            });
        });

        it('throws on non-zero exit code without auth/rate-limit markers', async () => {
            baseline.runner.queueResult({
                stdout: '',
                stderr: 'something else went wrong',
                exitCode: 2,
            });
            await expect(baseline.client.complete('s', 'u')).rejects.toMatchObject({
                message: expect.stringContaining('exited with code 2'),
            });
        });

        it('throws on empty parsed output', async () => {
            baseline.runner.queueResult({ stdout: '   \n   \n' });
            await expect(baseline.client.complete('s', 'u')).rejects.toMatchObject({
                message: expect.stringContaining('empty output'),
            });
        });
    });
});



