import { spawn } from 'node:child_process';
import { injectable } from 'inversify';
import type { ProcessRunner, ProcessRunOptions, ProcessRunResult } from '@hcdevagent/shared';
import {
    DEFAULT_PROCESS_RUNNER_TIMEOUT_MS,
    PROCESS_RUNNER_SIGTERM_GRACE_MS,
} from './processRunner.constants.js';
import { resolveExecutableCommand } from './resolveExecutableCommand.js';

const normalizeWorkingDirectory = (cwd: string | undefined): string | undefined => {
    if (cwd === undefined) return undefined;

    const normalized = cwd.trim();
    return normalized === '' ? undefined : normalized;
};

/**
 * Concrete {@link ProcessRunner} using Node's `child_process.spawn`.
 * - Writes `stdin` once and closes the stream so the child does not wait for more input.
 * - Buffers stdout/stderr as UTF-8.
 * - Enforces a hard timeout: sends SIGTERM, then SIGKILL after a short grace period.
 * - Never throws on non-zero exit; always resolves with a structured result.
 */
@injectable()
export class NodeProcessRunner implements ProcessRunner {
    public run(
        command: string,
        args: ReadonlyArray<string>,
        options: ProcessRunOptions = {},
    ): Promise<ProcessRunResult> {
        const timeoutMs = options.timeoutMs ?? DEFAULT_PROCESS_RUNNER_TIMEOUT_MS;
        const env = this.buildEnv(options.env);
        const executableCommand = resolveExecutableCommand({
            command,
            env,
        });
        const cwd = normalizeWorkingDirectory(options.cwd);

        return new Promise<ProcessRunResult>((resolve, reject) => {
            let child;
            try {
                child = spawn(executableCommand.command, [...args], {
                    cwd,
                    env,
                    stdio: ['pipe', 'pipe', 'pipe'],
                    shell: executableCommand.shell,
                    windowsHide: true,
                });
            } catch (error) {
                reject(error);
                return;
            }

            const stdoutChunks: Array<Buffer> = [];
            const stderrChunks: Array<Buffer> = [];
            let timedOut = false;
            let settled = false;

            const killTimer = setTimeout(() => {
                timedOut = true;
                child.kill('SIGTERM');
                setTimeout(() => {
                    if (!settled) child.kill('SIGKILL');
                }, PROCESS_RUNNER_SIGTERM_GRACE_MS).unref();
            }, timeoutMs);
            killTimer.unref();

            child.stdout?.on('data', (chunk: Buffer) => stdoutChunks.push(chunk));
            child.stderr?.on('data', (chunk: Buffer) => stderrChunks.push(chunk));

            child.on('error', (err) => {
                if (settled) return;
                settled = true;
                clearTimeout(killTimer);
                reject(err);
            });

            child.on('close', (exitCode, signal) => {
                if (settled) return;
                settled = true;
                clearTimeout(killTimer);
                resolve({
                    stdout: Buffer.concat(stdoutChunks).toString('utf8'),
                    stderr: Buffer.concat(stderrChunks).toString('utf8'),
                    exitCode,
                    signal,
                    timedOut,
                });
            });

            if (options.stdin !== undefined && child.stdin) {
                child.stdin.on('error', () => {
                    /* ignore EPIPE when child exits before consuming stdin */
                });
                child.stdin.end(options.stdin, 'utf8');
            } else {
                child.stdin?.end();
            }
        });
    }

    private buildEnv(
        overrides?: Readonly<Record<string, string | undefined>>,
    ): NodeJS.ProcessEnv {
        const merged: NodeJS.ProcessEnv = { ...process.env };
        if (overrides) {
            for (const [key, value] of Object.entries(overrides)) {
                if (value === undefined) {
                    delete merged[key];
                } else {
                    merged[key] = value;
                }
            }
        }
        return merged;
    }
}

