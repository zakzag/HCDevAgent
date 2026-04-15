import { vi } from 'vitest';
import type { EventBus } from '../../interfaces/EventBus.js';

/**
 * Mock implementation of the EventBus interface for testing.
 */
export class MockEventBus implements EventBus {
    public emit = vi.fn<[string, unknown], void>();
    public on = vi.fn<[string, (payload: unknown) => void], void>();
    public off = vi.fn<[string, (payload: unknown) => void], void>();
}
