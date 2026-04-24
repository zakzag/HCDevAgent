import { describe, expect, it } from 'vitest';
import { buildCandidateFileQueue, isTextLikeFile } from '../../services/investigationContext/investigationContextFiles.js';
import { DEFAULT_PROJECT_SETTINGS } from '../../services/investigationContext/index.js';

describe('investigationContextFiles', () => {
    it('accepts configured extensions and explicit always-include files', () => {
        const settings = {
            ...DEFAULT_PROJECT_SETTINGS.investigator.contextCollection,
            includeExtensions: ['.ts'],
            alwaysIncludeFiles: ['docs/architecture.txt'],
        };

        expect(isTextLikeFile('src/auth.ts', settings)).toBe(true);
        expect(isTextLikeFile('docs/architecture.txt', settings)).toBe(true);
        expect(isTextLikeFile('assets/logo.png', settings)).toBe(false);
    });

    it('builds a deduplicated queue with always-include files first', () => {
        const settings = {
            ...DEFAULT_PROJECT_SETTINGS.investigator.contextCollection,
            alwaysIncludeFiles: ['README.md', 'docs\\architecture.md'],
            maxCandidateFiles: 3,
        };

        const result = buildCandidateFileQueue(
            ['src/auth.ts', 'README.md', 'docs/architecture.md', 'src/auth.ts'],
            settings,
        );

        expect(result).toEqual(['README.md', 'docs/architecture.md', 'src/auth.ts']);
    });
});


