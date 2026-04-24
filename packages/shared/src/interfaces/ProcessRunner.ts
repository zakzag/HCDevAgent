/**
 * Result of running an external process to completion.
 * `timedOut` is true when the runner killed the process after `timeoutMs`.
 */
export interface ProcessRunResult {
    readonly stdout: string;
    readonly stderr: string;
    readonly exitCode: number | null;
    readonly signal: string | null;
    readonly timedOut: boolean;
}

/** Options accepted by {@link ProcessRunner.run}. */
export interface ProcessRunOptions {
    readonly cwd?: string;
    readonly env?: Readonly<Record<string, string | undefined>>;
    /** Raw UTF-8 string piped into stdin. stdin is closed immediately after writing. */
    readonly stdin?: string;
    /** Hard kill timeout in milliseconds. Defaults to runner-specific value. */
    readonly timeoutMs?: number;
}

/**
 * Abstraction over spawning an external process.
 * Declared in `shared` so any package (and tests) can substitute an implementation.
 */
export interface ProcessRunner {
    run(
        command: string,
        args: ReadonlyArray<string>,
        options?: ProcessRunOptions,
    ): Promise<ProcessRunResult>;
}


