import { vi } from 'vitest';
import type { ConfigProvider } from '../../interfaces/ConfigProvider.js';

/**
 * Mock implementation of the ConfigProvider interface for testing.
 */
export class MockConfigProvider implements ConfigProvider {
  public getRequired = vi.fn().mockReturnValue('mock-value');
  public getOptional = vi.fn().mockReturnValue(undefined);
  public getRequiredNumber = vi.fn().mockReturnValue(0);
  public getOptionalNumber = vi.fn().mockReturnValue(undefined);
}

