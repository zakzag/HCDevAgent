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
import { parseCopilotCliOutput } from './CopilotCliOutputParser.js';

const DEFAULT_BIN = 'copilot';
const DEFAULT_TIMEOUT_MS = 180_000;
const STDERR_TAIL_BYTES = 2_048;

/**
 * Header injected into the combined prompt so the CLI treats its input as a
 * pure chat request and does not attempt tool-use, file edits, or questions.
 */
const PROMPT_HEADER =
    'You are answering programmatically. Respond ONLY with the assistant answer. '
    + 'Do not call tools. Do not edit files. Do not ask clarifying questions. '
    + 'Do not print status, banners, or session info.';

interface BuildArgsInput {
    readonly model: string | undefined;
    readonly allowTools: boolean;
    readonly extraArgs: ReadonlyArray<string>;
}

const normalizeOptionalString = (value: string | undefined): string | undefined => {
    if (value === undefined) return undefined;

    const normalized = value.trim();
    return normalized === '' ? undefined : normalized;
};

const truthy = (value: string | undefined): boolean => {
    if (value === undefined) return false;
    const normalized = value.trim().toLowerCase();
    return normalized === 'true' || normalized === '1' || normalized === 'yes';
};

const tailString = (value: string, limit: number): string =>
    value.length <= limit ? value : value.slice(value.length - limit);

const getUtf8ByteLength = (value: string): number => Buffer.byteLength(value, 'utf8');

/**
 * AI client backed by the standalone `copilot` CLI.
 *
 * Auth is whatever session `copilot auth login` already established on the
 * host (OS credential store / config dir) — the CLI's own token, not a PAT.
 *
 * The CLI is invoked headlessly per call:
     *   - prompt is streamed over stdin with the combined system + user content
 *   - `--model <id>` if configured
 *   - `--no-color`, `NO_COLOR=1`, `TERM=dumb`, `CI=1` to suppress decoration
 *   - stdin is closed immediately so the CLI cannot block waiting for input
 *
 * Config keys (all optional except via AI_PROVIDER switch):
 *   COPILOT_CLI_BIN            Binary name or absolute path. Default: `copilot`.
 *   COPILOT_CLI_MODEL          Model id. Falls back to COPILOT_MODEL.
 *   COPILOT_CLI_TIMEOUT_MS     Hard timeout per call. Default: 180000.
 *   COPILOT_CLI_WORKING_DIR    CWD for the CLI. Falls back to WORKSPACE_PATH.
 *   COPILOT_CLI_ALLOW_TOOLS    "true" to opt in to tool use. Default: false.
 *   COPILOT_CLI_LOG_RAW        "true" to log raw stdout at debug. Default: false.
 *   COPILOT_CLI_EXTRA_ARGS     Extra CLI flags, space-separated. Escape hatch.
 */
@injectable()
export class CopilotCliClient implements AiClient {
    private readonly bin: string;
    private readonly model: string | undefined;
    private readonly timeoutMs: number;
    private readonly workingDir: string | undefined;
    private readonly allowTools: boolean;
    private readonly logRaw: boolean;
    private readonly extraArgs: ReadonlyArray<string>;
    private readonly modelSelector: AiModelSelector;

    public constructor(
        @inject(SYMBOLS.ConfigProvider) configProvider: ConfigProvider,
        @inject(SYMBOLS.Logger) private readonly logger: Logger,
        @inject(SYMBOLS.ProcessRunner) private readonly processRunner: ProcessRunner,
    ) {
        this.bin = normalizeOptionalString(configProvider.getOptional('COPILOT_CLI_BIN')) ?? DEFAULT_BIN;
        this.model =
            normalizeOptionalString(configProvider.getOptional('COPILOT_CLI_MODEL'))
            ?? normalizeOptionalString(configProvider.getOptional('COPILOT_MODEL'));
        this.timeoutMs =
            configProvider.getOptionalNumber('COPILOT_CLI_TIMEOUT_MS') ?? DEFAULT_TIMEOUT_MS;
        this.workingDir =
            normalizeOptionalString(configProvider.getOptional('COPILOT_CLI_WORKING_DIR'))
            ?? normalizeOptionalString(configProvider.getOptional('WORKSPACE_PATH'));
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
        const args = this.buildArgs({
            model,
            allowTools: this.allowTools,
            extraArgs: this.extraArgs,
        });

        this.logger.debug('Invoking Copilot CLI', {
            bin: this.bin,
            model,
            role: options?.role,
            cwd: this.workingDir,
            timeoutMs: this.timeoutMs,
            promptTransport: 'stdin',
            promptLength: prompt.length,
            promptByteLength,
            args,
        });

        const result = await this.runProcess(args, prompt);
        return this.handleResult(result, promptByteLength);
    }

