import { vi } from 'vitest';
import type { ConfigProvider } from '@hcdevagent/shared';

/**
 * Creates a configurable ConfigProvider test double backed by an in-memory map.
 */
export const createMockConfigProvider = (
    overrides: Partial<Record<string, string>> = {},
): ConfigProvider => {
    const values: Record<string, string | undefined> = {
        VERSION_CONTROL_PROVIDER: 'github',
        WORKSPACE_PATH: 'E:/projects/AI/AIDEV-TEST',
        GIT_REPO_URL: 'https://github.com/test-owner/test-repo.git',
        GIT_USER_NAME: 'HCDevAgent',
        GIT_USER_EMAIL: 'hcdevagent@example.com',
        GITHUB_TOKEN: 'test-github-token',
        ...overrides,
    };

    return {
        getRequired: vi.fn().mockImplementation((key: string) => {
            const value = values[key];
            if (value === undefined) {
                throw new Error(`Missing required key: ${key}`);
            }
            return value;
        }),
        getOptional: vi.fn().mockImplementation((key: string) => values[key]),
        getRequiredNumber: vi.fn().mockImplementation((key: string) => {
            const value = values[key];
            if (value === undefined) {
                throw new Error(`Missing required key: ${key}`);
            }
            return Number(value);
        }),
        getOptionalNumber: vi.fn().mockImplementation((key: string) => {
            const value = values[key];
            return value === undefined ? undefined : Number(value);
        }),
    };
};

