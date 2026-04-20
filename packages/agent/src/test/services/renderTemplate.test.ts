import { describe, it, expect } from 'vitest';
import { ConfigError } from '@hcdevagent/shared';
import { renderTemplate } from '../../services/prompts/renderTemplate.js';

describe('renderTemplate', () => {
    describe('happy path', () => {
        it('replaces a single placeholder with the corresponding variable', () => {
            const result = renderTemplate('Hello, ${name}!', { name: 'World' });
            expect(result).toBe('Hello, World!');
        });

        it('replaces multiple distinct placeholders', () => {
            const result = renderTemplate('${greeting}, ${name}!', { greeting: 'Hi', name: 'Alice' });
            expect(result).toBe('Hi, Alice!');
        });

        it('replaces the same placeholder appearing multiple times', () => {
            const result = renderTemplate('${x} + ${x} = ?', { x: '1' });
            expect(result).toBe('1 + 1 = ?');
        });

        it('returns the original string when there are no placeholders', () => {
            const result = renderTemplate('No placeholders here.', {});
            expect(result).toBe('No placeholders here.');
        });

        it('replaces a placeholder with an empty string when the value is empty', () => {
            const result = renderTemplate('start${mid}end', { mid: '' });
            expect(result).toBe('startend');
        });

        it('ignores extra variables not referenced by the template', () => {
            const result = renderTemplate('Hello, ${name}!', { name: 'Bob', unused: 'ignored' });
            expect(result).toBe('Hello, Bob!');
        });
    });

    describe('error handling', () => {
        it('throws ConfigError when a placeholder has no matching variable', () => {
            expect(() => renderTemplate('Hello, ${name}!', {})).toThrow(ConfigError);
        });

        it('includes the missing key in the error message', () => {
            expect(() => renderTemplate('${missing}', {})).toThrow('missing');
        });

        it('throws for the first unresolved placeholder encountered', () => {
            expect(() => renderTemplate('${a} ${b}', { b: 'ok' })).toThrow(ConfigError);
        });
    });
});

