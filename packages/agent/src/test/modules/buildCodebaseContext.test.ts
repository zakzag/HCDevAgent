import { describe, expect, it } from 'vitest';
import type { CodebaseContext } from '@hcdevagent/shared';
import { buildCodebaseContext } from '../../modules/implementation/buildCodebaseContext.js';

const makeCodebase = (overrides: Partial<CodebaseContext> = {}): CodebaseContext => ({
    structure: 'src/\n  index.ts',
    files: [{ path: 'src/index.ts', content: 'export const hello = () => "hello";' }],
    ...overrides,
});

describe('buildCodebaseContext', () => {
    it('includes the repository structure header', () => {
        const result = buildCodebaseContext(makeCodebase());

        expect(result).toContain('Codebase structure:');
        expect(result).toContain('src/');
    });

    it('serializes each file with its path and fenced content block', () => {
        const result = buildCodebaseContext(makeCodebase({
            files: [
                { path: 'src/index.ts', content: 'export const index = true;' },
                { path: 'src/auth.ts', content: 'export const auth = true;' },
            ],
        }));

        expect(result).toContain('File: src/index.ts');
        expect(result).toContain('export const index = true;');
        expect(result).toContain('File: src/auth.ts');
        expect(result).toContain('export const auth = true;');
    });

    it('returns only the structure section when no file contents are present', () => {
        const result = buildCodebaseContext(makeCodebase({ files: [] }));

        expect(result).toContain('Codebase structure:');
        expect(result).not.toContain('File:');
    });
});

