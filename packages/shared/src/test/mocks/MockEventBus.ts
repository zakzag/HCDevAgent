import { vi } from 'vitest';
import type { EventBus } from '../../interfaces/EventBus.js';

/**
 * Mock implementation of the EventBus interface for testing.
 */
export class MockEventBus implements EventBus {
  public publish = vi.fn<[string, unknown], void>();
  public subscribe = vi.fn<[string, (payload: unknown) => void], void>();
  public unsubscribe = vi.fn<[string, (payload: unknown) => void], void>();
}

