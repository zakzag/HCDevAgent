import { readdir, readFile, stat } from 'node:fs/promises';
import { homedir, tmpdir } from 'node:os';
import { join } from 'node:path';
import { injectable, inject } from 'inversify';
import type {
    AiClient,
    AiCompletionOptions,
    ConfigProvider,
    Logger,
    ProcessRunner,
    ProcessRunResult,
} from '@hcdevagent/shared';
import { SYMBOLS, IntegrationError } from '@hcdevagent/shared';
import {
    AUTH_ERROR_MARKERS,
    COMMAND_LINE_TOO_LONG_MARKERS,
    RATE_LIMIT_MARKERS,
} from './CopilotCliMarkers.js';
import { AiModelSelector } from './AiModelSelector.js';
import {
    COPILOT_CLI_LOG_TAIL_BYTES,
    COPILOT_CLI_LOG_WINDOW_MS,
    COPILOT_CLI_PROMPT_HEADER,
    COPILOT_CLI_STDERR_TAIL_BYTES,
    COPILOT_CLI_STDOUT_TAIL_BYTES,
    DEFAULT_COPILOT_CLI_BIN,
    DEFAULT_COPILOT_CLI_TIMEOUT_MS,
    STRIPPED_COPILOT_ENV_KEYS,
} from './constants/copilotCli.constants.js';
import { logSelectedAiModel } from './logSelectedAiModel.js';
import { parseCopilotCliOutput } from './CopilotCliOutputParser.js';

interface BuildArgsInput {
    readonly model: string | undefined;
    readonly allowTools: boolean;
    readonly extraArgs: ReadonlyArray<string>;
}

interface CopilotLogSnippet {
    readonly filePath: string;
    readonly tail: string;
}

const normalizeOptionalString = (value: string | undefined): string | undefined => {
    if (value === undefined) return undefined;
    const normalized = value.trim();
    return normalized === '' ? undefined : normalized;
};

const truthy = (value: string | undefined): boolean => {
    const normalized = value?.trim().toLowerCase();
    return normalized === 'true' || normalized === '1' || normalized === 'yes';
};

const tailString = (value: string, limit: number): string =>
    value.length <= limit ? value : value.slice(value.length - limit);

const getUtf8ByteLength = (value: string): number => Buffer.byteLength(value, 'utf8');

const anyMarkerMatches = (haystack: string, markers: ReadonlyArray<string>): boolean =>
    markers.some((marker) => haystack.includes(marker));

const isSilentFailure = (result: ProcessRunResult): boolean =>
    result.exitCode !== 0
    && result.stdout.trim() === ''
    && result.stderr.trim() === ''
    && !result.timedOut;

const withSilentFailureRetryFlags = (args: ReadonlyArray<string>): Array<string> => {
    const next = [...args];
    if (!next.includes('--disable-builtin-mcps')) next.push('--disable-builtin-mcps');
    if (!next.includes('--no-remote')) next.push('--no-remote');
    return next;
};

/**
 * AI client backed by the standalone `copilot` CLI.
 *
 * Auth is whatever session `copilot auth login` already established on the
 * host (OS credential store / config dir) — the CLI's own token, not a PAT.
 *
 * Config keys (all optional except via AI_PROVIDER switch):
 *   COPILOT_CLI_BIN            Binary name or absolute path. Default: `copilot`.
 *   COPILOT_CLI_MODEL          Model id. Falls back to COPILOT_MODEL.
 *   COPILOT_CLI_TIMEOUT_MS     Hard timeout per call. Default: 180000.
 *   COPILOT_CLI_WORKING_DIR    CWD for the CLI. Falls back to WORKSPACE_PATH
 *                              only when tools are enabled, otherwise a
 *                              neutral OS tmp directory is used.
 *   COPILOT_CLI_ALLOW_TOOLS    "true" to opt in to tool use. Default: false.
 *   COPILOT_CLI_LOG_RAW        "true" to log raw stdout at debug. Default: false.
 *   COPILOT_CLI_EXTRA_ARGS     Extra CLI flags, space-separated. Escape hatch.
 */
@injectable()
export class CopilotCliClient implements AiClient {
    private readonly bin: string;
    private readonly model: string | undefined;
    private readonly timeoutMs: number;
    private readonly configuredWorkingDir: string | undefined;
    private readonly workspacePath: string | undefined;
    private readonly neutralWorkingDir: string;
    private readonly allowTools: boolean;
    private readonly logRaw: boolean;
    private readonly extraArgs: ReadonlyArray<string>;
    private readonly modelSelector: AiModelSelector;

