import { describe, it, expect } from 'vitest';
import { AiModelSelector } from '../../../services/ai/AiModelSelector.js';
import { createMockConfigProvider } from '../../mocks/createMockConfigProvider.js';

describe('AiModelSelector', () => {
    it('prefers an explicit per-request model override', () => {
        const selector = new AiModelSelector(createMockConfigProvider({ AI_MODEL_PLANNING: 'gpt-5-mini' }));

        const resolved = selector.resolveModel('gpt-4o', {
            role: 'planning',
            model: 'gpt-4.1-mini',
        });

        expect(resolved).toBe('gpt-4.1-mini');
    });

    it('uses the role-specific env model when configured', () => {
        const selector = new AiModelSelector(createMockConfigProvider({ AI_MODEL_INVESTIGATION: 'gpt-5-mini' }));

        const resolved = selector.resolveModel('gpt-4o', { role: 'investigation' });

        expect(resolved).toBe('gpt-5-mini');
    });

    it('falls back to the provider default model when the role is not configured', () => {
        const selector = new AiModelSelector(createMockConfigProvider());

        const resolved = selector.resolveModel('gpt-4o', { role: 'commentSummary' });

        expect(resolved).toBe('gpt-4o');
    });

    it('trims whitespace-only role model values and still falls back', () => {
        const selector = new AiModelSelector(createMockConfigProvider({ AI_MODEL_PLANNING: '   ' }));

        const resolved = selector.resolveModel('gpt-4o', { role: 'planning' });

        expect(resolved).toBe('gpt-4o');
    });
});

