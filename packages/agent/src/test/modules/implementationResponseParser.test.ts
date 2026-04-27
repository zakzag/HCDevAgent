import { describe, expect, it } from 'vitest';
import { IntegrationError } from '@hcdevagent/shared';
import { parseImplementationResponse } from '../../modules/implementation/implementationResponseParser.js';

describe('implementationResponseParser', () => {
    it('returns CodeChanges when the response is valid JSON', () => {
        const result = parseImplementationResponse(JSON.stringify({
            filePath: 'src/auth.ts',
            diff: '--- a/src/auth.ts',
            language: 'typescript',
        }), 'implementPlan');

        expect(result).toEqual({
            filePath: 'src/auth.ts',
            diff: '--- a/src/auth.ts',
            language: 'typescript',
        });
    });

    it('strips markdown code fences before parsing', () => {
        const result = parseImplementationResponse('```json\n{"filePath":"src/auth.ts","diff":"diff","language":"typescript"}\n```', 'implementPlan');

        expect(result.filePath).toBe('src/auth.ts');
    });

    it('throws IntegrationError when the response is not valid JSON', () => {
        expect(() => parseImplementationResponse('not json', 'implementPlan')).toThrow(IntegrationError);
    });

    it('throws IntegrationError when the response is missing required fields', () => {
        expect(() => parseImplementationResponse(JSON.stringify({ filePath: 'src/auth.ts' }), 'implementPlan')).toThrow(IntegrationError);
    });
});

