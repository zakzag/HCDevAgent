import { injectable, inject } from 'inversify';
import type {
    AiClient,
    ConfigProvider,
    Logger,
    ProcessRunner,
    ProcessRunResult,
} from '@hcdevagent/shared';
import { SYMBOLS, IntegrationError } from '@hcdevagent/shared';
import { parseCopilotCliOutput } from './CopilotCliOutputParser.js';

const DEFAULT_BIN = 'copilot';
const DEFAULT_TIMEOUT_MS = 180_000;
const STDERR_TAIL_BYTES = 2_048;

const AUTH_ERROR_MARKERS = [
    'not logged in',
    'not authenticated',
    'authentication required',
    'please run `copilot auth login`',
    'please run copilot auth login',
    'unauthorized',
];

const RATE_LIMIT_MARKERS = [
    'rate limit',
    'too many requests',
    'quota exceeded',
];

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
    readonly prompt: string;
}

const truthy = (value: string | undefined): boolean => {
    if (value === undefined) return false;
    const normalized = value.trim().toLowerCase();
    return normalized === 'true' || normalized === '1' || normalized === 'yes';
};

const tailString = (value: string, limit: number): string =>
    value.length <= limit ? value : value.slice(value.length - limit);

/**
 * AI client backed by the standalone `copilot` CLI.
 *
 * Auth is whatever session `copilot auth login` already established on the
 * host (OS credential store / config dir) — the CLI's own token, not a PAT.
 *
 * The CLI is invoked headlessly per call:
 *   - prompt is passed as `-p` with the combined system + user content
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

    public constructor(
        @inject(SYMBOLS.ConfigProvider) configProvider: ConfigProvider,
        @inject(SYMBOLS.Logger) private readonly logger: Logger,
        @inject(SYMBOLS.ProcessRunner) private readonly processRunner: ProcessRunner,
    ) {
        this.bin = configProvider.getOptional('COPILOT_CLI_BIN') ?? DEFAULT_BIN;
        this.model =
            configProvider.getOptional('COPILOT_CLI_MODEL')
            ?? configProvider.getOptional('COPILOT_MODEL');
        this.timeoutMs =
            configProvider.getOptionalNumber('COPILOT_CLI_TIMEOUT_MS') ?? DEFAULT_TIMEOUT_MS;
        this.workingDir =
            configProvider.getOptional('COPILOT_CLI_WORKING_DIR')
            ?? configProvider.getOptional('WORKSPACE_PATH');
        this.allowTools = truthy(configProvider.getOptional('COPILOT_CLI_ALLOW_TOOLS'));
        this.logRaw = truthy(configProvider.getOptional('COPILOT_CLI_LOG_RAW'));
        this.extraArgs = this.parseExtraArgs(configProvider.getOptional('COPILOT_CLI_EXTRA_ARGS'));
    }

    public async complete(systemPrompt: string, userPrompt: string): Promise<string> {
        const prompt = this.buildPrompt(systemPrompt, userPrompt);
        const args = this.buildArgs({
            model: this.model,
            allowTools: this.allowTools,
            extraArgs: this.extraArgs,
            prompt,
        });

        this.logger.debug('Invoking Copilot CLI', {
            bin: this.bin,
            model: this.model,
            cwd: this.workingDir,
            timeoutMs: this.timeoutMs,
            argsSansPrompt: this.redactPromptFromArgs(args),
        });

        const result = await this.runProcess(args);
        return this.handleResult(result);
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
        if (input.allowTools) {
            args.push('--allow-all-tools');
        }
        if (input.extraArgs.length > 0) {
            args.push(...input.extraArgs);
        }
        args.push('-p', input.prompt);
        return args;
    }

    private parseExtraArgs(raw: string | undefined): ReadonlyArray<string> {
        if (raw === undefined || raw.trim() === '') return [];
        return raw
            .split(/\s+/)
            .map((token) => token.trim())
            .filter((token) => token.length > 0);
    }

    private redactPromptFromArgs(args: ReadonlyArray<string>): ReadonlyArray<string> {
        const out: Array<string> = [];
        for (let i = 0; i < args.length; i += 1) {
            const current = args[i] ?? '';
            if (current === '-p' || current === '--prompt') {
                out.push(current, '<redacted>');
                i += 1;
                continue;
            }
            out.push(current);
        }
        return out;
    }

    private async runProcess(args: ReadonlyArray<string>): Promise<ProcessRunResult> {
        try {
            return await this.processRunner.run(this.bin, args, {
                cwd: this.workingDir,
                env: {
                    NO_COLOR: '1',
                    TERM: 'dumb',
                    CI: '1',
                    FORCE_COLOR: '0',
                },
                timeoutMs: this.timeoutMs,
            });
        } catch (error) {
            const err = error as NodeJS.ErrnoException;
            if (err.code === 'ENOENT') {
                throw new IntegrationError(
                    `Copilot CLI binary not found: "${this.bin}". Install the CLI and run \`copilot auth login\`.`,
                    { bin: this.bin, code: err.code },
                );
            }
            throw new IntegrationError('Failed to spawn Copilot CLI', {
                bin: this.bin,
                originalError: String(error),
            });
        }
    }

    private handleResult(result: ProcessRunResult): string {
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

        if (result.exitCode !== 0) {
            throw new IntegrationError(
                `Copilot CLI exited with code ${result.exitCode ?? 'null'}`,
                {
                    bin: this.bin,
                    exitCode: result.exitCode,
                    signal: result.signal,
                    stderrTail: tailString(result.stderr, STDERR_TAIL_BYTES),
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

