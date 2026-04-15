import { vi } from 'vitest';
import type { Logger } from '../../interfaces/Logger.js';

/**
 * Mock implementation of the Logger interface for testing.
 */
export class MockLogger implements Logger {
  public debug = vi.fn();
  public info = vi.fn();
  public warn = vi.fn();
  public error = vi.fn();
  public child = vi.fn().mockReturnThis();
}

