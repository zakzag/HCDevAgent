import { describe, expect, it } from 'vitest';
import { IntegrationError } from '@hcdevagent/shared';
import {
    parseHumanPlanResponse,
    parsePlanForAiResponse,
} from '../../modules/planning/planResponseParser.js';

describe('planResponseParser', () => {
    describe('parseHumanPlanResponse', () => {
        it('returns the reviewer-facing plan when the response is valid JSON', () => {
            const result = parseHumanPlanResponse(JSON.stringify({ plan: '## Summary\nPlan content' }));

            expect(result).toBe('## Summary\nPlan content');
        });

        it('strips markdown code fences before parsing', () => {
            const result = parseHumanPlanResponse('```json\n{"plan":"fenced plan"}\n```');

            expect(result).toBe('fenced plan');
        });

        it('throws IntegrationError when the response is not valid JSON', () => {
            expect(() => parseHumanPlanResponse('not json')).toThrow(IntegrationError);
        });

        it('throws IntegrationError when the response is missing the plan field', () => {
            expect(() => parseHumanPlanResponse(JSON.stringify({ planForAi: 'wrong field' }))).toThrow(IntegrationError);
        });
    });

    describe('parsePlanForAiResponse', () => {
        it('returns the machine-readable plan when the response is valid JSON', () => {
            const result = parsePlanForAiResponse(JSON.stringify({ planForAi: '## META\n- item: value' }));

            expect(result).toBe('## META\n- item: value');
        });

        it('strips markdown code fences before parsing', () => {
            const result = parsePlanForAiResponse('```json\n{"planForAi":"fenced plan for ai"}\n```');

            expect(result).toBe('fenced plan for ai');
        });

        it('throws IntegrationError when the response is not valid JSON', () => {
            expect(() => parsePlanForAiResponse('not json')).toThrow(IntegrationError);
        });

        it('throws IntegrationError when the response is missing the planForAi field', () => {
            expect(() => parsePlanForAiResponse(JSON.stringify({ plan: 'wrong field' }))).toThrow(IntegrationError);
        });
    });
});

