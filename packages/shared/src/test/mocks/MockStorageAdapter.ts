import { vi } from 'vitest';
import type { StorageAdapter } from '../../interfaces/StorageAdapter.js';
import type { ActiveIssue, ExecutionLogEntry, PhaseMetric } from '../../types/storage.types.js';

/**
 * Mock implementation of the StorageAdapter interface for testing.
 */
export class MockStorageAdapter implements StorageAdapter {
  public upsertActiveIssue = vi.fn<[ActiveIssue], Promise<void>>();
  public getActiveIssue = vi.fn<[string], Promise<ActiveIssue | null>>();
  public removeActiveIssue = vi.fn<[string], Promise<void>>();
  public getAllActiveIssues = vi.fn<[], Promise<ReadonlyArray<ActiveIssue>>>();
  public appendLog = vi.fn<[ExecutionLogEntry], Promise<void>>();
  public getLogs = vi.fn<[string], Promise<ReadonlyArray<ExecutionLogEntry>>>();
  public recordMetric = vi.fn<[PhaseMetric], Promise<void>>();
}

