import { vi } from 'vitest';
import type { PromptRegistry, PromptKey, PromptVariables } from '@hcdevagent/shared';

/**
 * Mock implementation of PromptRegistry for use in unit tests.
 * Returns a string containing the key name followed by all variable values,
 * so `toContain` assertions on the resolved prompt still work in tests.
 * Use `vi.mocked(mockRegistry.getPrompt).mockReturnValue(...)` to override.
 */
export const createMockPromptRegistry = (): PromptRegistry => ({
    getPrompt: vi.fn(<K extends PromptKey>(key: K, variables: PromptVariables[K]): string => {
        const varValues = Object.values(variables as Record<string, string>).join('\n');
        return `${key}-prompt\n${varValues}`;
    }),
});


