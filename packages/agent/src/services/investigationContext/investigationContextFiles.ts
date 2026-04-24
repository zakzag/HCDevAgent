import type { Dirent } from 'node:fs';
import { extname } from 'node:path';
import type { InvestigatorContextCollectionSettings } from './projectSettings.js';

const normalizeRelativePath = (value: string): string => value.replace(/\\/g, '/');

/** Returns true when a file should be considered for investigation-context collection. */
export const isTextLikeFile = (
    filePath: string,
    settings: InvestigatorContextCollectionSettings,
): boolean => settings.includeExtensions.includes(extname(filePath).toLowerCase())
    || settings.alwaysIncludeFiles.includes(normalizeRelativePath(filePath));

/** Produces a deterministic directory-entry order with folders before files. */
export const sortDirectoryEntries = (entries: ReadonlyArray<Dirent>): Array<Dirent> => [...entries].sort((left, right) => {
    if (left.isDirectory() !== right.isDirectory()) {
        return left.isDirectory() ? -1 : 1;
    }

    return left.name.localeCompare(right.name);
});

/**
 * Prioritizes explicit always-include files ahead of discovered files and removes duplicates.
 * The returned list is bounded by the configured maximum candidate count.
 */
export const buildCandidateFileQueue = (
    discoveredFiles: ReadonlyArray<string>,
    settings: InvestigatorContextCollectionSettings,
): Array<string> => {
    const seen = new Set<string>();
    const queue = [
        ...settings.alwaysIncludeFiles,
        ...discoveredFiles,
    ]
        .map(normalizeRelativePath)
        .filter((filePath) => {
            if (seen.has(filePath)) {
                return false;
            }

            seen.add(filePath);
            return true;
        });

    return queue.slice(0, settings.maxCandidateFiles);
};

