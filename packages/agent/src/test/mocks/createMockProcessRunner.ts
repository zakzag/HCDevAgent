import { vi } from 'vitest';
import type { Mock } from 'vitest';
import type { ProcessRunner, ProcessRunResult } from '@hcdevagent/shared';

/** Baseline success result used when a test does not specify one. */
const DEFAULT_RESULT: ProcessRunResult = {
    stdout: '',
    stderr: '',
    exitCode: 0,
    signal: null,
    timedOut: false,
};

/** A {@link ProcessRunner} test double that records calls and lets the test script results. */
export interface MockProcessRunner extends ProcessRunner {
    readonly run: Mock;
    queueResult(partial: Partial<ProcessRunResult>): MockProcessRunner;
    queueError(error: unknown): MockProcessRunner;
    setDefaultResult(partial: Partial<ProcessRunResult>): MockProcessRunner;
}

/**
 * Creates a {@link ProcessRunner} mock backed by `vi.fn`. Results can be
 * queued FIFO via `queueResult` / `queueError`; if no queued entry remains,
 * the configured default result is returned.
 */
export const createMockProcessRunner = (
    initialDefault: Partial<ProcessRunResult> = {},
): MockProcessRunner => {
    let defaultResult: ProcessRunResult = { ...DEFAULT_RESULT, ...initialDefault };
    const queue: Array<{ type: 'result'; value: ProcessRunResult } | { type: 'error'; value: unknown }> = [];

    const run = vi.fn(async () => {
        const next = queue.shift();
        if (next === undefined) return defaultResult;
        if (next.type === 'error') throw next.value;
        return next.value;
    });

    const mock: MockProcessRunner = {
        run,
        queueResult(partial) {
            queue.push({ type: 'result', value: { ...DEFAULT_RESULT, ...partial } });
            return mock;
        },
        queueError(error) {
            queue.push({ type: 'error', value: error });
            return mock;
        },
        setDefaultResult(partial) {
            defaultResult = { ...DEFAULT_RESULT, ...partial };
            return mock;
        },
    };

    return mock;
};


