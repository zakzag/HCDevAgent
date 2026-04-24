import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { afterEach, describe, expect, it } from 'vitest';
import { resolveExecutableCommand } from '../../../../services/ai/processRunner/resolveExecutableCommand.js';

const temporaryDirectories: Array<string> = [];

const createTemporaryDirectory = (): string => {
    const directory = mkdtempSync(join(tmpdir(), 'hcdevagent-process-runner-'));
    temporaryDirectories.push(directory);
    return directory;
};

afterEach(() => {
    while (temporaryDirectories.length > 0) {
        const directory = temporaryDirectories.pop();
        if (directory !== undefined) {
            rmSync(directory, { force: true, recursive: true });
        }
    }
});

describe('resolveExecutableCommand', () => {
    it('resolves a bare command to a Windows .cmd shim from PATH and marks it for shell execution', () => {
        const commandDirectory = createTemporaryDirectory();
        const commandPath = join(commandDirectory, 'copilot.cmd');
        writeFileSync(commandPath, '@echo off\r\n');

        const resolvedCommand = resolveExecutableCommand({
            command: 'copilot',
            env: {
                PATH: commandDirectory,
                PATHEXT: '.COM;.EXE;.BAT;.CMD',
            },
            platform: 'win32',
        });

        expect(resolvedCommand).toEqual({
            command: commandPath,
            shell: true,
        });
    });

    it('falls back to %APPDATA%\\npm when PATH does not include the global npm bin directory', () => {
        const appDataDirectory = createTemporaryDirectory();
        const npmBinDirectory = join(appDataDirectory, 'npm');
        mkdirSync(npmBinDirectory, { recursive: true });
        const commandPath = join(npmBinDirectory, 'copilot.cmd');
        writeFileSync(commandPath, '@echo off\r\n');

        const resolvedCommand = resolveExecutableCommand({
            command: 'copilot',
            env: {
                APPDATA: appDataDirectory,
                PATH: join(appDataDirectory, 'elsewhere'),
                PATHEXT: '.COM;.EXE;.BAT;.CMD',
            },
            platform: 'win32',
        });

        expect(resolvedCommand).toEqual({
            command: commandPath,
            shell: true,
        });
    });

    it('returns the original command unchanged for non-Windows platforms', () => {
        const resolvedCommand = resolveExecutableCommand({
            command: 'copilot',
            env: {
                PATH: '/usr/local/bin',
            },
            platform: 'linux',
        });

        expect(resolvedCommand).toEqual({
            command: 'copilot',
            shell: false,
        });
    });

    it('keeps explicit native executable paths unchanged and shell-free', () => {
        const explicitPath = 'C:/tools/copilot.exe';

        const resolvedCommand = resolveExecutableCommand({
            command: explicitPath,
            env: {
                PATH: 'C:/tools',
                PATHEXT: '.COM;.EXE;.BAT;.CMD',
            },
            platform: 'win32',
        });

        expect(resolvedCommand).toEqual({
            command: explicitPath,
            shell: false,
        });
    });

    it('marks explicit .cmd paths for shell execution', () => {
        const explicitPath = 'C:/Users/test/AppData/Roaming/npm/copilot.cmd';

        const resolvedCommand = resolveExecutableCommand({
            command: explicitPath,
            env: {
                PATH: 'C:/tools',
                PATHEXT: '.COM;.EXE;.BAT;.CMD',
            },
            platform: 'win32',
        });

        expect(resolvedCommand).toEqual({
            command: explicitPath,
            shell: true,
        });
    });
});

