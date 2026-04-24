import { EventEmitter } from 'node:events';
import { PassThrough } from 'node:stream';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { resolveExecutableCommandMock, spawnMock } = vi.hoisted(() => ({
    resolveExecutableCommandMock: vi.fn(),
    spawnMock: vi.fn(),
}));

vi.mock('node:child_process', () => ({
    spawn: spawnMock,
}));

vi.mock('../../../../services/ai/processRunner/resolveExecutableCommand.js', () => ({
    resolveExecutableCommand: resolveExecutableCommandMock,
}));

import { NodeProcessRunner } from '../../../../services/ai/processRunner/NodeProcessRunner.js';

class FakeChildProcess extends EventEmitter {
    public readonly stdout = new PassThrough();
    public readonly stderr = new PassThrough();
    public readonly stdin = new PassThrough();
    public readonly kill = vi.fn();
}

const queueSuccessfulSpawn = (): void => {
    spawnMock.mockImplementation(() => {
        const child = new FakeChildProcess();
        setImmediate(() => child.emit('close', 0, null));
        return child;
    });
};

describe('NodeProcessRunner', () => {
    beforeEach(() => {
        spawnMock.mockReset();
        resolveExecutableCommandMock.mockReset();
        queueSuccessfulSpawn();
    });

    it('launches Windows command shims with shell enabled when requested by the resolver', async () => {
        resolveExecutableCommandMock.mockReturnValue({
            command: 'C:/Users/test/AppData/Roaming/npm/copilot.cmd',
            shell: true,
        });
        const runner = new NodeProcessRunner();

        await runner.run('copilot', ['--version'], {
            cwd: 'C:/workspace',
            env: { NO_COLOR: '1' },
        });

        expect(spawnMock).toHaveBeenCalledWith(
            'C:/Users/test/AppData/Roaming/npm/copilot.cmd',
            ['--version'],
            expect.objectContaining({
                cwd: 'C:/workspace',
                shell: true,
                windowsHide: true,
            }),
        );
    });

    it('normalizes blank working directories before spawning', async () => {
        resolveExecutableCommandMock.mockReturnValue({
            command: 'copilot',
            shell: false,
        });
        const runner = new NodeProcessRunner();

        await runner.run('copilot', ['--version'], {
            cwd: '   ',
        });

        expect(spawnMock).toHaveBeenCalledWith(
            'copilot',
            ['--version'],
            expect.objectContaining({
                cwd: undefined,
                shell: false,
            }),
        );
    });

    it('writes stdin content to the spawned process and closes it', async () => {
        resolveExecutableCommandMock.mockReturnValue({
            command: 'copilot',
            shell: false,
        });
        let capturedChild: FakeChildProcess | undefined;
        const stdinChunks: Array<string> = [];
        spawnMock.mockImplementation(() => {
            capturedChild = new FakeChildProcess();
            capturedChild.stdin.on('data', (chunk: Buffer | string) => stdinChunks.push(String(chunk)));
            setImmediate(() => capturedChild?.emit('close', 0, null));
            return capturedChild;
        });
        const runner = new NodeProcessRunner();

        await runner.run('copilot', ['--silent'], {
            stdin: 'prompt via stdin',
        });

        expect(stdinChunks.join('')).toContain('prompt via stdin');
        expect(capturedChild?.stdin.writableEnded).toBe(true);
    });
});

