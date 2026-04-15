import { vi } from 'vitest';
import type { IssueReader } from '../../interfaces/IssueReader.js';
import type { Issue } from '../../types/domain.types.js';

/**
 * Mock implementation of the IssueReader interface for testing.
 */
export class MockIssueReader implements IssueReader {
  public getIssue = vi.fn<[string], Promise<Issue>>();
  public getIssues = vi.fn<[string], Promise<ReadonlyArray<Issue>>>();
}

