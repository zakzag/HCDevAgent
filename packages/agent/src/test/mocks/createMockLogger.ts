import { vi } from 'vitest';
import type { Logger } from '@hcdevagent/shared';

/**
 * Creates a logger test double with spy methods for every log level.
 */
export const createMockLogger = (): Logger => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    child: vi.fn().mockReturnThis(),
});
