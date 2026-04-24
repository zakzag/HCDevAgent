import { tmpdir } from 'node:os';
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

        it('uses an explicit per-request model override when provided', async () => {
            baseline.runner.queueResult({ stdout: 'Hello result' });
            await baseline.client.complete('sys', 'usr', { model: 'gpt-4.1-mini' });
            const [, args] = baseline.runner.run.mock.calls[0] as [string, ReadonlyArray<string>];
            expect(args[args.indexOf('--model') + 1]).toBe('gpt-4.1-mini');
        });

        it('uses a role-specific env model when configured', async () => {
            const { client, runner } = buildClient({ AI_MODEL_INVESTIGATION: 'gpt-5-mini' });
            runner.queueResult({ stdout: 'Hello result' });
            await client.complete('sys', 'usr', { role: 'investigation' });
            const [, args] = runner.run.mock.calls[0] as [string, ReadonlyArray<string>];
            expect(args[args.indexOf('--model') + 1]).toBe('gpt-5-mini');
        });

        it('logs the selected model and role when AI is called', async () => {
            baseline.runner.queueResult({ stdout: 'Hello result' });

            await baseline.client.complete('sys', 'usr', { role: 'investigation' });

            expect(baseline.logger.info).toHaveBeenCalledWith('AI request model selected', {
                provider: 'copilot-cli',
                model: 'gpt-5.4',
                role: 'investigation',
            });
        });

        it('always passes --no-color', async () => {
            baseline.runner.queueResult({ stdout: 'Hello result' });
            await baseline.client.complete('sys', 'usr');
            const [, args] = baseline.runner.run.mock.calls[0] as [string, ReadonlyArray<string>];
            expect(args).toContain('--no-color');
            expect(args).toContain('--silent');
            expect(args).toContain('--no-custom-instructions');
            expect(args).toContain('--no-remote');
            expect(args).toContain('--disable-builtin-mcps');
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
            expect(args).not.toContain('--disable-builtin-mcps');
        });

        it('sends the combined system + user prompt via stdin instead of argv', async () => {
            baseline.runner.queueResult({ stdout: 'Hello result' });
            await baseline.client.complete('SYS-CONTENT', 'USR-CONTENT');
            const call = baseline.runner.run.mock.calls[0] as [
                string,
                ReadonlyArray<string>,
                { stdin?: string },
            ];
            expect(call[1]).not.toContain('-p');
            expect(call[1]).not.toContain('--prompt');
            expect(call[2].stdin).toContain('SYS-CONTENT');
            expect(call[2].stdin).toContain('USR-CONTENT');
            expect(call[2].stdin).toContain('<<SYSTEM>>');
            expect(call[2].stdin).toContain('<<USER>>');
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

        it('uses a neutral cwd for tool-free calls and passes NO_COLOR env', async () => {
            baseline.runner.queueResult({ stdout: 'Hello result' });
            await baseline.client.complete('sys', 'usr');
            const call = baseline.runner.run.mock.calls[0] as [
                string,
                ReadonlyArray<string>,
                { cwd?: string; env?: Record<string, string>; timeoutMs?: number; stdin?: string },
            ];
            expect(call[2].cwd).toBe(tmpdir());
            expect(call[2].env?.NO_COLOR).toBe('1');
            expect(call[2].env?.TERM).toBe('dumb');
            expect(call[2].timeoutMs).toBe(5_000);
            expect(call[2].stdin).toBeTypeOf('string');
        });

        it('strips agent auth and provider env vars from the Copilot subprocess', async () => {
            const { client, runner } = buildClient({
                AI_PROVIDER: 'copilot-cli',
                COPILOT_API_URL: 'https://models.inference.ai.azure.com',
                GITHUB_TOKEN: 'ghp-secret',
                OPENAI_API_KEY: 'sk-secret',
                WORKSPACE_PATH: 'C:/work',
            });
            runner.queueResult({ stdout: 'Hello result' });

            await client.complete('sys', 'usr');

            const call = runner.run.mock.calls[0] as [
                string,
                ReadonlyArray<string>,
                { env?: Record<string, string | undefined> },
            ];
            expect(call[2].env?.GITHUB_TOKEN).toBeUndefined();
            expect(call[2].env?.OPENAI_API_KEY).toBeUndefined();
            expect(call[2].env?.COPILOT_API_URL).toBeUndefined();
            expect(call[2].env?.AI_PROVIDER).toBeUndefined();
            expect(call[2].env?.WORKSPACE_PATH).toBeUndefined();
            expect(call[2].env?.NO_COLOR).toBe('1');
            expect(call[2].env?.FORCE_COLOR).toBe('0');
        });

        it('uses WORKSPACE_PATH as cwd when tools are enabled', async () => {
            const { client, runner } = buildClient({ COPILOT_CLI_ALLOW_TOOLS: 'true' });
            runner.queueResult({ stdout: 'Hello result' });

            await client.complete('sys', 'usr');

            const call = runner.run.mock.calls[0] as [
                string,
                ReadonlyArray<string>,
                { cwd?: string },
            ];
            expect(call[2].cwd).toBe('C:/work');
        });

        it('prefers explicit COPILOT_CLI_WORKING_DIR over neutral cwd selection', async () => {
            const { client, runner } = buildClient({ COPILOT_CLI_WORKING_DIR: 'C:/explicit-cwd' });
            runner.queueResult({ stdout: 'Hello result' });

            await client.complete('sys', 'usr');

            const call = runner.run.mock.calls[0] as [
                string,
                ReadonlyArray<string>,
                { cwd?: string },
            ];
            expect(call[2].cwd).toBe('C:/explicit-cwd');
        });

        it('passes long prompts through stdin without inflating the argument list', async () => {
            const longPrompt = 'X'.repeat(20_000);
            baseline.runner.queueResult({ stdout: 'Hello result' });

            await baseline.client.complete('sys', longPrompt);

            const call = baseline.runner.run.mock.calls[0] as [
                string,
                ReadonlyArray<string>,
                { stdin?: string },
            ];
            expect(call[1].join(' ')).not.toContain(longPrompt);
            expect(call[2].stdin).toContain(longPrompt);
        });

        it('falls back to the neutral cwd when workspace-related values are blank', async () => {
            const { client, runner } = buildClient({
                COPILOT_CLI_WORKING_DIR: '',
                WORKSPACE_PATH: '',
            });
            runner.queueResult({ stdout: 'Hello result' });

            await client.complete('sys', 'usr');

            const call = runner.run.mock.calls[0] as [
                string,
                ReadonlyArray<string>,
                { cwd?: string; env?: Record<string, string>; timeoutMs?: number },
            ];
            expect(call[2].cwd).toBe(tmpdir());
        });

        it('falls back to the default binary when COPILOT_CLI_BIN is blank', async () => {
            const { client, runner } = buildClient({ COPILOT_CLI_BIN: '' });
            runner.queueResult({ stdout: 'Hello result' });

            await client.complete('sys', 'usr');

            const [bin] = runner.run.mock.calls[0] as [string, ReadonlyArray<string>];
            expect(bin).toBe('copilot');
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
            const completionPromise = baseline.client.complete('s', 'u');
            await expect(completionPromise).rejects.toBeInstanceOf(IntegrationError);
            await expect(completionPromise).rejects.toMatchObject({
                message: expect.stringContaining('COPILOT_CLI_BIN'),
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

        it('detects auth failures reported on stdout', async () => {
            baseline.runner.queueResult({
                stdout: 'Authentication required. Please run copilot auth login.',
                stderr: '',
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

        it('detects command-line length messages reported on stdout', async () => {
            baseline.runner.queueResult({
                stdout: 'The command line is too long.',
                stderr: '',
                exitCode: 1,
            });

            await expect(baseline.client.complete('s', 'u')).rejects.toMatchObject({
                message: expect.stringContaining('command line limit exceeded'),
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

        it('retries once without cwd after a silent failure and succeeds', async () => {
            const overridden = buildClient({ COPILOT_CLI_WORKING_DIR: 'C:/work' });
            overridden.runner
                .queueResult({ stdout: '', stderr: '', exitCode: 1 })
                .queueResult({ stdout: 'Recovered result' });

            const result = await overridden.client.complete('s', 'u');

            expect(result).toBe('Recovered result');
            expect(overridden.runner.run).toHaveBeenCalledTimes(2);

            const firstCall = overridden.runner.run.mock.calls[0] as [
                string,
                ReadonlyArray<string>,
                { cwd?: string },
            ];
            const secondCall = overridden.runner.run.mock.calls[1] as [
                string,
                ReadonlyArray<string>,
                { cwd?: string },
            ];

            expect(firstCall[2].cwd).toBe('C:/work');
            expect(secondCall[2].cwd).toBe(tmpdir());
            expect(secondCall[1]).toContain('--disable-builtin-mcps');
            expect(secondCall[1]).toContain('--no-remote');
        });

        it('throws on non-zero exit code without auth/rate-limit markers', async () => {
            baseline.runner.queueResult({
                stdout: 'usage: copilot [options] [command]',
                stderr: 'something else went wrong',
                exitCode: 2,
            });
            await expect(baseline.client.complete('s', 'u')).rejects.toMatchObject({
                message: expect.stringContaining('exited with code 2'),
                context: expect.objectContaining({
                    stdoutTail: expect.stringContaining('usage: copilot'),
                    stderrTail: expect.stringContaining('something else went wrong'),
                }),
            });
        });

        it('throws a dedicated error when the CLI reports command-line length overflow', async () => {
            baseline.runner.queueResult({
                stdout: '',
                stderr: 'The command line is too long.\r\n',
                exitCode: 1,
            });

            await expect(baseline.client.complete('s', 'u')).rejects.toMatchObject({
                message: expect.stringContaining('command line limit exceeded'),
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



