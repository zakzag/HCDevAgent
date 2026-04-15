import { vi } from 'vitest';
import type { StorageAdapter } from '../../interfaces/StorageAdapter.js';
import type { ActiveIssue, ExecutionLogEntry, PhaseMetric } from '../../types/storage.types.js';

/**
 * Mock implementation of the StorageAdapter interface for testing.
 */
export class MockStorageAdapter implements StorageAdapter {
    public getActiveIssue = vi.fn<[], Promise<ActiveIssue | null>>();
    public setActiveIssue = vi.fn<[ActiveIssue], Promise<void>>();
    public clearActiveIssue = vi.fn<[string], Promise<void>>();
    public addExecutionLog = vi.fn<[ExecutionLogEntry], Promise<void>>();
    public getExecutionHistory = vi.fn<[string?], Promise<ReadonlyArray<ExecutionLogEntry>>>();
    public addMetric = vi.fn<[PhaseMetric], Promise<void>>();
    public updateMetric = vi.fn<[string, string, Partial<PhaseMetric>], Promise<void>>();
    public getMetrics = vi.fn<[string?], Promise<ReadonlyArray<PhaseMetric>>>();
    public getConfigOverride = vi.fn<[string], Promise<unknown | null>>();
    public setConfigOverride = vi.fn<[string, unknown, string?], Promise<void>>();
}