    private buildPrompt(systemPrompt: string, userPrompt: string): string {
        return [
            PROMPT_HEADER,
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
        args.push('--no-color');
        args.push('--silent');
        if (input.allowTools) {
            args.push('--allow-all-tools');
        }
        if (input.extraArgs.length > 0) {
            args.push(...input.extraArgs);
        }
        return args;
    }

    private parseExtraArgs(raw: string | undefined): ReadonlyArray<string> {
        if (raw === undefined || raw.trim() === '') return [];
        return raw
            .split(/\s+/)
            .map((token) => token.trim())
            .filter((token) => token.length > 0);
    }

    private async runProcess(args: ReadonlyArray<string>, prompt: string): Promise<ProcessRunResult> {
        try {
            return await this.processRunner.run(this.bin, args, {
                cwd: this.workingDir,
                env: {
                    NO_COLOR: '1',
                    TERM: 'dumb',
                    CI: '1',
                    FORCE_COLOR: '0',
                },
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

    private handleResult(result: ProcessRunResult, promptByteLength: number): string {
        if (this.logRaw) {
            this.logger.debug('Copilot CLI raw output', {
                stdoutLength: result.stdout.length,
                stderrLength: result.stderr.length,
                stdout: result.stdout,
                stderr: result.stderr,
            });
        }

        if (result.timedOut) {
            throw new IntegrationError('Copilot CLI timed out', {
                bin: this.bin,
                timeoutMs: this.timeoutMs,
                stderrTail: tailString(result.stderr, STDERR_TAIL_BYTES),
            });
        }

        const stderrLower = result.stderr.toLowerCase();
        if (AUTH_ERROR_MARKERS.some((marker) => stderrLower.includes(marker))) {
            throw new IntegrationError(
                'Copilot CLI is not authenticated. Run `copilot auth login` on the host.',
                {
                    bin: this.bin,
                    exitCode: result.exitCode,
                    stderrTail: tailString(result.stderr, STDERR_TAIL_BYTES),
                },
            );
        }

        if (RATE_LIMIT_MARKERS.some((marker) => stderrLower.includes(marker))) {
            throw new IntegrationError('Copilot CLI rate limited', {
                bin: this.bin,
                exitCode: result.exitCode,
                stderrTail: tailString(result.stderr, STDERR_TAIL_BYTES),
            });
        }


        if (COMMAND_LINE_TOO_LONG_MARKERS.some((marker) => stderrLower.includes(marker))) {
            throw new IntegrationError('Copilot CLI command line limit exceeded', {
                bin: this.bin,
                exitCode: result.exitCode,
                promptByteLength,
                stderrTail: tailString(result.stderr, STDERR_TAIL_BYTES),
            });
        }
        if (result.exitCode !== 0) {
            throw new IntegrationError(
                `Copilot CLI exited with code ${result.exitCode ?? 'null'}`,
                {
                    bin: this.bin,
                    exitCode: result.exitCode,
                    signal: result.signal,
                    stderrTail: tailString(result.stderr, STDERR_TAIL_BYTES),
                    promptByteLength,
                },
            );
        }

        const parsed = parseCopilotCliOutput(result.stdout);
        if (parsed.text.trim() === '') {
            throw new IntegrationError('Copilot CLI returned empty output', {
                bin: this.bin,
                stderrTail: tailString(result.stderr, STDERR_TAIL_BYTES),
                diagnostics: parsed.diagnostics,
            });
        }

        this.logger.debug('Copilot CLI response parsed', {
            textLength: parsed.text.length,
            diagnostics: parsed.diagnostics,
        });

        return parsed.text;
    }
}

