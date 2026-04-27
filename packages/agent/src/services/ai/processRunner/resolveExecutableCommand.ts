import { existsSync } from 'node:fs';
import { delimiter, extname, join, normalize } from 'node:path';
import {
    DEFAULT_WINDOWS_EXECUTABLE_EXTENSIONS,
    WINDOWS_GLOBAL_NPM_BIN_FOLDER,
} from './resolveExecutableCommand.constants.js';

/** Describes how a resolved command must be launched. */
export interface ResolvedExecutableCommand {
    readonly command: string;
    readonly shell: boolean;
}

interface ResolveExecutableCommandOptions {
    readonly command: string;
    readonly env?: NodeJS.ProcessEnv;
    readonly platform?: NodeJS.Platform;
}

const hasPathSeparator = (command: string): boolean => command.includes('\\') || command.includes('/');

const stripWrappingQuotes = (value: string): string => value.replace(/^"|"$/g, '');

const getEnvironmentValue = (
    env: NodeJS.ProcessEnv,
    key: string,
): string | undefined => {
    const directValue = env[key];
    if (directValue !== undefined) return directValue;

    const matchingKey = Object.keys(env).find((candidate) => candidate.toLowerCase() === key.toLowerCase());
    return matchingKey === undefined ? undefined : env[matchingKey];
};

const getWindowsExecutableExtensions = (pathExtensions: string | undefined): ReadonlyArray<string> => {
    if (pathExtensions === undefined || pathExtensions.trim() === '') {
        return DEFAULT_WINDOWS_EXECUTABLE_EXTENSIONS;
    }

    const parsedExtensions = pathExtensions
        .split(';')
        .map((entry) => entry.trim().toLowerCase())
        .filter((entry) => entry.startsWith('.'));

    return parsedExtensions.length > 0 ? parsedExtensions : DEFAULT_WINDOWS_EXECUTABLE_EXTENSIONS;
};

const toPathEntries = (pathValue: string | undefined): Array<string> => {
    if (pathValue === undefined || pathValue.trim() === '') return [];

    return pathValue
        .split(delimiter)
        .map((entry) => stripWrappingQuotes(entry.trim()))
        .filter((entry) => entry.length > 0);
};

const appendIfMissing = (entries: Array<string>, candidate: string | undefined): void => {
    if (candidate === undefined || candidate.trim() === '') return;

    const normalizedCandidate = normalize(candidate).toLowerCase();
    const existsAlready = entries.some((entry) => normalize(entry).toLowerCase() === normalizedCandidate);
    if (!existsAlready) {
        entries.push(candidate);
    }
};

const requiresShell = (command: string): boolean => {
    const extension = extname(command).toLowerCase();
    return extension === '.cmd' || extension === '.bat';
};

const getWindowsCommandSearchDirectories = (env: NodeJS.ProcessEnv): Array<string> => {
    const entries = toPathEntries(getEnvironmentValue(env, 'PATH'));
    const appDataDirectory = getEnvironmentValue(env, 'APPDATA');
    if (appDataDirectory !== undefined && appDataDirectory.trim() !== '') {
        appendIfMissing(entries, join(appDataDirectory, WINDOWS_GLOBAL_NPM_BIN_FOLDER));
    }
    return entries;
};

/**
 * Resolves a command to the best executable path for the current platform and
 * reports whether it must be launched through a shell.
 */
export const resolveExecutableCommand = (
    options: ResolveExecutableCommandOptions,
): ResolvedExecutableCommand => {
    const env = options.env ?? process.env;
    const platform = options.platform ?? process.platform;

    if (platform !== 'win32') {
        return {
            command: options.command,
            shell: false,
        };
    }

    if (hasPathSeparator(options.command) || extname(options.command) !== '') {
        return {
            command: options.command,
            shell: requiresShell(options.command),
        };
    }

    const executableExtensions = getWindowsExecutableExtensions(getEnvironmentValue(env, 'PATHEXT'));
    const searchDirectories = getWindowsCommandSearchDirectories(env);

    for (const directory of searchDirectories) {
        for (const extension of executableExtensions) {
            const candidate = join(directory, `${options.command}${extension}`);
            if (existsSync(candidate)) {
                return {
                    command: candidate,
                    shell: requiresShell(candidate),
                };
            }
        }
    }

    return {
        command: options.command,
        shell: false,
    };
};