    public constructor(
        @inject(SYMBOLS.ConfigProvider) configProvider: ConfigProvider,
        @inject(SYMBOLS.Logger) private readonly logger: Logger,
        @inject(SYMBOLS.ProcessRunner) private readonly processRunner: ProcessRunner,
    ) {
        this.bin = normalizeOptionalString(configProvider.getOptional('COPILOT_CLI_BIN')) ?? DEFAULT_COPILOT_CLI_BIN;
        this.model =
            normalizeOptionalString(configProvider.getOptional('COPILOT_CLI_MODEL'))
            ?? normalizeOptionalString(configProvider.getOptional('COPILOT_MODEL'));
        this.timeoutMs =
            configProvider.getOptionalNumber('COPILOT_CLI_TIMEOUT_MS') ?? DEFAULT_COPILOT_CLI_TIMEOUT_MS;
        this.configuredWorkingDir =
            normalizeOptionalString(configProvider.getOptional('COPILOT_CLI_WORKING_DIR'));
        this.workspacePath = normalizeOptionalString(configProvider.getOptional('WORKSPACE_PATH'));
        this.neutralWorkingDir = tmpdir();
        this.allowTools = truthy(configProvider.getOptional('COPILOT_CLI_ALLOW_TOOLS'));
        this.logRaw = truthy(configProvider.getOptional('COPILOT_CLI_LOG_RAW'));
        this.extraArgs = this.parseExtraArgs(configProvider.getOptional('COPILOT_CLI_EXTRA_ARGS'));
        this.modelSelector = new AiModelSelector(configProvider);
    }

    public async complete(
        systemPrompt: string,
        userPrompt: string,
        options?: AiCompletionOptions,
    ): Promise<string> {
        const prompt = this.buildPrompt(systemPrompt, userPrompt);
        const promptByteLength = getUtf8ByteLength(prompt);
        const model = this.modelSelector.resolveModel(this.model, options);
        const invocationCwd = this.resolveInvocationWorkingDirectory();
        const args = this.buildArgs({
            model,
            allowTools: this.allowTools,
            extraArgs: this.extraArgs,
        });

        logSelectedAiModel({
            logger: this.logger,
            provider: 'copilot-cli',
            model,
            role: options?.role,
        });

        this.logger.debug('Invoking Copilot CLI', {
            bin: this.bin,
            model,
            role: options?.role,
            cwd: invocationCwd,
            timeoutMs: this.timeoutMs,
            promptTransport: 'stdin',
            promptLength: prompt.length,
            promptByteLength,
            args,
        });

        const invocationStartedAt = Date.now();
        const result = await this.runWithSilentFailureRetry(args, prompt, invocationCwd);
        return this.handleResult(result, promptByteLength, invocationStartedAt);
    }

    private resolveInvocationWorkingDirectory(): string | undefined {
        if (this.configuredWorkingDir !== undefined) return this.configuredWorkingDir;
        if (this.allowTools) return this.workspacePath;
        return this.neutralWorkingDir;
    }

    private buildPrompt(systemPrompt: string, userPrompt: string): string {
        return [
            COPILOT_CLI_PROMPT_HEADER,
            '',
            '<<SYSTEM>>',
            systemPrompt,
            '<<END SYSTEM>>',
            '',
            '<<USER>>',
            userPrompt,
            '<<END USER>>',
        ].join('\n');
    }

    private buildArgs(input: BuildArgsInput): Array<string> {
        const args: Array<string> = [];
        if (input.model !== undefined && input.model !== '') {
            args.push('--model', input.model);
        }
        args.push('--no-color', '--silent', '--no-custom-instructions', '--no-remote');
        args.push(input.allowTools ? '--allow-all-tools' : '--disable-builtin-mcps');
        if (input.extraArgs.length > 0) args.push(...input.extraArgs);
        return args;
    }

    private parseExtraArgs(raw: string | undefined): ReadonlyArray<string> {
        if (raw === undefined || raw.trim() === '') return [];
        return raw.split(/\s+/).map((token) => token.trim()).filter((token) => token.length > 0);
    }

    private async runWithSilentFailureRetry(
        args: ReadonlyArray<string>,
        prompt: string,
        cwd: string | undefined,
    ): Promise<ProcessRunResult> {
        const initial = await this.runProcess(args, prompt, cwd);
        if (this.allowTools || !isSilentFailure(initial) || cwd === this.neutralWorkingDir) {
            return initial;
        }

        const retryArgs = withSilentFailureRetryFlags(args);
        this.logger.warn('Retrying Copilot CLI after silent failure', {
            bin: this.bin,
            initialCwd: cwd,
            retryCwd: this.neutralWorkingDir,
            retryArgs,
        });

        return this.runProcess(retryArgs, prompt, this.neutralWorkingDir);
    }

    private async runProcess(
        args: ReadonlyArray<string>,
        prompt: string,
        cwd: string | undefined,
    ): Promise<ProcessRunResult> {
        try {
            return await this.processRunner.run(this.bin, args, {
                cwd,
                env: this.buildProcessEnv(),
                stdin: prompt,
                timeoutMs: this.timeoutMs,
            });
        } catch (error) {
            const err = error as NodeJS.ErrnoException;
            if (err.code === 'ENOENT') {
                throw new IntegrationError(
                    `Copilot CLI binary not found: "${this.bin}". Install the CLI, restart the IDE if it was open during installation, or set \`COPILOT_CLI_BIN\` to the absolute \`.cmd\`/\`.exe\` path, then run \`copilot auth login\`.`,
                    { bin: this.bin, code: err.code },
                );
            }
            throw new IntegrationError('Failed to spawn Copilot CLI', {
                bin: this.bin,
                originalError: String(error),
            });
        }
    }

    private buildProcessEnv(): Record<string, string | undefined> {
        const env: Record<string, string | undefined> = {
            NO_COLOR: '1',
            TERM: 'dumb',
            CI: '1',
            FORCE_COLOR: '0',
        };
        for (const key of STRIPPED_COPILOT_ENV_KEYS) {
            env[key] = undefined;
        }
        return env;
    }

    private async readRecentCopilotLogTail(invocationStartedAt: number): Promise<CopilotLogSnippet | undefined> {
        try {
            const logDirectory = join(homedir(), '.copilot', 'logs');
            const entries = await readdir(logDirectory, { withFileTypes: true });
            const candidatePaths = entries
                .filter((entry) => entry.isFile() && entry.name.startsWith('process-') && entry.name.endsWith('.log'))
                .map((entry) => join(logDirectory, entry.name));

            const candidatesWithMtime = await Promise.all(
                candidatePaths.map(async (filePath) => ({
                    filePath,
                    modifiedMs: (await stat(filePath)).mtimeMs,
                })),
            );

            const cutoff = invocationStartedAt - COPILOT_CLI_LOG_WINDOW_MS;
            const selected = candidatesWithMtime
                .filter((candidate) => candidate.modifiedMs >= cutoff)
                .sort((left, right) => right.modifiedMs - left.modifiedMs)[0];

            if (selected === undefined) return undefined;

            const content = await readFile(selected.filePath, 'utf8');
            return { filePath: selected.filePath, tail: tailString(content, COPILOT_CLI_LOG_TAIL_BYTES) };
        } catch {
            return undefined;
        }
    }

    private async handleResult(
        result: ProcessRunResult,
        promptByteLength: number,
        invocationStartedAt: number,
    ): Promise<string> {
        const stdoutTail = tailString(result.stdout, COPILOT_CLI_STDOUT_TAIL_BYTES);
        const stderrTail = tailString(result.stderr, COPILOT_CLI_STDERR_TAIL_BYTES);
        const copilotLog = isSilentFailure(result)
            ? await this.readRecentCopilotLogTail(invocationStartedAt)
            : undefined;

        if (this.logRaw) {
            this.logger.debug('Copilot CLI raw output', {
                stdoutLength: result.stdout.length,
                stderrLength: result.stderr.length,
                stdout: result.stdout,
                stderr: result.stderr,
            });
        }

        const buildErrorContext = (extra: Record<string, unknown> = {}): Record<string, unknown> => ({
            bin: this.bin,
            stderrTail,
            stdoutTail,
            copilotLogFile: copilotLog?.filePath,
            copilotLogTail: copilotLog?.tail,
            ...extra,
        });

        if (result.timedOut) {
            throw new IntegrationError('Copilot CLI timed out', buildErrorContext({ timeoutMs: this.timeoutMs }));
        }

        const combinedOutputLower = `${result.stdout}\n${result.stderr}`.toLowerCase();

        if (anyMarkerMatches(combinedOutputLower, AUTH_ERROR_MARKERS)) {
            throw new IntegrationError(
                'Copilot CLI is not authenticated. Run `copilot auth login` on the host.',
                buildErrorContext({ exitCode: result.exitCode }),
            );
        }

        if (anyMarkerMatches(combinedOutputLower, RATE_LIMIT_MARKERS)) {
            throw new IntegrationError(
                'Copilot CLI rate limited',
                buildErrorContext({ exitCode: result.exitCode }),
            );
        }

        if (anyMarkerMatches(combinedOutputLower, COMMAND_LINE_TOO_LONG_MARKERS)) {
            throw new IntegrationError(
                'Copilot CLI command line limit exceeded',
                buildErrorContext({ exitCode: result.exitCode, promptByteLength }),
            );
        }

        if (result.exitCode !== 0) {
            throw new IntegrationError(
                `Copilot CLI exited with code ${result.exitCode ?? 'null'}`,
                buildErrorContext({
                    exitCode: result.exitCode,
                    signal: result.signal,
                    promptByteLength,
                }),
            );
        }

        const parsed = parseCopilotCliOutput(result.stdout);
        if (parsed.text.trim() === '') {
            throw new IntegrationError(
                'Copilot CLI returned empty output',
                buildErrorContext({ diagnostics: parsed.diagnostics }),
            );
        }

        this.logger.debug('Copilot CLI response parsed', {
            textLength: parsed.text.length,
            diagnostics: parsed.diagnostics,
        });

        return parsed.text;
    }
}

